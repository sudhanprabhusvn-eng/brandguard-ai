import React, { useState, useMemo } from 'react';
import type { PageId, ContentVersion, BrandProfile, Finding, ContentEvaluationResult, FindingSource } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import { governanceEngine } from '../services/governanceEngine';
import { aiContextualService } from '../services/aiContextualService';
import { AiSettingsModal } from '../components/brand/AiSettingsModal';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Cpu,
  HelpCircle,
  Copy,
  Check,
  FileText,
  Sparkles,
  Settings,
  RotateCcw,
  Loader2
} from 'lucide-react';

interface AnalysisResultsPageProps {
  document: ContentVersion;
  onNavigate: (page: PageId) => void;
  isAiDegraded: boolean;
  brandProfile?: BrandProfile;
}

export const AnalysisResultsPage: React.FC<AnalysisResultsPageProps> = ({
  document,
  onNavigate,
  isAiDegraded,
  brandProfile
}) => {
  // 1. Deterministic evaluation result
  const [deterministicResult] = useState<ContentEvaluationResult>(() => {
    const cached = governanceEngine.getEvaluationResult(
      document.id,
      document.versionNumber,
      document.contentHash
    );
    if (cached) return cached;

    if (brandProfile) {
      return governanceEngine.evaluateContent(document, brandProfile);
    }

    const findings = (document.findings || []).map((f) => ({
      ...f,
      source: (f.source || 'DETERMINISTIC') as FindingSource
    }));

    return {
      id: `eval_${document.contentHash.substring(0, 10)}_${document.versionNumber}`,
      contentId: document.id,
      contentTitle: document.title,
      contentVersion: document.versionNumber,
      contentHash: document.contentHash,
      brandProfileId: document.brandProfileId || 'np-org-01',
      brandProfileName: document.brandProfileName || 'NovaPulse',
      ruleVersionRef: document.ruleVersionRef || 'v2.1',
      evaluatedAt: document.timestamp || new Date().toISOString(),
      engineVersion: 'det-v1.0',
      overallStatus: 'FAIL',
      summary: {
        totalRulesEvaluated: 5,
        passedCount: 1,
        criticalCount: 2,
        warningCount: 2,
        infoCount: 0,
        reviewRequiredCount: 2,
        overallStatus: 'FAIL',
        overallExplanation: 'Content evaluated against active governance policies.'
      },
      findings
    };
  });

  // 2. AI Contextual review state
  const initialCachedAi = useMemo(
    () => aiContextualService.getCachedResult(document.id, document.versionNumber, document.contentHash),
    [document.id, document.versionNumber, document.contentHash]
  );
  const [aiFindings, setAiFindings] = useState<Finding[]>(() => initialCachedAi?.findings || []);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'completed' | 'failed' | 'unavailable'>(
    () => (initialCachedAi?.status === 'completed' ? 'completed' : 'idle')
  );
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [aiRunSummary, setAiRunSummary] = useState<string | null>(() => initialCachedAi?.analysisSummary || null);
  const [isAiConfigModalOpen, setIsAiConfigModalOpen] = useState(false);
  const [isAiConfigured, setIsAiConfigured] = useState<boolean>(() => aiContextualService.isConfigured());

  // Combined findings: Deterministic findings are strictly preserved; AI findings supplement them
  const allFindings = [...deterministicResult.findings, ...aiFindings];

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    allFindings[0]?.id || null
  );
  const [sourceFilter, setSourceFilter] = useState<'all' | 'DETERMINISTIC' | 'AI_CONTEXTUAL'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [copiedHash, setCopiedHash] = useState(false);

  // Filter findings based on source and severity
  const filteredFindings = allFindings.filter((f) => {
    if (sourceFilter !== 'all' && (f.source || 'DETERMINISTIC') !== sourceFilter) return false;
    if (severityFilter === 'all') return true;
    if (severityFilter === 'critical') return f.severity === 'critical';
    if (severityFilter === 'warning') return f.severity === 'warning';
    if (severityFilter === 'review_required') return f.status === 'REVIEW_REQUIRED';
    return true;
  });

  const handleCopyHash = () => {
    navigator.clipboard.writeText(document.contentHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Trigger live AI review
  const handleExecuteAiReview = async () => {
    if (!brandProfile) return;

    setAiStatus('loading');
    setAiErrorMessage(null);

    const result = await aiContextualService.runContextualReview({
      contentId: document.id,
      contentTitle: document.title,
      contentVersion: document.versionNumber,
      contentHash: document.contentHash,
      rawText: document.text,
      channel: document.channel,
      brandProfile,
      deterministicFindings: deterministicResult.findings
    });

    if (result.status === 'completed') {
      setAiFindings(result.findings);
      setAiStatus('completed');
      setAiRunSummary(result.analysisSummary);
      if (result.findings.length > 0 && !selectedFindingId) {
        setSelectedFindingId(result.findings[0].id);
      }
    } else if (result.status === 'unavailable') {
      setAiStatus('unavailable');
      setAiErrorMessage(result.errorMessage || 'AI Provider is unconfigured.');
    } else {
      setAiStatus('failed');
      setAiErrorMessage(result.errorMessage || 'AI Contextual review encountered an error.');
    }
  };

  // Safe highlighted text rendering - preserves original text without alteration
  const renderHighlightedText = () => {
    const text = document.text;
    const sortedFindings = [...allFindings]
      .filter((f) => f.startIndex !== undefined && f.endIndex !== undefined && f.startIndex < f.endIndex)
      .sort((a, b) => a.startIndex - b.startIndex);

    if (sortedFindings.length === 0) {
      return <span>{text}</span>;
    }

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedFindings.forEach((finding) => {
      if (finding.startIndex > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, finding.startIndex)}
          </span>
        );
      }

      if (finding.startIndex >= lastIndex) {
        const isSelected = selectedFindingId === finding.id;
        const isAi = finding.source === 'AI_CONTEXTUAL';

        const highlightClass = isAi
          ? 'highlight-ai'
          : finding.severity === 'critical'
          ? 'highlight-critical'
          : 'highlight-warning';

        const borderStyle = isAi
          ? '1px dashed var(--color-lavender)'
          : finding.severity === 'critical'
          ? '1px solid var(--color-coral)'
          : '1px solid var(--color-warm-peach)';

        segments.push(
          <mark
            key={finding.id}
            className={`highlight-span ${highlightClass} ${isSelected ? 'active' : ''}`}
            onClick={() => setSelectedFindingId(finding.id)}
            title={`Click to inspect: ${finding.ruleName} [${finding.source || 'DETERMINISTIC'}]`}
            style={{
              cursor: 'pointer',
              border: borderStyle,
              borderWidth: isSelected ? '2px' : '1px',
              boxShadow: isSelected ? '0 0 0 2px var(--color-deep-teal)' : 'none',
              padding: '2px 4px',
              borderRadius: '3px',
              backgroundColor: isAi ? 'rgba(199, 184, 255, 0.35)' : undefined
            }}
          >
            {text.substring(finding.startIndex, finding.endIndex)}
          </mark>
        );

        lastIndex = finding.endIndex;
      }
    });

    if (lastIndex < text.length) {
      segments.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return segments;
  };

  const detCount = deterministicResult.findings.length;
  const aiCount = aiFindings.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1120px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onNavigate('new_review')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Return to Content Ingestion</span>
          </button>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>•</span>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Dual Engine Evaluation
            </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setIsAiConfigModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
            title="Configure Gemini API Key and AI Review Settings"
          >
            <Settings size={14} />
            <span>AI Settings</span>
          </button>

          <button
            onClick={() => onNavigate('fix_compare')}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <span>Fix in Compare Studio</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Primary Evaluation Status Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderLeft: `6px solid ${
            deterministicResult.overallStatus === 'FAIL'
              ? 'var(--color-coral)'
              : deterministicResult.overallStatus === 'REVIEW_REQUIRED'
              ? 'var(--color-warm-peach)'
              : 'var(--color-mint)'
          }`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                {document.title}
              </h1>
              <span className="badge badge-neutral" style={{ fontSize: '12px' }}>
                {document.versionNumber}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Brand: <strong>{deterministicResult.brandProfileName} ({deterministicResult.ruleVersionRef})</strong>
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              {deterministicResult.summary.overallExplanation}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {deterministicResult.overallStatus === 'FAIL' ? (
              <span className="badge badge-critical" style={{ fontSize: '13px', padding: '6px 12px' }}>
                <ShieldAlert size={15} />
                <span>FAIL — Blocking Critical Violations</span>
              </span>
            ) : deterministicResult.overallStatus === 'REVIEW_REQUIRED' ? (
              <span className="badge badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>
                <AlertTriangle size={15} />
                <span>REVIEW REQUIRED</span>
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '13px', padding: '6px 12px' }}>
                <ShieldCheck size={15} />
                <span>PASS</span>
              </span>
            )}
          </div>
        </div>

        {/* Dual Engine Findings Counter Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-sand-dark)'
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: deterministicResult.summary.criticalCount > 0 ? 'var(--state-critical-bg)' : 'var(--color-sand)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${deterministicResult.summary.criticalCount > 0 ? 'var(--state-critical-border)' : 'var(--color-sand-dark)'}`
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Deterministic Blocking
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: deterministicResult.summary.criticalCount > 0 ? 'var(--color-coral)' : 'var(--color-midnight-ink)' }}>
              {deterministicResult.summary.criticalCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Exact phrase policy violations</div>
          </div>

          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-sand)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-sand-dark)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Deterministic Warnings
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
              {deterministicResult.summary.warningCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Missing promotional terms</div>
          </div>

          <div style={{
            padding: '10px 14px',
            backgroundColor: aiCount > 0 ? 'rgba(199, 184, 255, 0.2)' : 'var(--color-sand)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${aiCount > 0 ? 'var(--color-lavender)' : 'var(--color-sand-dark)'}`
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              AI Contextual Insights
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
              {aiCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {aiStatus === 'completed' ? 'Context, tone & claim reviews' : 'Review not run yet'}
            </div>
          </div>

          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-sand)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-sand-dark)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Total Governance Items
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-deep-teal)' }}>
              {allFindings.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Deterministic + AI findings</div>
          </div>
        </div>

        {/* SHA-256 Checksum & Diagnostics Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11.5px',
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-sand)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={14} color="var(--color-deep-teal)" />
            <span>Deterministic Engine: <strong>{deterministicResult.engineVersion}</strong></span>
            <span>• Evaluated: {new Date(deterministicResult.evaluatedAt).toLocaleTimeString()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="text-mono">SHA-256: {document.contentHash.substring(0, 24)}...</span>
            <button
              onClick={handleCopyHash}
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 6px', fontSize: '11px' }}
              title="Copy full SHA-256 hash"
            >
              {copiedHash ? <Check size={11} color="var(--color-mint)" /> : <Copy size={11} />}
              <span>{copiedHash ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Degradation Alert if active */}
      {isAiDegraded && (
        <div style={{
          backgroundColor: 'var(--state-warning-bg)',
          border: '1px solid var(--state-warning-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: 'var(--state-warning-text)'
        }}>
          <AlertCircle size={18} />
          <div>
            <strong>AI Contextual Engine Simulated as Offline:</strong> Content analysis operates strictly on deterministic governance rules and mandatory disclosures.
          </div>
        </div>
      )}

      {/* AI CONTEXTUAL REVIEW STATUS BANNER */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--color-soft-white)',
          border: '1px solid var(--color-sand-dark)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '680px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: aiStatus === 'completed' ? 'rgba(0, 229, 168, 0.15)' : 'rgba(199, 184, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-deep-teal)',
            flexShrink: 0
          }}>
            <Sparkles size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Contextual AI Review Layer
              </h2>
              {aiStatus === 'completed' ? (
                <span className="badge badge-success" style={{ fontSize: '10.5px' }}>
                  Live Flash Analysis Active
                </span>
              ) : isAiConfigured ? (
                <span className="badge badge-info" style={{ fontSize: '10.5px' }}>
                  Provider Ready
                </span>
              ) : (
                <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                  Setup Optional
                </span>
              )}
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>
              {aiStatus === 'loading'
                ? 'Running deep semantic evaluation against brand voice, ambiguous claims, and evidence requirements...'
                : aiStatus === 'completed'
                ? aiRunSummary || `Live contextual evaluation completed. ${aiFindings.length} semantic findings detected.`
                : aiStatus === 'failed'
                ? `Provider Warning: ${aiErrorMessage}`
                : isAiConfigured
                ? 'Provider configured via Google Gemini free tier. Click "Run AI Review" to detect nuanced tone and contextual claims.'
                : 'AI review requires a free Google Gemini API key. Deterministic rules remain 100% active and authoritative.'}
            </p>
          </div>
        </div>

        {/* AI Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAiConfigured ? (
            <button
              onClick={handleExecuteAiReview}
              disabled={aiStatus === 'loading'}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '13px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {aiStatus === 'loading' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Analyzing Meaning...</span>
                </>
              ) : aiStatus === 'completed' ? (
                <>
                  <RotateCcw size={14} />
                  <span>Re-run AI Review</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Run AI Contextual Review</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsAiConfigModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '13px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Settings size={14} />
              <span>Configure Free Gemini Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Diagnostic Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Left Column: Source Text Inspection with Highlights */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--color-deep-teal)" />
              <h2 className="title-section">Source Content Inspection</h2>
            </div>
            <span className="text-muted" style={{ fontSize: '12px' }}>
              Click highlights to inspect citations
            </span>
          </div>

          <div
            style={{
              padding: '22px',
              backgroundColor: 'var(--color-sand)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-sand-dark)',
              fontSize: '15px',
              lineHeight: 1.7,
              minHeight: '280px',
              color: 'var(--color-midnight-ink)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {renderHighlightedText()}
          </div>

          {/* Interactive Legend */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: 'rgba(240, 107, 112, 0.4)', borderBottom: '2px solid var(--color-coral)', display: 'inline-block' }} />
              Deterministic Critical
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: 'rgba(255, 182, 133, 0.5)', borderBottom: '2px solid var(--color-warm-peach)', display: 'inline-block' }} />
              Deterministic Warning / Disclosure
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: 'rgba(199, 184, 255, 0.5)', borderBottom: '2px solid var(--color-lavender)', display: 'inline-block' }} />
              AI Contextual Finding
            </span>
          </div>
        </div>

        {/* Right Column: Findings Breakdown with Source Separation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Source Tabs: Separate Deterministic vs AI Contextual */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-sand-dark)',
            paddingBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setSourceFilter('all')}
                className={`btn btn-sm ${sourceFilter === 'all' ? 'btn-dark' : 'btn-secondary'}`}
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                All Sources ({allFindings.length})
              </button>
              <button
                onClick={() => setSourceFilter('DETERMINISTIC')}
                className={`btn btn-sm ${sourceFilter === 'DETERMINISTIC' ? 'btn-dark' : 'btn-secondary'}`}
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                <Cpu size={12} />
                <span>Deterministic ({detCount})</span>
              </button>
              <button
                onClick={() => setSourceFilter('AI_CONTEXTUAL')}
                className={`btn btn-sm ${sourceFilter === 'AI_CONTEXTUAL' ? 'btn-dark' : 'btn-secondary'}`}
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                <Sparkles size={12} />
                <span>AI Contextual ({aiCount})</span>
              </button>
            </div>

            {/* Severity Sub-Filter */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                className={`btn btn-sm ${severityFilter === 'critical' ? 'btn-dark' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                Critical
              </button>
              <button
                onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
                className={`btn btn-sm ${severityFilter === 'warning' ? 'btn-dark' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                Warnings
              </button>
            </div>
          </div>

          {/* Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredFindings.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '36px 20px',
                backgroundColor: 'var(--color-sand)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)'
              }}>
                <CheckCircle size={32} color="var(--color-mint)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontWeight: 600, fontSize: '14px' }}>No findings under this filter</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  {sourceFilter === 'AI_CONTEXTUAL' && aiCount === 0
                    ? 'AI review has not been executed yet. Click "Run AI Review" above to analyze tone and claims.'
                    : 'All evaluated rules and guidelines satisfied standards.'}
                </p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedFindingId === finding.id;
                const isAi = finding.source === 'AI_CONTEXTUAL';

                const borderAccent = isAi
                  ? 'var(--color-lavender)'
                  : finding.severity === 'critical'
                  ? 'var(--color-coral)'
                  : 'var(--color-warm-peach)';

                return (
                  <div
                    key={finding.id}
                    onClick={() => setSelectedFindingId(finding.id)}
                    style={{
                      padding: '16px',
                      backgroundColor: isSelected ? 'var(--color-sand)' : 'var(--color-soft-white)',
                      border: `1px solid ${isSelected ? 'var(--color-deep-teal)' : 'var(--color-sand-dark)'}`,
                      borderLeft: `4px solid ${borderAccent}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 140ms ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Header Badges with explicit Source tag */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isAi ? (
                          <span className="badge badge-info" style={{ backgroundColor: 'rgba(199, 184, 255, 0.35)', color: 'var(--color-midnight-ink)' }}>
                            <Sparkles size={11} /> AI Contextual
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ backgroundColor: 'var(--color-sand-dark)', color: 'var(--color-midnight-ink)' }}>
                            <Cpu size={11} /> Deterministic
                          </span>
                        )}

                        <SeverityBadge severity={finding.severity} />

                        <span className="text-mono" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-deep-teal)' }}>
                          {finding.ruleId}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <EvidenceBadge status={finding.evidenceStatus} />
                        {finding.status === 'REVIEW_REQUIRED' && (
                          <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                            <HelpCircle size={10} /> Review Req.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rule or Finding Title */}
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)', marginTop: '2px' }}>
                      {finding.ruleName}
                    </h3>

                    {/* Matched Excerpt */}
                    {finding.triggerText && (
                      <div style={{ fontSize: '12.5px', backgroundColor: 'var(--color-sand-muted)', padding: '6px 10px', borderRadius: '4px' }}>
                        <span className="text-muted">Excerpt: </span>
                        <strong style={{ color: finding.severity === 'critical' ? 'var(--color-coral)' : 'var(--color-midnight-ink)' }}>
                          "{finding.triggerText}"
                        </strong>
                        {finding.startIndex !== undefined && finding.endIndex !== undefined && finding.startIndex < finding.endIndex && (
                          <span className="text-mono text-muted" style={{ fontSize: '11px', marginLeft: '6px' }}>
                            [chars {finding.startIndex}–{finding.endIndex}]
                          </span>
                        )}
                      </div>
                    )}

                    {/* Grounded Explanation */}
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                      {finding.explanation}
                    </p>

                    {/* Reasoning Summary if AI */}
                    {finding.reasoningSummary && (
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)', borderLeft: '2px solid var(--color-lavender)', paddingLeft: '8px' }}>
                        Reasoning: {finding.reasoningSummary}
                      </p>
                    )}

                    {/* Suggested Action */}
                    {(finding.suggestedAction || finding.suggestionText) && (
                      <div style={{
                        marginTop: '4px',
                        padding: '8px 10px',
                        backgroundColor: isAi ? 'rgba(199, 184, 255, 0.15)' : 'rgba(0, 229, 168, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        borderLeft: `2px solid ${isAi ? 'var(--color-lavender)' : 'var(--color-mint)'}`
                      }}>
                        <strong style={{ color: isAi ? 'var(--color-midnight-ink)' : 'var(--color-deep-teal)' }}>
                          Recommended Action:
                        </strong>{' '}
                        <span>{finding.suggestedAction || finding.suggestionText}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      {isAiConfigModalOpen && (
        <AiSettingsModal
          isOpen={isAiConfigModalOpen}
          onClose={() => setIsAiConfigModalOpen(false)}
          onConfigSaved={(newCfg) => {
            setIsAiConfigured(!!(newCfg.isEnabled && newCfg.apiKey));
            if (aiStatus === 'unavailable' && newCfg.apiKey) {
              setAiStatus('idle');
              setAiErrorMessage(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default AnalysisResultsPage;
