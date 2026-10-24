import React, { useState, useMemo } from 'react';
import type { PageId, ContentVersion, Finding, BrandProfile, ContentEvaluationResult, SubmittedContent } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { computeWordDiff } from '../utils/diffUtils';
import { contentService } from '../services/contentService';
import { governanceEngine } from '../services/governanceEngine';
import { aiContextualService, type AiCorrectionResult } from '../services/aiContextualService';
import { AiSettingsModal } from '../components/brand/AiSettingsModal';
import {
  Check,
  RefreshCw,
  GitCompare,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Eye,
  Edit3,
  Cpu,
  Loader2,
  Settings
} from 'lucide-react';

interface FixComparePageProps {
  originalDocument: ContentVersion;
  brandProfile: BrandProfile;
  isAiDegraded?: boolean;
  onRevisionSavedAndRechecked?: (
    newDoc: ContentVersion,
    evalResult: ContentEvaluationResult,
    savedSubmission?: SubmittedContent
  ) => void;
  onRecheckCompleted?: (newVersionNumber: string, updatedText: string, updatedFindings: Finding[]) => void;
  onNavigate: (page: PageId) => void;
  onShowToast: (message: string) => void;
}

export const FixComparePage: React.FC<FixComparePageProps> = ({
  originalDocument,
  brandProfile,
  isAiDegraded = false,
  onRevisionSavedAndRechecked,
  onRecheckCompleted,
  onNavigate,
  onShowToast
}) => {
  // Compute next proposed version number (e.g. v1.0 -> v1.1)
  const currentVerMatch = originalDocument.versionNumber.match(/^v?(\d+)\.(\d+)$/);
  const nextVersionNumber = currentVerMatch
    ? `v${currentVerMatch[1]}.${parseInt(currentVerMatch[2], 10) + 1}`
    : 'v1.1';

  // Working draft state
  const [workingDraft, setWorkingDraft] = useState(originalDocument.text);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>(() =>
    originalDocument.findings.map((f) => f.id)
  );

  // View mode: 'split' (side-by-side), 'diff' (visual accessible diff), 'summary' (change list)
  const [viewMode, setViewMode] = useState<'split' | 'diff' | 'summary'>('split');

  // AI Correction states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<AiCorrectionResult | null>(null);
  const [isAiConfigModalOpen, setIsAiConfigModalOpen] = useState(false);

  // Discard confirmation modal state
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // Saving & Rechecking state
  const [isSavingAndRechecking, setIsSavingAndRechecking] = useState(false);
  const [recheckResult, setRecheckResult] = useState<ContentEvaluationResult | null>(null);
  const [savedRevisionDoc, setSavedRevisionDoc] = useState<ContentVersion | null>(null);

  // Check if draft has unsaved modifications
  const isDirty = workingDraft !== originalDocument.text;

  // Compute Word-level diff
  const diffResult = useMemo(
    () => computeWordDiff(originalDocument.text, workingDraft),
    [originalDocument.text, workingDraft]
  );

  // Actionable findings from original version
  const actionableFindings = originalDocument.findings;

  // Toggle finding selection
  const handleToggleFinding = (id: string) => {
    setSelectedFindingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all or none
  const handleSelectAllFindings = () => {
    if (selectedFindingIds.length === actionableFindings.length) {
      setSelectedFindingIds([]);
    } else {
      setSelectedFindingIds(actionableFindings.map((f) => f.id));
    }
  };

  // Apply single rule-based suggestion
  const handleApplySingleRuleFix = (finding: Finding) => {
    const replacement = finding.suggestedAction || finding.suggestionText;
    if (!replacement) return;

    if (finding.triggerText === 'Document Scope' || finding.ruleType === 'required_disclosure') {
      // Append disclosure
      if (!workingDraft.toLowerCase().includes(replacement.toLowerCase())) {
        const updated = `${workingDraft.trim()}\n\n${replacement}`;
        setWorkingDraft(updated);
        onShowToast(`Appended disclosure: "${replacement.substring(0, 40)}..."`);
      } else {
        onShowToast('Disclosure already appears in draft.');
      }
      return;
    }

    if (finding.triggerText && workingDraft.includes(finding.triggerText)) {
      const updated = workingDraft.replace(finding.triggerText, replacement);
      setWorkingDraft(updated);
      onShowToast(`Replaced "${finding.triggerText}" with compliant copy.`);
    } else {
      onShowToast(`Phrase "${finding.triggerText}" not found in current draft.`);
    }
  };

  // Apply all selected rule-based suggestions in batch
  const handleApplySelectedRuleFixes = () => {
    let updated = workingDraft;
    let appliedCount = 0;

    actionableFindings.forEach((finding) => {
      if (!selectedFindingIds.includes(finding.id)) return;
      const replacement = finding.suggestedAction || finding.suggestionText;
      if (!replacement) return;

      if (finding.triggerText === 'Document Scope' || finding.ruleType === 'required_disclosure') {
        if (!updated.toLowerCase().includes(replacement.toLowerCase())) {
          updated = `${updated.trim()}\n\n${replacement}`;
          appliedCount++;
        }
      } else if (finding.triggerText && updated.includes(finding.triggerText)) {
        updated = updated.replace(finding.triggerText, replacement);
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      setWorkingDraft(updated);
      onShowToast(`Applied ${appliedCount} rule replacements to working draft.`);
    } else {
      onShowToast('No selected rule replacements could be applied to current text.');
    }
  };

  // Request AI-assisted targeted revision
  const handleRequestAiCorrection = async () => {
    const selectedFindings = actionableFindings.filter((f) =>
      selectedFindingIds.includes(f.id)
    );

    if (selectedFindings.length === 0) {
      onShowToast('Please select at least one finding to guide the AI correction.');
      return;
    }

    if (isAiDegraded) {
      onShowToast('AI engine is simulated as Offline. Please use rule suggestions or manual editing.');
      return;
    }

    setIsAiLoading(true);
    setAiProposal(null);

    try {
      const result = await aiContextualService.requestAiCorrection({
        contentId: originalDocument.id,
        contentVersion: originalDocument.versionNumber,
        originalText: workingDraft,
        selectedFindings,
        brandProfile
      });

      setAiProposal(result);

      if (result.status === 'completed') {
        onShowToast('AI proposed targeted revision. Review changes before accepting.');
      } else if (result.status === 'unavailable') {
        onShowToast(result.explanation || 'AI review is offline. Setup required.');
      } else {
        onShowToast(result.errorMessage || 'AI provider could not complete revision.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI connection failure';
      onShowToast(`AI correction failed: ${msg}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Accept AI proposal into working draft
  const handleAcceptAiProposal = () => {
    if (!aiProposal?.proposedText) return;
    setWorkingDraft(aiProposal.proposedText);
    setAiProposal(null);
    onShowToast('Accepted AI proposed revision into working draft.');
  };

  // Reject / Dismiss AI proposal
  const handleRejectAiProposal = () => {
    setAiProposal(null);
    onShowToast('Dismissed AI suggestion without altering draft.');
  };

  // Discard unsaved changes and reset to original
  const handleConfirmDiscard = () => {
    setWorkingDraft(originalDocument.text);
    setIsDiscardModalOpen(false);
    setAiProposal(null);
    onShowToast('Reverted working draft to original immutable baseline.');
  };

  // Save Revision and execute fresh Deterministic Recheck
  const handleSaveAndRecheck = async () => {
    if (!isDirty && !recheckResult) {
      onShowToast('No edits detected. Make changes to the draft before saving a new revision.');
      return;
    }

    setIsSavingAndRechecking(true);

    try {
      // 1. Persist revision via contentService
      const saveRes = await contentService.createRevision({
        parentId: originalDocument.submittedContentId || originalDocument.id,
        newText: workingDraft,
        updatedTitle: originalDocument.title,
        ruleVersionRef: brandProfile.version,
        changeSummary: `Applied surgical governance corrections (${diffResult.metrics.wordsAdded} words added, ${diffResult.metrics.wordsRemoved} removed)`
      });

      if (!saveRes.success || !saveRes.record) {
        onShowToast(saveRes.error || 'Failed to persist new revision record.');
        setIsSavingAndRechecking(false);
        return;
      }

      const savedRecord = saveRes.record;

      // 2. Prepare revision document object
      const newDoc: ContentVersion = {
        ...originalDocument,
        versionNumber: savedRecord.versionNumber,
        contentHash: savedRecord.contentHash,
        text: workingDraft,
        timestamp: savedRecord.updatedAt,
        isApproved: false, // Strictly false: never auto-approve revisions!
        findings: []
      };

      // 3. Run authoritative deterministic governance evaluation on exact saved revision
      const evalResult = governanceEngine.evaluateContent(
        newDoc,
        brandProfile
      );

      // Attach fresh findings to the new version
      newDoc.findings = evalResult.findings;

      setRecheckResult(evalResult);
      setSavedRevisionDoc(newDoc);

      // 4. Notify parent application state
      if (onRevisionSavedAndRechecked) {
        onRevisionSavedAndRechecked(newDoc, evalResult, savedRecord);
      }
      if (onRecheckCompleted) {
        onRecheckCompleted(newDoc.versionNumber, newDoc.text, evalResult.findings);
      }

      onShowToast(
        `Saved immutable revision ${newDoc.versionNumber}. Recheck: ${evalResult.overallStatus} (${evalResult.findings.length} findings).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save operation failed';
      onShowToast(`Error saving revision: ${msg}`);
    } finally {
      setIsSavingAndRechecking(false);
    }
  };

  // Analyze resolved vs remaining findings
  const resolvedFindingsSummary = useMemo(() => {
    if (!recheckResult) return null;

    const originalRuleIds = new Set(originalDocument.findings.map((f) => f.ruleId));
    const newRuleIds = new Set(recheckResult.findings.map((f) => f.ruleId));

    const resolved: string[] = [];
    originalRuleIds.forEach((ruleId) => {
      if (!newRuleIds.has(ruleId)) {
        resolved.push(ruleId);
      }
    });

    const remaining = recheckResult.findings;

    return {
      resolved,
      remaining,
      resolvedCount: resolved.length,
      remainingCount: remaining.length
    };
  }, [recheckResult, originalDocument.findings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1180px', margin: '0 auto' }}>
      {/* Top Header & Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (isDirty) {
                setIsDiscardModalOpen(true);
              } else {
                onNavigate('results');
              }
            }}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Return to Results</span>
          </button>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>•</span>
          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
            Revision & Diff Studio
          </span>
          {isDirty && (
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(255, 182, 133, 0.25)',
                color: 'var(--color-midnight-ink)',
                border: '1px solid var(--color-warm-peach)',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warm-peach)' }} />
              Unsaved Draft Modifications
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsAiConfigModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            title="Configure Gemini API Key"
          >
            <Settings size={13} />
            <span>AI Settings</span>
          </button>

          {isDirty && (
            <button
              onClick={() => setIsDiscardModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Trash2 size={13} />
              <span>Discard Edits</span>
            </button>
          )}

          <button
            onClick={handleSaveAndRecheck}
            disabled={isSavingAndRechecking || (!isDirty && !recheckResult)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontSize: '13px' }}
          >
            {isSavingAndRechecking ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving {nextVersionNumber}...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Revision & Recheck ({nextVersionNumber})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Evolution Status Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          backgroundColor: 'var(--color-soft-white)',
          borderLeft: '5px solid var(--color-deep-teal)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                {originalDocument.title}
              </h1>
              <span className="badge badge-neutral" style={{ fontSize: '12px' }}>
                Origin: {originalDocument.versionNumber}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>➔</span>
              <span className="badge badge-success" style={{ fontSize: '12px' }}>
                Target: {savedRevisionDoc ? savedRevisionDoc.versionNumber : `${nextVersionNumber} (Draft)`}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Targeted surgical corrections preserve factual intent without mutating the immutable baseline.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="text-mono text-muted" style={{ fontSize: '11px' }}>
              SHA-256: {originalDocument.contentHash.substring(0, 16)}...
            </span>
          </div>
        </div>

        {/* Diff Metrics Quick Counter */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--color-sand-dark)'
          }}
        >
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Original Word Count
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
              {diffResult.metrics.originalWordCount}
            </div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Revised Word Count
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
              {diffResult.metrics.revisedWordCount}
            </div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: diffResult.metrics.wordsRemoved > 0 ? 'rgba(240, 107, 112, 0.12)' : 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Words Removed
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: diffResult.metrics.wordsRemoved > 0 ? 'var(--color-coral)' : 'var(--color-midnight-ink)' }}>
              -{diffResult.metrics.wordsRemoved}
            </div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: diffResult.metrics.wordsAdded > 0 ? 'rgba(0, 229, 168, 0.12)' : 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Words Added
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: diffResult.metrics.wordsAdded > 0 ? 'var(--color-deep-teal)' : 'var(--color-midnight-ink)' }}>
              +{diffResult.metrics.wordsAdded}
            </div>
          </div>
        </div>
      </div>

      {/* TARGETED CORRECTIONS DECK */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--color-sand)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCompare size={17} color="var(--color-deep-teal)" />
            <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
              Targeted Findings to Address ({selectedFindingIds.length} of {actionableFindings.length} Selected)
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleSelectAllFindings}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              {selectedFindingIds.length === actionableFindings.length ? 'Deselect All' : 'Select All'}
            </button>

            <button
              onClick={handleApplySelectedRuleFixes}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Apply rule suggested replacements directly"
            >
              <Check size={13} color="var(--color-deep-teal)" />
              <span>Apply Rule Replacements</span>
            </button>

            <button
              onClick={handleRequestAiCorrection}
              disabled={isAiLoading || selectedFindingIds.length === 0}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11.5px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Request AI-assisted targeted revision using Google Gemini"
            >
              {isAiLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Ask AI for Targeted Revision</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Proposal Review Callout if generated */}
        {aiProposal && aiProposal.status === 'completed' && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(199, 184, 255, 0.25)',
              border: '1px solid var(--color-lavender)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="var(--color-deep-teal)" />
                <strong style={{ fontSize: '13px', color: 'var(--color-midnight-ink)' }}>
                  AI Proposed Revision Ready for Review
                </strong>
                <span className="badge badge-info" style={{ fontSize: '10.5px' }}>
                  {aiProposal.modelName || 'gemini-2.5-flash'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleRejectAiProposal}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11.5px', padding: '3px 10px' }}
                >
                  Dismiss
                </button>
                <button
                  onClick={handleAcceptAiProposal}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '11.5px', padding: '3px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Check size={13} />
                  <span>Accept into Working Draft</span>
                </button>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              {aiProposal.explanation}
            </p>

            {aiProposal.modificationsSummary && aiProposal.modificationsSummary.length > 0 && (
              <ul style={{ fontSize: '12px', color: 'var(--color-midnight-ink)', paddingLeft: '18px', margin: 0 }}>
                {aiProposal.modificationsSummary.map((mod, idx) => (
                  <li key={idx} style={{ marginTop: '2px' }}>{mod}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Findings Checklist Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' }}>
          {actionableFindings.map((finding) => {
            const isSelected = selectedFindingIds.includes(finding.id);
            const isAi = finding.source === 'AI_CONTEXTUAL';

            return (
              <div
                key={finding.id}
                style={{
                  backgroundColor: isSelected ? 'var(--color-soft-white)' : 'rgba(255,255,255,0.6)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isSelected ? 'var(--color-deep-teal)' : 'var(--color-sand-dark)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  opacity: isSelected ? 1 : 0.75,
                  transition: 'all 120ms ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleFinding(finding.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span className="text-mono" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-deep-teal)' }}>
                        {finding.ruleId}
                      </span>
                    </label>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {isAi ? (
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>AI</span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>Det</span>
                      )}
                      <SeverityBadge severity={finding.severity} />
                    </div>
                  </div>

                  {finding.triggerText && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Original: <strong style={{ color: 'var(--color-coral)' }}>"{finding.triggerText}"</strong>
                    </div>
                  )}

                  {(finding.suggestedAction || finding.suggestionText) && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                      Suggested: <strong style={{ color: 'var(--color-deep-teal)' }}>"{finding.suggestedAction || finding.suggestionText}"</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    onClick={() => handleApplySingleRuleFix(finding)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    title="Replace this phrase in the working draft"
                  >
                    Apply Replacement
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VIEW MODE TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-sand-dark)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('split')}
            className={`btn btn-sm ${viewMode === 'split' ? 'btn-dark' : 'btn-secondary'}`}
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={13} />
            <span>Split Editor Comparison</span>
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`btn btn-sm ${viewMode === 'diff' ? 'btn-dark' : 'btn-secondary'}`}
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Eye size={13} />
            <span>Accessible Visual Diff</span>
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`btn btn-sm ${viewMode === 'summary' ? 'btn-dark' : 'btn-secondary'}`}
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={13} />
            <span>Change Summary ({diffResult.changeSummaryDescriptions.length})</span>
          </button>
        </div>

        <span className="text-muted" style={{ fontSize: '11.5px' }}>
          {isDirty ? 'Draft has modifications' : 'Draft is identical to original baseline'}
        </span>
      </div>

      {/* VIEW 1: SPLIT EDITOR COMPARISON */}
      {viewMode === 'split' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
          {/* Left Column: Original Immutable Baseline */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Original Version ({originalDocument.versionNumber} — Immutable Baseline)
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                Read-Only
              </span>
            </div>

            <textarea
              value={originalDocument.text}
              readOnly
              rows={11}
              className="form-textarea"
              style={{
                backgroundColor: 'var(--color-sand)',
                color: 'var(--color-text-secondary)',
                cursor: 'not-allowed',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.65,
                fontSize: '13.5px'
              }}
            />
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Immutable baseline preserved for regulatory auditability. Original inputs are never mutated in place.
            </span>
          </div>

          {/* Right Column: Working Draft Revision */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid var(--color-mint)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-deep-teal)' }}>
                Target Working Revision ({nextVersionNumber} Draft — Editable)
              </span>
              <span className="badge badge-success" style={{ fontSize: '10.5px' }}>
                Editable Draft
              </span>
            </div>

            <textarea
              value={workingDraft}
              onChange={(e) => setWorkingDraft(e.target.value)}
              rows={11}
              className="form-textarea"
              placeholder="Edit marketing text directly..."
              style={{
                backgroundColor: 'var(--color-soft-white)',
                color: 'var(--color-midnight-ink)',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.65,
                fontSize: '13.5px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <span>Type directly or use finding replacements above.</span>
              <span>{workingDraft.length} characters</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ACCESSIBLE VISUAL DIFF */}
      {viewMode === 'diff' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
              Before/After Accessible Text Comparison
            </h3>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-coral)' }}>
                <strong>[-] Removed Text</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-deep-teal)' }}>
                <strong>[+] Added / Compliant Text</strong>
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              backgroundColor: 'var(--color-soft-white)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-sand-dark)',
              fontSize: '14.5px',
              lineHeight: 1.8,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-midnight-ink)',
              minHeight: '220px'
            }}
          >
            {diffResult.segments.map((seg, idx) => {
              if (seg.type === 'removed') {
                return (
                  <del
                    key={idx}
                    aria-label="Removed text"
                    style={{
                      backgroundColor: 'rgba(240, 107, 112, 0.25)',
                      color: 'var(--color-coral)',
                      textDecoration: 'line-through',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      margin: '0 1px'
                    }}
                  >
                    <span style={{ fontSize: '10px', verticalAlign: 'super', marginRight: '2px' }}>[-]</span>
                    {seg.text}
                  </del>
                );
              }

              if (seg.type === 'added') {
                return (
                  <ins
                    key={idx}
                    aria-label="Added text"
                    style={{
                      backgroundColor: 'rgba(0, 229, 168, 0.2)',
                      color: 'var(--color-deep-teal)',
                      textDecoration: 'none',
                      borderBottom: '2px solid var(--color-mint)',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      margin: '0 1px'
                    }}
                  >
                    <span style={{ fontSize: '10px', verticalAlign: 'super', marginRight: '2px' }}>[+]</span>
                    {seg.text}
                  </ins>
                );
              }

              return <span key={idx}>{seg.text}</span>;
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: CHANGE SUMMARY INSPECTOR */}
      {viewMode === 'summary' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
            Granular Change Manifest
          </h3>

          {diffResult.changeSummaryDescriptions.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              No modifications detected between working draft and original baseline.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {diffResult.changeSummaryDescriptions.map((desc, idx) => {
                const isAdd = desc.startsWith('[+]');
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isAdd ? 'rgba(0, 229, 168, 0.1)' : 'rgba(240, 107, 112, 0.1)',
                      borderLeft: `3px solid ${isAdd ? 'var(--color-mint)' : 'var(--color-coral)'}`,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      fontFamily: 'var(--font-sans)'
                    }}
                  >
                    {desc}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RECHECK RESULTS SUMMARY CARD (When evaluated) */}
      {recheckResult && resolvedFindingsSummary && (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'var(--color-soft-white)',
            borderLeft: `6px solid ${
              recheckResult.overallStatus === 'FAIL'
                ? 'var(--color-coral)'
                : recheckResult.overallStatus === 'REVIEW_REQUIRED'
                ? 'var(--color-warm-peach)'
                : 'var(--color-mint)'
            }`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {recheckResult.overallStatus === 'PASS' ? (
                <ShieldCheck size={20} color="var(--color-mint)" />
              ) : recheckResult.overallStatus === 'REVIEW_REQUIRED' ? (
                <AlertTriangle size={20} color="var(--color-warm-peach)" />
              ) : (
                <ShieldAlert size={20} color="var(--color-coral)" />
              )}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                  Recheck Completed on Saved Revision {savedRevisionDoc?.versionNumber}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {recheckResult.summary.overallExplanation}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => onNavigate('results')}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Inspect in Results View</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {/* Resolved Issues */}
            <div style={{ padding: '12px', backgroundColor: 'rgba(0, 229, 168, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 229, 168, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-deep-teal)' }}>
                <CheckCircle2 size={15} color="var(--color-deep-teal)" />
                <span>Resolved Violations ({resolvedFindingsSummary.resolvedCount})</span>
              </div>
              {resolvedFindingsSummary.resolved.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  No prior findings were resolved in this pass.
                </p>
              ) : (
                <ul style={{ fontSize: '12px', color: 'var(--color-midnight-ink)', paddingLeft: '18px', margin: '6px 0 0' }}>
                  {resolvedFindingsSummary.resolved.map((ruleId) => (
                    <li key={ruleId} style={{ marginTop: '2px' }}>
                      <strong>{ruleId}</strong>: Addressed in revision
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Remaining Issues */}
            <div style={{ padding: '12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-sand-dark)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                <HelpCircle size={15} color="var(--color-text-muted)" />
                <span>Remaining Issues ({resolvedFindingsSummary.remainingCount})</span>
              </div>
              {resolvedFindingsSummary.remaining.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  All evaluated deterministic checks passed cleanly!
                </p>
              ) : (
                <ul style={{ fontSize: '12px', color: 'var(--color-midnight-ink)', paddingLeft: '18px', margin: '6px 0 0' }}>
                  {resolvedFindingsSummary.remaining.map((f) => (
                    <li key={f.id} style={{ marginTop: '2px' }}>
                      <strong>{f.ruleId}</strong>: {f.triggerText ? `"${f.triggerText}"` : f.explanation}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STICKY BOTTOM ACTION BAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: 'var(--color-soft-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-sand-dark)',
          boxShadow: 'var(--shadow-card)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={16} color="var(--color-deep-teal)" />
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
            Revision Pipeline: <strong>{originalDocument.versionNumber}</strong> ➔ <strong>{savedRevisionDoc ? savedRevisionDoc.versionNumber : nextVersionNumber}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isDirty && (
            <button
              onClick={() => setIsDiscardModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12.5px' }}
            >
              Reset Draft
            </button>
          )}

          <button
            onClick={handleSaveAndRecheck}
            disabled={isSavingAndRechecking || (!isDirty && !recheckResult)}
            className="btn btn-dark"
            style={{ padding: '9px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isSavingAndRechecking ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Evaluating {nextVersionNumber}...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Revision as {nextVersionNumber} & Recheck</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DISCARD CONFIRMATION MODAL */}
      {isDiscardModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 35, 35, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: 'var(--color-soft-white)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} color="var(--color-coral)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Discard Unsaved Draft Changes?
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              You have modified the working draft for revision {nextVersionNumber}. Reverting will discard all unsaved edits and reset to the original baseline ({originalDocument.versionNumber}).
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setIsDiscardModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Keep Editing
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="btn btn-danger btn-sm"
                style={{ backgroundColor: 'var(--color-coral)', color: 'white', border: 'none' }}
              >
                Discard Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI SETTINGS MODAL */}
      {isAiConfigModalOpen && (
        <AiSettingsModal
          isOpen={isAiConfigModalOpen}
          onClose={() => setIsAiConfigModalOpen(false)}
          onConfigSaved={() => {
            onShowToast('AI Provider configuration saved.');
          }}
        />
      )}
    </div>
  );
};

export default FixComparePage;
