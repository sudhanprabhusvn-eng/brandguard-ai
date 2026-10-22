import React, { useState } from 'react';
import type { PageId, BrandProfile, ContentType, SubmittedContent, FileMetadata } from '../types';
import { DEMO_TEST_COPY, DEMO_COMPLIANT_COPY } from '../data/mockData';
import { storageService } from '../services/storageService';
import {
  contentService,
  INGESTION_LIMITS,
  CONTENT_TYPE_OPTIONS,
  STORAGE_DISCLOSURE,
  validateFileMetadata,
  validateSubmissionInput,
  containsBinaryOrControlChars,
  normalizeNewlines
} from '../services/contentService';
import {
  Upload,
  Zap,
  Sparkles,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Copy,
  Check,
  ArrowLeft,
  History,
  Trash2,
  FileCheck,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface NewReviewPageProps {
  allProfiles?: BrandProfile[];
  activeProfile?: BrandProfile;
  onSelectProfile?: (id: string) => void;
  onScanSubmitted: (title: string, channel: string, text: string, record?: SubmittedContent) => void;
  onNavigate: (page: PageId) => void;
  isAiDegraded: boolean;
  onShowToast?: (message: string) => void;
}

export const NewReviewPage: React.FC<NewReviewPageProps> = ({
  allProfiles: propProfiles,
  activeProfile: propActiveProfile,
  onSelectProfile,
  onScanSubmitted,
  onNavigate,
  isAiDegraded,
  onShowToast
}) => {
  // Brand profiles fallback
  const allProfiles = propProfiles || storageService.loadBrandProfiles();
  const defaultProfile =
    propActiveProfile ||
    allProfiles.find((p) => p.id === storageService.getActiveProfileId()) ||
    allProfiles[0];

  const [selectedBrandId, setSelectedBrandId] = useState<string>(defaultProfile?.id || '');
  const [title, setTitle] = useState<string>('Q4 Product Launch Teaser');
  const [contentType, setContentType] = useState<ContentType>('social_post');
  const [text, setText] = useState<string>(DEMO_TEST_COPY);
  const [uploadedFile, setUploadedFile] = useState<FileMetadata | null>(null);

  // Interaction and UI states
  const [dragOver, setDragOver] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PageId | null>(null);
  const [savedSubmissions, setSavedSubmissions] = useState<SubmittedContent[]>(() =>
    contentService.loadAllSubmissions()
  );
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [lastSubmittedRecord, setLastSubmittedRecord] = useState<SubmittedContent | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);


  const currentBrand = allProfiles.find((p) => p.id === selectedBrandId) || defaultProfile;
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isOverLimit = charCount > INGESTION_LIMITS.MAX_CONTENT_CHARS;
  const isDirty = text !== DEMO_TEST_COPY || title !== 'Q4 Product Launch Teaser' || uploadedFile !== null;

  // Real-time pre-submission validation feedback
  const runValidationCheck = () => {
    const res = validateSubmissionInput(title, selectedBrandId, contentType, text);
    setValidationErrors(res.errors);
    setValidationWarnings(res.warnings);
    return res.isValid;
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    if (onSelectProfile) {
      onSelectProfile(brandId);
    }
    if (validationErrors.brandProfileId) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.brandProfileId;
        return next;
      });
    }
  };

  // Safe file ingestion
  const processUploadedFile = (file: File) => {
    // 1. Metadata check (extension, size, MIME type)
    const metaCheck = validateFileMetadata(file);
    if (!metaCheck.isValid) {
      setValidationErrors((prev) => ({
        ...prev,
        file: metaCheck.error || 'Invalid file.'
      }));
      return;
    }

    setIsReadingFile(true);
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });

    const reader = new FileReader();

    reader.onerror = () => {
      setIsReadingFile(false);
      setValidationErrors((prev) => ({
        ...prev,
        file: 'Failed to read file from disk. The file may be corrupt or inaccessible.'
      }));
    };

    reader.onload = (e) => {
      setIsReadingFile(false);
      const rawContent = e.target?.result;
      if (typeof rawContent !== 'string') {
        setValidationErrors((prev) => ({
          ...prev,
          file: 'File decoding error. Could not extract valid text.'
        }));
        return;
      }

      // Check for binary corruption / null bytes
      if (containsBinaryOrControlChars(rawContent)) {
        setValidationErrors((prev) => ({
          ...prev,
          file: 'File appears to be binary or contains corrupted non-text bytes. Please upload valid plain text (.txt) or Markdown (.md).'
        }));
        return;
      }

      // Safely normalise newlines (\r\n -> \n) without altering marketing content
      const normalized = normalizeNewlines(rawContent);

      if (!normalized.trim()) {
        setValidationErrors((prev) => ({
          ...prev,
          file: 'The uploaded file contains only empty whitespace.'
        }));
        return;
      }

      setText(normalized);
      // Auto-set title from filename if currently default or empty
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.substring(0, INGESTION_LIMITS.MAX_TITLE_LENGTH));

      const fileMeta: FileMetadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.name.endsWith('.md') ? 'text/markdown' : 'text/plain',
        encoding: 'UTF-8',
        importedAt: new Date().toISOString()
      };
      setUploadedFile(fileMeta);

      if (onShowToast) {
        onShowToast(`Imported "${file.name}" (${(file.size / 1024).toFixed(1)} KB, ${normalized.length} characters).`);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleClearContent = () => {
    if (text.length > 50) {
      if (window.confirm('Clear all editor content and reset file attachment?')) {
        setText('');
        setUploadedFile(null);
      }
    } else {
      setText('');
      setUploadedFile(null);
    }
  };

  const handleRemoveFileAttachment = () => {
    setUploadedFile(null);
    if (onShowToast) {
      onShowToast('Removed file attachment. Editor text preserved.');
    }
  };

  // Safe submission flow
  const handleSubmit = async () => {
    const isValid = runValidationCheck();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const res = await contentService.createSubmissionRecord({
        title,
        brandProfileId: currentBrand.id,
        brandProfileName: currentBrand.name,
        ruleVersionRef: currentBrand.version,
        contentType,
        rawText: text,
        fileMetadata: uploadedFile || undefined
      });

      setIsSubmitting(false);

      if (!res.success || !res.record) {
        setValidationErrors((prev) => ({
          ...prev,
          storage: res.error || 'Failed to save content record to storage.'
        }));
        return;
      }

      // Refresh saved submissions list
      const updatedList = contentService.loadAllSubmissions();
      setSavedSubmissions(updatedList);
      setLastSubmittedRecord(res.record);
      setIsSuccessModalOpen(true);

      if (onShowToast) {
        onShowToast(`Content successfully ingested! Assigned ID ${res.record.id}`);
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during ingestion.';
      setValidationErrors((prev) => ({
        ...prev,
        storage: `Storage Failure: ${msg}`
      }));
    }
  };

  // Reopen a saved submission to verify preservation
  const handleReopenSubmission = (item: SubmittedContent) => {
    setTitle(item.title);
    setSelectedBrandId(item.brandProfileId);
    setContentType(item.contentType);
    setText(item.rawText);
    setUploadedFile(item.fileMetadata || null);
    setShowHistoryDrawer(false);
    setValidationErrors({});
    if (onShowToast) {
      onShowToast(`Reopened saved submission "${item.title}" (${item.versionNumber}, ${item.characterCount} chars).`);
    }
  };

  // Handle navigation with unsaved changes confirmation
  const handleAttemptNavigate = (page: PageId) => {
    if (isDirty && !isSuccessModalOpen) {
      setPendingNavigation(page);
      setShowUnsavedWarning(true);
    } else {
      onNavigate(page);
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedWarning(false);
    if (pendingNavigation) {
      onNavigate(pendingNavigation);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const channelLabel =
    CONTENT_TYPE_OPTIONS.find((c) => c.id === contentType)?.label || 'General Marketing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1020px', margin: '0 auto', position: 'relative' }}>
      {/* Top Header & Navigation Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <button
              onClick={() => handleAttemptNavigate('dashboard')}
              className="btn btn-secondary btn-sm"
              title="Return to Dashboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </button>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>•</span>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Content Review
            </span>
          </div>
          <h1 className="title-display">New Content Review</h1>
          <p className="text-muted" style={{ marginTop: '4px', fontSize: '14px' }}>
            Submit marketing copy to evaluate conformance against approved brand rules, empirical claim evidence, and voice guidelines.
          </p>
        </div>

        {/* History / Saved Submissions Toggle */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
            title="View previously ingested content records"
          >
            <History size={15} />
            <span>Saved Submissions ({savedSubmissions.length})</span>
          </button>
        </div>
      </div>

      {/* Persistence Disclosure Banner */}
      <div style={{
        backgroundColor: 'var(--color-sand)',
        border: '1px solid var(--color-sand-dark)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <FolderOpen size={16} color="var(--color-deep-teal)" />
        <span>
          <strong>Storage Disclosure:</strong> {STORAGE_DISCLOSURE} Records are preserved in browser storage with SHA-256 fingerprinting.
        </span>
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
            <strong>AI Contextual Engine Simulated as Offline:</strong> Content will ingest normally and scan using deterministic rules only.
          </div>
        </div>
      )}

      {/* Validation Error Banner (Non-color-alone accessible alert) */}
      {Object.keys(validationErrors).length > 0 && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--state-critical-bg)',
            border: '1px solid var(--state-critical-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            animation: 'fadeIn 180ms ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--state-critical-text)', fontWeight: 600, fontSize: '14px' }}>
            <AlertTriangle size={18} />
            <span>Submission Blocked — Please Resolve {Object.keys(validationErrors).length} Issue{Object.keys(validationErrors).length > 1 ? 's' : ''}:</span>
          </div>
          <ul style={{ paddingLeft: '26px', fontSize: '13px', color: 'var(--state-critical-text)', margin: '4px 0 0' }}>
            {Object.entries(validationErrors).map(([field, err]) => (
              <li key={field}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Metadata Configuration Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-midnight-ink)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          1. Brand Policy & Document Identification
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Brand Profile Selector (Dynamically populated from real saved brand profiles!) */}
          <div>
            <label htmlFor="brand-profile-select" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <span>Target Brand Profile *</span>
              <span className="text-muted" style={{ fontSize: '11px', fontWeight: 400 }}>
                Active: {currentBrand.name} ({currentBrand.version})
              </span>
            </label>
            <select
              id="brand-profile-select"
              value={selectedBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="form-select"
              style={{
                borderColor: validationErrors.brandProfileId ? 'var(--color-coral)' : undefined
              }}
              aria-invalid={!!validationErrors.brandProfileId}
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.version}) — {p.rules.length} Active Rules
                </option>
              ))}
            </select>
            {validationErrors.brandProfileId && (
              <span style={{ fontSize: '12px', color: 'var(--color-coral)', marginTop: '4px', display: 'block' }}>
                {validationErrors.brandProfileId}
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
              Ruleset baseline captured at ingestion: <strong>{currentBrand.version}</strong> ({currentBrand.rules.length} governance rules)
            </span>
          </div>

          {/* Document Title Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="content-title-input" style={{ fontSize: '13px', fontWeight: 600 }}>
                Content Title *
              </label>
              <span style={{
                fontSize: '11px',
                color: title.length > INGESTION_LIMITS.MAX_TITLE_LENGTH ? 'var(--color-coral)' : 'var(--color-text-muted)'
              }}>
                {title.length}/{INGESTION_LIMITS.MAX_TITLE_LENGTH}
              </span>
            </div>
            <input
              id="content-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationErrors.title) {
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.title;
                    return next;
                  });
                }
              }}
              placeholder="e.g. Q4 Promotional Announcement"
              className="form-input"
              style={{
                borderColor: validationErrors.title ? 'var(--color-coral)' : undefined
              }}
              aria-invalid={!!validationErrors.title}
            />
            {validationErrors.title && (
              <span style={{ fontSize: '12px', color: 'var(--color-coral)', marginTop: '4px', display: 'block' }}>
                {validationErrors.title}
              </span>
            )}
          </div>

          {/* Content Type Selector */}
          <div>
            <label htmlFor="content-type-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Content Publishing Type *
            </label>
            <select
              id="content-type-select"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="form-select"
            >
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
              {CONTENT_TYPE_OPTIONS.find((c) => c.id === contentType)?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Editor & File Upload Workspace */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Editor Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          backgroundColor: 'var(--color-sand)',
          borderBottom: '1px solid var(--color-sand-dark)',
          fontSize: '13px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--color-deep-teal)" />
            <span style={{ fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
              Content Editor (Plain Text / Markdown)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              (Max {INGESTION_LIMITS.MAX_CONTENT_CHARS.toLocaleString()} characters / 50 KB)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setText(DEMO_TEST_COPY);
                setTitle('Q4 Product Launch Teaser');
                setUploadedFile(null);
                setValidationErrors({});
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
              title="Load standard test draft containing known violations for validation"
            >
              <Zap size={13} color="var(--color-coral)" />
              <span>Load Test Sample</span>
            </button>
            <button
              onClick={() => {
                setText(DEMO_COMPLIANT_COPY);
                setTitle('NovaPulse Enterprise Benchmark Study');
                setUploadedFile(null);
                setValidationErrors({});
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
              title="Load compliant copy with approved evidence and disclosures"
            >
              <Sparkles size={13} color="var(--color-mint)" />
              <span>Load Compliant Sample</span>
            </button>
            <button
              onClick={handleClearContent}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Clear editor text"
              disabled={!text}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Uploaded File Banner (if a file has been imported) */}
        {uploadedFile && (
          <div style={{
            backgroundColor: 'rgba(0, 229, 168, 0.08)',
            borderBottom: '1px solid var(--color-sand-dark)',
            padding: '10px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={16} color="var(--color-deep-teal)" />
              <span>
                Imported File: <strong>{uploadedFile.fileName}</strong> ({(uploadedFile.fileSize / 1024).toFixed(1)} KB, {uploadedFile.encoding})
              </span>
            </div>
            <button
              onClick={handleRemoveFileAttachment}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-coral)' }}
              title="Remove file metadata and keep editor text"
            >
              <Trash2 size={12} />
              <span>Detach File</span>
            </button>
          </div>
        )}

        {/* Main Textarea */}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (validationErrors.content) {
              setValidationErrors((prev) => {
                const next = { ...prev };
                delete next.content;
                return next;
              });
            }
          }}
          placeholder="Paste draft marketing copy here or drag and drop a .txt or .md file..."
          rows={8}
          aria-label="Marketing content text editor"
          aria-invalid={!!validationErrors.content}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '0',
            padding: '20px',
            fontSize: '14.5px',
            lineHeight: 1.65,
            resize: 'vertical',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-soft-white)',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />

        {/* Content Metrics Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          backgroundColor: 'var(--color-sand)',
          borderTop: '1px solid var(--color-sand-dark)',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>
              Characters: <strong style={{ color: isOverLimit ? 'var(--color-coral)' : 'var(--color-midnight-ink)' }}>{charCount.toLocaleString()}</strong> / {INGESTION_LIMITS.MAX_CONTENT_CHARS.toLocaleString()}
            </span>
            <span>Words: <strong>{wordCount.toLocaleString()}</strong></span>
            <span>Est. Read: <strong>{Math.max(1, Math.ceil(wordCount / 200))} min</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: charCount === 0 ? 'var(--color-sand-dark)' : isOverLimit ? 'var(--color-coral)' : 'var(--color-mint)'
            }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>
              {charCount === 0 ? 'Empty' : isOverLimit ? 'Limit Exceeded' : 'Valid Text'}
            </span>
          </div>
        </div>
      </div>

      {/* File Drag-and-Drop Ingestion Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.[0]) {
            processUploadedFile(e.dataTransfer.files[0]);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload plain text or markdown file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const fileInput = document.getElementById('file-upload-input');
            fileInput?.click();
          }
        }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-deep-teal)' : 'var(--color-sand-dark)'}`,
          backgroundColor: dragOver ? 'var(--color-sand)' : 'transparent',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 160ms ease',
          outline: 'none'
        }}
        onClick={() => {
          const fileInput = document.getElementById('file-upload-input');
          fileInput?.click();
        }}
      >
        <input
          id="file-upload-input"
          type="file"
          accept=".txt,.md"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              processUploadedFile(file);
              e.target.value = '';
            }
          }}
        />

        {isReadingFile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-deep-teal)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Reading and decoding UTF-8 content...</span>
          </div>
        ) : (
          <>
            <Upload size={24} color="var(--color-deep-teal)" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
              Drop .txt or .md file here, or click to browse
            </span>
            <span className="text-muted" style={{ fontSize: '12px' }}>
              Supports plain text (.txt) and Markdown (.md) documents up to 50 KB (50,000 characters).
            </span>
          </>
        )}
      </div>

      {/* Warnings Banner if any */}
      {validationWarnings.length > 0 && (
        <div style={{
          backgroundColor: 'var(--state-warning-bg)',
          border: '1px solid var(--state-warning-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: '12px',
          color: 'var(--state-warning-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>{validationWarnings.join(' ')}</span>
        </div>
      )}

      {/* Submission Action Bar */}
      <div style={{
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
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleAttemptNavigate('dashboard')}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            Cancel
          </button>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Target baseline: <strong>{currentBrand.name} {currentBrand.version}</strong>
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={charCount === 0 || isOverLimit || isSubmitting}
          className="btn btn-primary"
          style={{ padding: '10px 24px', fontSize: '14px' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Ingesting & Hashing...</span>
            </>
          ) : (
            <>
              <Zap size={15} strokeWidth={2.4} />
              <span>Run brand review</span>
            </>
          )}
        </button>
      </div>

      {/* SUCCESS MODAL — Displayed after successful save */}
      {isSuccessModalOpen && lastSubmittedRecord && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '540px', padding: '28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 229, 168, 0.15)',
                color: 'var(--color-deep-teal)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <CheckCircle2 size={30} color="var(--color-deep-teal)" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Content Ingested Successfully
              </h2>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                Traceable immutable content record minted and saved to persistent storage.
              </p>
            </div>

            {/* Traceability Identifiers Table */}
            <div style={{
              backgroundColor: 'var(--color-sand)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px',
              border: '1px solid var(--color-sand-dark)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                <span className="text-muted">Content ID:</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>{lastSubmittedRecord.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                <span className="text-muted">Version:</span>
                <span className="badge badge-neutral">{lastSubmittedRecord.versionNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                <span className="text-muted">Brand Baseline:</span>
                <span style={{ fontWeight: 600 }}>{lastSubmittedRecord.brandProfileName} ({lastSubmittedRecord.ruleVersionRef})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                <span className="text-muted">Content Type:</span>
                <span>{lastSubmittedRecord.contentType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                <span className="text-muted">Metrics:</span>
                <span>{lastSubmittedRecord.characterCount} chars • {lastSubmittedRecord.wordCount} words</span>
              </div>

              {/* SHA-256 Fingerprint */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="text-muted">SHA-256 Checksum:</span>
                  <button
                    onClick={() => handleCopyHash(lastSubmittedRecord.contentHash)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: '11px', height: '24px' }}
                    title="Copy SHA-256 fingerprint"
                  >
                    {copiedHash ? <Check size={12} color="var(--color-mint)" /> : <Copy size={12} />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-mono" style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--color-soft-white)',
                  padding: '8px',
                  borderRadius: '4px',
                  wordBreak: 'break-all',
                  border: '1px solid var(--color-sand-dark)'
                }}>
                  {lastSubmittedRecord.contentHash}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  setTitle('');
                  setText('');
                  setUploadedFile(null);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Submit Another Document
              </button>

              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  onScanSubmitted(
                    lastSubmittedRecord.title,
                    channelLabel,
                    lastSubmittedRecord.rawText,
                    lastSubmittedRecord
                  );
                  onNavigate('results');
                }}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                <span>Proceed to Governance Scan</span>
                <Zap size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSAVED CHANGES WARNING MODAL */}
      {showUnsavedWarning && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--state-warning-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--state-warning-text)'
              }}>
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                Discard Unsaved Draft?
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              You have unsubmitted content in the editor. If you navigate away now, your entered text will be discarded.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="btn btn-secondary"
              >
                Keep Editing
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="btn btn-danger"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVED SUBMISSIONS DRAWER / MODAL */}
      {showHistoryDrawer && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid var(--color-sand-dark)'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-ink)' }}>
                  Saved Content Submissions ({savedSubmissions.length})
                </h3>
                <p className="text-muted" style={{ fontSize: '12px' }}>
                  Persisted content records ready for governance review or revision.
                </p>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                  <FolderOpen size={36} strokeWidth={1.5} style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>No saved content submissions yet</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Submit marketing copy in the editor to mint your first immutable content record.
                  </p>
                </div>
              ) : (
                savedSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      border: '1px solid var(--color-sand-dark)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      backgroundColor: 'var(--color-soft-white)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                          {sub.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '11px' }}>
                          <span className="badge badge-neutral">{sub.versionNumber}</span>
                          <span className="text-muted">• {sub.brandProfileName} ({sub.ruleVersionRef})</span>
                          <span className="text-muted">• {sub.contentType}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleReopenSubmission(sub)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '12px' }}
                        >
                          <span>Reopen Content</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-mono">ID: {sub.id}</span>
                      <span>{new Date(sub.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="text-mono" style={{
                      fontSize: '11px',
                      backgroundColor: 'var(--color-sand)',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      SHA-256: {sub.contentHash}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewReviewPage;
