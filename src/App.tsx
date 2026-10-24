import React, { useState, useEffect } from 'react';
import type {
  PageId,
  PersonaRole,
  ContentVersion,
  AuditEvent,
  Finding,
  BrandProfile,
  SubmittedContent,
  ContentEvaluationResult,
  ApprovalDecisionRecord
} from './types';
import {
  INITIAL_DOCUMENTS
} from './data/mockData';
import { storageService } from './services/storageService';
import { contentService } from './services/contentService';
import { governanceEngine } from './services/governanceEngine';
import { approvalService } from './services/approvalService.ts';
import { auditService } from './services/auditService.ts';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { BrandDnaPage } from './pages/BrandDnaPage';
import { NewReviewPage } from './pages/NewReviewPage';
import { AnalysisResultsPage } from './pages/AnalysisResultsPage';
import { FixComparePage } from './pages/FixComparePage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { AuditReportsPage } from './pages/AuditReportsPage';
import { BrandProfileModal } from './components/brand/BrandProfileModal';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [currentRole, setCurrentRole] = useState<PersonaRole>('brand_manager');
  const [isAiDegraded, setIsAiDegraded] = useState<boolean>(false);

  // Persistent Brand Profiles & Active Profile state
  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>(() =>
    storageService.loadBrandProfiles()
  );
  const [activeProfileId, setActiveProfileId] = useState<string>(() =>
    storageService.getActiveProfileId()
  );

  const [documents, setDocuments] = useState<ContentVersion[]>(INITIAL_DOCUMENTS);
  const [savedSubmissions, setSavedSubmissions] = useState<SubmittedContent[]>(() =>
    contentService.loadAllSubmissions()
  );
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() =>
    auditService.loadAuditEvents()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);

  // Ensure active profile is always resolved
  const activeProfile =
    brandProfiles.find((p) => p.id === activeProfileId) ||
    brandProfiles[0] ||
    storageService.resetToDefaultSeed()[0];

  const [selectedDocId, setSelectedDocId] = useState<string>(() => INITIAL_DOCUMENTS[0]?.id || 'doc-001');
  const rules = activeProfile.rules || [];
  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Synchronize active profile changes with localStorage
  useEffect(() => {
    storageService.setActiveProfileId(activeProfile.id);
  }, [activeProfile.id]);

  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    storageService.setActiveProfileId(id);
    const selected = brandProfiles.find((p) => p.id === id);
    if (selected) {
      showToast(`Switched active brand governance profile to "${selected.name}".`);
    }
  };

  const handleCreateProfile = (data: Partial<BrandProfile>) => {
    const newId = `brand-${Date.now()}`;
    const newProfile: BrandProfile = {
      id: newId,
      name: data.name || 'Untitled Brand',
      version: 'v1.0',
      description: data.description || 'Custom brand governance profile.',
      industry: data.industry,
      voiceGuidelines: data.voiceGuidelines || [],
      requiredPhrases: data.requiredPhrases || [],
      prohibitedPhrases: data.prohibitedPhrases || [],
      disclosures: data.disclosures || [],
      visualGuidelines: data.visualGuidelines || [],
      rules: [],
      evidenceRecords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: [
        {
          version: 'v1.0',
          timestamp: new Date().toISOString(),
          modifiedBy: currentRole === 'brand_manager' ? 'Brand Manager' : 'Administrator',
          summary: `Created brand governance profile for ${data.name}.`,
          ruleCount: 0
        }
      ]
    };

    const updatedList = [...brandProfiles, newProfile];
    setBrandProfiles(updatedList);
    storageService.saveBrandProfiles(updatedList);
    setActiveProfileId(newId);

    const auditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'PROFILE_CREATED',
      documentTitle: newProfile.name,
      contentVersion: newProfile.version,
      contentHash: 'N/A',
      ruleVersion: newProfile.version,
      actorName: currentRole === 'brand_manager' ? 'Brand Manager' : 'Administrator',
      actorRole: currentRole,
      summary: `Created new brand governance profile "${newProfile.name}" (${newProfile.version}).`
    };
    setAuditLogs((prev) => [auditEvent, ...prev]);
    showToast(`Brand profile "${newProfile.name}" created.`);
  };

  const handleUpdateProfile = (
    updatedProfile: BrandProfile,
    versionChangeSummary?: string
  ) => {
    // Check if rules were added, modified or deleted, requiring version bump
    const previousRuleCount = activeProfile.rules.length;
    const newRuleCount = updatedProfile.rules.length;
    const rulesChanged =
      versionChangeSummary &&
      (previousRuleCount !== newRuleCount ||
        JSON.stringify(activeProfile.rules) !== JSON.stringify(updatedProfile.rules));

    let finalProfile = updatedProfile;

    if (rulesChanged) {
      const nextVersion = storageService.bumpVersion(activeProfile.version, false);
      const newHistoryEntry = {
        version: nextVersion,
        timestamp: new Date().toISOString(),
        modifiedBy: currentRole === 'brand_manager' ? 'Brand Manager' : 'Administrator',
        summary: versionChangeSummary || `Updated brand rules for ${updatedProfile.name}.`,
        ruleCount: newRuleCount
      };

      finalProfile = {
        ...updatedProfile,
        version: nextVersion,
        versionHistory: [...(updatedProfile.versionHistory || []), newHistoryEntry]
      };
    }

    const updatedList = brandProfiles.map((p) =>
      p.id === finalProfile.id ? finalProfile : p
    );

    setBrandProfiles(updatedList);
    storageService.saveBrandProfiles(updatedList);

    const auditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: rulesChanged ? 'VERSION_INCREMENTED' : 'PROFILE_UPDATED',
      documentTitle: finalProfile.name,
      contentVersion: finalProfile.version,
      contentHash: 'N/A',
      ruleVersion: finalProfile.version,
      actorName: currentRole === 'brand_manager' ? 'Brand Manager' : 'Administrator',
      actorRole: currentRole,
      summary: versionChangeSummary || `Updated profile ${finalProfile.name} to ${finalProfile.version}.`
    };
    setAuditLogs((prev) => [auditEvent, ...prev]);
  };

  const handleResetSeed = () => {
    const seed = storageService.resetToDefaultSeed();
    setBrandProfiles(seed);
    setActiveProfileId(seed[0].id);

    const auditEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'PROFILE_UPDATED',
      documentTitle: seed[0].name,
      contentVersion: seed[0].version,
      contentHash: 'N/A',
      ruleVersion: seed[0].version,
      actorName: 'Administrator',
      actorRole: currentRole,
      summary: 'Restored brand governance profile back to standard baseline.'
    };
    setAuditLogs((prev) => [auditEvent, ...prev]);
  };

  const handleScanSubmitted = (
    title: string,
    channel: string,
    text: string,
    submittedRecord?: SubmittedContent
  ) => {
    // Use hash and version from submittedRecord if available, else pseudoHash
    const contentHash =
      submittedRecord?.contentHash ||
      Array.from(text)
        .reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0)
        .toString(16)
        .padStart(64, 'a')
        .slice(0, 64);

    const versionNumber = submittedRecord?.versionNumber || 'v1.0';
    const ruleVersionRef = submittedRecord?.ruleVersionRef || activeProfile.version;

    const candidateDoc: ContentVersion = {
      id: submittedRecord ? `doc-${submittedRecord.id}` : `doc-${Date.now()}`,
      versionNumber,
      contentHash,
      title: title || 'Draft Review',
      channel,
      text,
      timestamp: new Date().toISOString(),
      author: 'Content Creator',
      isApproved: false,
      findings: [],
      brandProfileId: submittedRecord?.brandProfileId || activeProfile.id,
      brandProfileName: submittedRecord?.brandProfileName || activeProfile.name,
      ruleVersionRef,
      contentType: submittedRecord?.contentType,
      submittedContentId: submittedRecord?.id
    };

    // Evaluate using deterministic governance engine
    const evalResult = governanceEngine.evaluateContent(candidateDoc, activeProfile);

    const newDoc: ContentVersion = {
      ...candidateDoc,
      findings: evalResult.findings
    };

    setDocuments([newDoc]);
    setSavedSubmissions(contentService.loadAllSubmissions());

    const submitEventPromise = auditService.recordAuditEvent({
      eventType: 'CONTENT_SUBMITTED',
      outcome: 'SUCCESS',
      brandId: activeProfile.id,
      brandName: activeProfile.name,
      contentId: submittedRecord?.id || candidateDoc.id,
      documentTitle: newDoc.title,
      contentVersion: newDoc.versionNumber,
      contentVersionId: candidateDoc.id,
      contentHash: newDoc.contentHash,
      ruleVersion: ruleVersionRef,
      actorName: 'Content Creator',
      actorRole: 'creator',
      summary: submittedRecord
        ? `Ingested content "${newDoc.title}" (${submittedRecord.contentType}, ${submittedRecord.characterCount} chars) under brand "${submittedRecord.brandProfileName}" (${ruleVersionRef}). Unique Content ID: ${submittedRecord.id}.`
        : `Document "${newDoc.title}" submitted for pre-publication evaluation against ${activeProfile.name} (${activeProfile.version}).`
    });

    const scanEventPromise = auditService.recordAuditEvent({
      eventType: 'GOVERNANCE_EVALUATION_COMPLETED',
      outcome: evalResult.summary.criticalCount > 0 ? 'BLOCKED' : evalResult.summary.warningCount > 0 ? 'WARNING' : 'SUCCESS',
      brandId: activeProfile.id,
      brandName: activeProfile.name,
      contentId: submittedRecord?.id || candidateDoc.id,
      documentTitle: newDoc.title,
      contentVersion: newDoc.versionNumber,
      contentVersionId: candidateDoc.id,
      contentHash: newDoc.contentHash,
      ruleVersion: ruleVersionRef,
      evaluationRunId: evalResult.id,
      actorName: 'BrandGuard Deterministic Engine',
      actorRole: 'admin',
      summary: `Deterministic scan against ${activeProfile.name} ${ruleVersionRef}: ${evalResult.summary.criticalCount} Critical, ${evalResult.summary.warningCount} Warnings, ${evalResult.summary.reviewRequiredCount} Review Required. Result: ${evalResult.overallStatus}.`,
      payload: {
        criticalCount: evalResult.summary.criticalCount,
        warningCount: evalResult.summary.warningCount,
        infoCount: evalResult.summary.infoCount,
        overallStatus: evalResult.overallStatus,
        unverifiedEvidenceCount: evalResult.findings.filter((f) => f.evidenceStatus === 'unverified').length,
        verifiedEvidenceCount: evalResult.findings.filter((f) => f.evidenceStatus === 'verified').length,
        naEvidenceCount: evalResult.findings.filter((f) => f.evidenceStatus === 'na').length,
        triggeredRules: evalResult.findings.map((f) => ({
          ruleId: f.ruleId,
          ruleName: f.ruleName,
          category: f.category
        }))
      }
    });

    Promise.all([scanEventPromise, submitEventPromise]).then(([scanEvent, submitEvent]) => {
      setAuditLogs((prev) => [scanEvent, submitEvent, ...prev]);
    });
    showToast(`Deterministic evaluation complete: ${evalResult.overallStatus} for "${newDoc.title}".`);
  };

  const handleReopenSubmission = (submission: SubmittedContent) => {
    // Switch active profile if brand matches
    const matchingBrand = brandProfiles.find((b) => b.id === submission.brandProfileId);
    if (matchingBrand && matchingBrand.id !== activeProfileId) {
      setActiveProfileId(matchingBrand.id);
    }

    handleScanSubmitted(
      submission.title,
      submission.contentType,
      submission.rawText,
      submission
    );
    setCurrentPage('results');
    showToast(`Reopened saved submission "${submission.title}" (${submission.versionNumber}). Preserved verbatim.`);
  };

  const handleRevisionSavedAndRechecked = (
    newDoc: ContentVersion,
    evalResult: ContentEvaluationResult,
    savedSubmission?: SubmittedContent
  ) => {
    // Preserve immutable history: set new revision as active while retaining prior documents
    setDocuments([newDoc, ...documents.filter((d) => d.versionNumber !== newDoc.versionNumber)]);

    if (savedSubmission) {
      setSavedSubmissions(contentService.loadAllSubmissions());
    }

    const recheckEventPromise = auditService.recordAuditEvent({
      eventType: 'REVISION_SAVED',
      outcome: 'SUCCESS',
      brandId: activeProfile.id,
      brandName: activeProfile.name,
      contentId: newDoc.submittedContentId || newDoc.id,
      documentTitle: newDoc.title,
      contentVersion: newDoc.versionNumber,
      contentVersionId: newDoc.id,
      contentHash: newDoc.contentHash,
      ruleVersion: activeProfile.version,
      actorName: 'Content Creator',
      actorRole: 'creator',
      summary: `Surgical corrections applied. Minted revision ${newDoc.versionNumber}. Remaining violations: ${evalResult.findings.length}.`
    });

    const scanEventPromise = auditService.recordAuditEvent({
      eventType: 'GOVERNANCE_EVALUATION_COMPLETED',
      outcome: evalResult.summary.criticalCount > 0 ? 'BLOCKED' : evalResult.summary.warningCount > 0 ? 'WARNING' : 'SUCCESS',
      brandId: activeProfile.id,
      brandName: activeProfile.name,
      contentId: newDoc.submittedContentId || newDoc.id,
      documentTitle: newDoc.title,
      contentVersion: newDoc.versionNumber,
      contentVersionId: newDoc.id,
      contentHash: newDoc.contentHash,
      ruleVersion: activeProfile.version,
      evaluationRunId: evalResult.id,
      actorName: 'BrandGuard Deterministic Engine',
      actorRole: 'admin',
      summary: `Deterministic recheck of revision ${newDoc.versionNumber} against ${activeProfile.name} (${activeProfile.version}): ${evalResult.overallStatus}. Critical: ${evalResult.summary.criticalCount}, Warnings: ${evalResult.summary.warningCount}.`,
      payload: {
        criticalCount: evalResult.summary.criticalCount,
        warningCount: evalResult.summary.warningCount,
        infoCount: evalResult.summary.infoCount,
        overallStatus: evalResult.overallStatus,
        unverifiedEvidenceCount: evalResult.findings.filter((f) => f.evidenceStatus === 'unverified').length,
        verifiedEvidenceCount: evalResult.findings.filter((f) => f.evidenceStatus === 'verified').length,
        naEvidenceCount: evalResult.findings.filter((f) => f.evidenceStatus === 'na').length,
        triggeredRules: evalResult.findings.map((f) => ({
          ruleId: f.ruleId,
          ruleName: f.ruleName,
          category: f.category
        }))
      }
    });

    Promise.all([scanEventPromise, recheckEventPromise]).then(([scanEvent, recheckEvent]) => {
      setAuditLogs((prev) => [scanEvent, recheckEvent, ...prev]);
    });
  };

  const handleRecheckCompleted = (
    newVersionNumber: string,
    updatedText: string,
    updatedFindings: Finding[]
  ) => {
    const updatedPseudoHash = Array.from(updatedText)
      .reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0)
      .toString(16)
      .padStart(64, 'b')
      .slice(0, 64);

    const updatedDoc: ContentVersion = {
      ...activeDoc,
      versionNumber: newVersionNumber,
      contentHash: updatedPseudoHash,
      text: updatedText,
      findings: updatedFindings,
      isApproved: false
    };

    setDocuments([updatedDoc]);

    const recheckEvent: AuditEvent = {
      id: `aud-${Date.now()}-rec`,
      timestamp: new Date().toISOString(),
      eventType: 'CORRECTION_APPLIED',
      documentTitle: updatedDoc.title,
      contentVersion: updatedDoc.versionNumber,
      contentHash: updatedDoc.contentHash,
      ruleVersion: activeProfile.version,
      actorName: 'Content Creator',
      actorRole: 'creator',
      summary: `Surgical corrections applied. Minted revision ${newVersionNumber}. Remaining violations: ${updatedFindings.length}.`
    };

    setAuditLogs((prev) => [recheckEvent, ...prev]);
  };

  const handleApprove = (justification: string) => {
    if (!activeDoc) return;

    const approvedDoc: ContentVersion = {
      ...activeDoc,
      isApproved: true,
      approvalRecord: {
        id: `app-${Date.now()}`,
        contentVersionId: activeDoc.id,
        contentHash: activeDoc.contentHash,
        ruleVersion: activeProfile.version,
        status: 'approved',
        reviewerName: currentRole === 'approver' ? 'J. Doe (Lead Approver)' : 'System Administrator',
        reviewerRole: currentRole,
        justification,
        timestamp: new Date().toISOString()
      }
    };

    setDocuments([approvedDoc]);

    const approvalEvent: AuditEvent = {
      id: `aud-${Date.now()}-app`,
      timestamp: new Date().toISOString(),
      eventType: 'APPROVED',
      documentTitle: approvedDoc.title,
      contentVersion: approvedDoc.versionNumber,
      contentHash: approvedDoc.contentHash,
      ruleVersion: activeProfile.version,
      actorName: currentRole === 'approver' ? 'J. Doe (Lead Approver)' : 'System Administrator',
      actorRole: currentRole,
      summary: `Formally approved for publication against ruleset ${activeProfile.version}. Attestation: "${justification}"`
    };

    setAuditLogs((prev) => [approvalEvent, ...prev]);
  };

  const handleRequestRevisions = (comments: string) => {
    if (!activeDoc) return;

    const revisionEvent: AuditEvent = {
      id: `aud-${Date.now()}-rev`,
      timestamp: new Date().toISOString(),
      eventType: 'CHANGES_REQUESTED',
      documentTitle: activeDoc.title,
      contentVersion: activeDoc.versionNumber,
      contentHash: activeDoc.contentHash,
      ruleVersion: activeProfile.version,
      actorName: 'Lead Approver',
      actorRole: currentRole,
      summary: `Revisions requested: "${comments}"`
    };

    setAuditLogs((prev) => [revisionEvent, ...prev]);
  };

  const handleDecisionRecorded = (decision: ApprovalDecisionRecord) => {
    const eventType =
      decision.decision === 'APPROVED'
        ? decision.isException
          ? ('EXCEPTION_RECORDED' as const)
          : ('APPROVAL_GRANTED' as const)
        : decision.decision === 'REJECTED'
        ? ('REJECTION_RECORDED' as const)
        : ('CHANGES_REQUESTED' as const);

    const outcome =
      decision.decision === 'APPROVED'
        ? decision.isException
          ? ('WARNING' as const)
          : ('SUCCESS' as const)
        : decision.decision === 'REJECTED'
        ? ('BLOCKED' as const)
        : ('WARNING' as const);

    auditService
      .recordAuditEvent({
        eventType,
        outcome,
        brandId: decision.brandId,
        brandName: decision.brandName,
        contentId: decision.contentId,
        documentTitle: decision.contentTitle,
        contentVersion: decision.versionNumber,
        contentVersionId: decision.contentVersionId,
        contentHash: decision.contentHash,
        ruleVersion: decision.ruleVersionRef,
        decisionId: decision.id,
        parentVersionNumber: decision.parentVersionNumber,
        actorName: decision.reviewerName,
        actorRole: decision.reviewerRole,
        summary: `Formal governance decision [${decision.decision}] recorded for ${decision.versionNumber} (hash: ${decision.contentHash.substring(0, 16)}...). ${decision.isException ? `Exception Overrule: "${decision.exceptionJustification}"` : decision.reason ? `Reason: "${decision.reason}"` : ''}`,
        payload: {
          decision: decision.decision,
          isException: decision.isException,
          exceptionJustification: decision.exceptionJustification,
          reason: decision.reason,
          blockingFindingsCount: decision.blockingFindingsCount,
          totalFindingsCount: decision.totalFindingsCount,
          evaluationStatus: decision.evaluationStatus
        }
      })
      .then((created) => {
        setAuditLogs((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
      });
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      currentRole={currentRole}
      onRoleChange={setCurrentRole}
      isAiDegraded={isAiDegraded}
      onToggleAiDegraded={() => {
        setIsAiDegraded(!isAiDegraded);
        showToast(`AI Engine ${!isAiDegraded ? 'simulated as Offline' : 'restored to Dual Active'}.`);
      }}
      activeProfile={activeProfile}
      allProfiles={brandProfiles}
      onSelectProfile={handleSelectProfile}
      onCreateProfileClick={() => setIsNewProfileModalOpen(true)}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage
          documents={documents}
          rules={rules}
          auditLogs={auditLogs}
          onNavigate={setCurrentPage}
          savedSubmissions={savedSubmissions}
          onReopenSubmission={handleReopenSubmission}
          onSelectDocToReview={(doc) => {
            setSelectedDocId(doc.id);
            setCurrentPage('results');
          }}
          onSelectDocToFix={(doc) => {
            setSelectedDocId(doc.id);
            setCurrentPage('fix_compare');
          }}
          onSelectDocToApprove={(doc) => {
            setSelectedDocId(doc.id);
            setCurrentPage('approvals');
          }}
          currentRole={currentRole}
          onRoleChange={(newRole) => {
            setCurrentRole(newRole);
            const roleLabels: Record<string, string> = {
              creator: 'Content Creator',
              brand_manager: 'Brand Manager',
              approver: 'Compliance Approver',
              admin: 'System Administrator'
            };
            showToast(`Switched active persona to ${roleLabels[newRole] || newRole}.`);
          }}
          activeProfile={activeProfile}
          allProfiles={brandProfiles}
          onSelectProfile={handleSelectProfile}
          isAiDegraded={isAiDegraded}
          onToggleAiDegraded={() => {
            setIsAiDegraded(!isAiDegraded);
            showToast(`AI Engine ${!isAiDegraded ? 'simulated as Offline (Deterministic fallback)' : 'restored to Dual Active (Gemini)'}.`);
          }}
        />
      )}

      {currentPage === 'brand_dna' && (
        <BrandDnaPage
          brandProfile={activeProfile}
          allProfiles={brandProfiles}
          onUpdateProfile={handleUpdateProfile}
          onResetSeed={handleResetSeed}
          onShowToast={showToast}
          currentRole={currentRole}
        />
      )}

      {currentPage === 'new_review' && (
        <NewReviewPage
          allProfiles={brandProfiles}
          activeProfile={activeProfile}
          onSelectProfile={handleSelectProfile}
          onScanSubmitted={handleScanSubmitted}
          onNavigate={setCurrentPage}
          isAiDegraded={isAiDegraded}
          onShowToast={showToast}
          currentRole={currentRole}
        />
      )}

      {currentPage === 'results' && activeDoc && (
        <AnalysisResultsPage
          document={activeDoc}
          onNavigate={setCurrentPage}
          isAiDegraded={isAiDegraded}
          brandProfile={activeProfile}
        />
      )}

      {currentPage === 'fix_compare' && activeDoc && (
        <FixComparePage
          originalDocument={activeDoc}
          brandProfile={activeProfile}
          isAiDegraded={isAiDegraded}
          onRevisionSavedAndRechecked={handleRevisionSavedAndRechecked}
          onRecheckCompleted={handleRecheckCompleted}
          onNavigate={setCurrentPage}
          onShowToast={showToast}
        />
      )}

      {currentPage === 'approvals' && (
        <ApprovalQueuePage
          document={activeDoc}
          allSubmissions={savedSubmissions}
          brandProfiles={brandProfiles}
          currentRole={currentRole}
          onApprove={handleApprove}
          onRequestRevisions={handleRequestRevisions}
          onDecisionRecorded={handleDecisionRecorded}
          onNavigate={setCurrentPage}
          onShowToast={showToast}
        />
      )}

      {currentPage === 'audit' && (
        <AuditReportsPage
          auditLogs={auditLogs}
          brandProfiles={brandProfiles}
          savedSubmissions={savedSubmissions}
          decisions={approvalService.loadAllDecisions()}
          activeProfile={activeProfile}
          currentRole={currentRole}
          onNavigate={setCurrentPage}
          onShowToast={showToast}
        />
      )}

      {/* Modal for Creating New Brand Profile from Topbar */}
      {isNewProfileModalOpen && (
        <BrandProfileModal
          isOpen={isNewProfileModalOpen}
          onClose={() => setIsNewProfileModalOpen(false)}
          onSave={handleCreateProfile}
          allProfiles={brandProfiles}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className="toast">
            <CheckCircle2 size={16} color="var(--color-mint)" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default App;
