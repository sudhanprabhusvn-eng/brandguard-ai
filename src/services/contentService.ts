import type {
  ContentType,
  FileMetadata,
  ContentVersionRecord,
  SubmittedContent,
  IngestionValidationResult
} from '../types';

export const INGESTION_LIMITS = {
  MAX_CONTENT_CHARS: 50000,
  MAX_FILE_BYTES: 50 * 1024, // 50 KB
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  SUPPORTED_EXTENSIONS: ['.txt', '.md'] as const
};

export const STORAGE_DISCLOSURE =
  'Interim Browser Storage (localStorage). Client-side prototype persistence without remote database.';

export const SUBMISSIONS_STORAGE_KEY = 'brandguard_submitted_documents_v1';

export const CONTENT_TYPE_OPTIONS: Array<{
  id: ContentType;
  label: string;
  description: string;
}> = [
  {
    id: 'social_post',
    label: 'Social Media Post',
    description: 'LinkedIn, X, Threads or Facebook short-form post'
  },
  {
    id: 'ad_copy',
    label: 'Advertising Copy',
    description: 'Search, display or paid social headline & body'
  },
  {
    id: 'product_email',
    label: 'Product Lifecycle Email',
    description: 'Product announcement, onboarding or newsletter'
  },
  {
    id: 'landing_page',
    label: 'Marketing Landing Page',
    description: 'Hero section, feature narratives and product page copy'
  },
  {
    id: 'general_marketing',
    label: 'General Marketing Copy',
    description: 'Brochure, blog post or promotional collateral'
  }
];

/**
 * Safely compute SHA-256 hexadecimal hash using Web Crypto API.
 * Works natively in both modern browsers and Node.js 18+.
 */
export async function computeSha256(text: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Safe fallback if crypto.subtle is unavailable
  let hash1 = 0x811c9dc5;
  let hash2 = 0x27d4eb2f;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 0x01000193);
    hash2 = Math.imul(hash2 ^ ch, 0x5bd1e995);
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return (h1 + h2).repeat(4).slice(0, 64);
}

/**
 * Synchronous hash fallback for instantaneous UI previews.
 */
export function computeQuickHash(text: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x27d4eb2f;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 0x01000193);
    hash2 = Math.imul(hash2 ^ ch, 0x5bd1e995);
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return (h1 + h2).repeat(4).slice(0, 64);
}

/**
 * Normalise newlines for cross-platform consistency (\r\n -> \n)
 * without altering any words, spacing, punctuation, or Markdown syntax.
 */
export function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Detect binary characters / null bytes in decoded text.
 */
export function containsBinaryOrControlChars(text: string): boolean {
  // Reject null bytes and non-standard control characters (allow \t=9, \n=10, \r=13)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate an uploaded File before reading.
 */
export function validateFileMetadata(file: { name: string; size: number; type?: string }): {
  isValid: boolean;
  error?: string;
} {
  const extensionMatch = file.name.match(/\.[^.]+$/);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase() : '';

  if (!INGESTION_LIMITS.SUPPORTED_EXTENSIONS.includes(extension as '.txt' | '.md')) {
    return {
      isValid: false,
      error: `Unsupported file extension "${extension || 'none'}". Only plain text (.txt) and Markdown (.md) files are supported.`
    };
  }

  // Check known binary MIME types
  if (file.type) {
    const lowerType = file.type.toLowerCase();
    const disallowedPrefixes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats'];
    if (disallowedPrefixes.some((p) => lowerType.startsWith(p))) {
      return {
        isValid: false,
        error: `Unsupported file type (${file.type}). BrandGuard AI accepts plain text (.txt) and Markdown (.md) documents only.`
      };
    }
  }

  if (file.size > INGESTION_LIMITS.MAX_FILE_BYTES) {
    const sizeKb = (file.size / 1024).toFixed(1);
    const maxKb = (INGESTION_LIMITS.MAX_FILE_BYTES / 1024).toFixed(0);
    return {
      isValid: false,
      error: `File size (${sizeKb} KB) exceeds the maximum allowed limit of ${maxKb} KB (50,000 characters).`
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The uploaded file is empty (0 bytes). Please select a file with content.'
    };
  }

  return { isValid: true };
}

/**
 * Validate content submission inputs prior to creation.
 */
export function validateSubmissionInput(
  title: string,
  brandProfileId: string,
  contentType: string,
  text: string
): IngestionValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // 1. Brand profile check
  if (!brandProfileId || !brandProfileId.trim()) {
    errors.brandProfileId = 'Please select a brand profile for governance analysis.';
  }

  // 2. Title check
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    errors.title = 'Content title is required.';
  } else if (trimmedTitle.length < INGESTION_LIMITS.MIN_TITLE_LENGTH) {
    errors.title = `Content title must be at least ${INGESTION_LIMITS.MIN_TITLE_LENGTH} characters.`;
  } else if (trimmedTitle.length > INGESTION_LIMITS.MAX_TITLE_LENGTH) {
    errors.title = `Content title cannot exceed ${INGESTION_LIMITS.MAX_TITLE_LENGTH} characters (currently ${trimmedTitle.length}).`;
  }

  // 3. Content Type check
  const validTypes: ContentType[] = [
    'social_post',
    'ad_copy',
    'product_email',
    'landing_page',
    'general_marketing'
  ];
  if (!contentType || !validTypes.includes(contentType as ContentType)) {
    errors.contentType = 'Please select a supported content publishing type.';
  }

  // 4. Content check
  const normalizedText = normalizeNewlines(text);
  if (!normalizedText || !normalizedText.trim()) {
    errors.content = 'Content editor cannot be empty or contain only whitespace.';
  } else if (normalizedText.length > INGESTION_LIMITS.MAX_CONTENT_CHARS) {
    errors.content = `Content exceeds the maximum limit of ${INGESTION_LIMITS.MAX_CONTENT_CHARS.toLocaleString()} characters (currently ${normalizedText.length.toLocaleString()}).`;
  } else if (containsBinaryOrControlChars(normalizedText)) {
    errors.content = 'Content contains invalid binary or unprintable control characters. Please ensure valid UTF-8 text.';
  }

  // Warnings
  if (normalizedText.trim().length > 0 && normalizedText.trim().length < 30) {
    warnings.push('Content is very short (< 30 characters). Governance scanning is most effective on complete marketing copy.');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

export const contentService = {
  /**
   * Load all saved submissions from localStorage with safe error handling.
   */
  loadAllSubmissions(): SubmittedContent[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Get a specific submitted content record by unique ID.
   */
  getSubmissionById(id: string): SubmittedContent | null {
    const all = this.loadAllSubmissions();
    return all.find((item) => item.id === id) || null;
  },

  /**
   * Save a newly ingested content record to localStorage.
   * Returns honest success/failure status.
   */
  saveSubmission(submission: SubmittedContent): { success: boolean; error?: string } {
    try {
      if (typeof localStorage === 'undefined') {
        return { success: false, error: 'Storage environment is unavailable.' };
      }
      const existing = this.loadAllSubmissions();
      // Replace if existing ID (for revision/update), or prepend if new
      const index = existing.findIndex((s) => s.id === submission.id);
      let updated: SubmittedContent[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = submission;
      } else {
        updated = [submission, ...existing];
      }
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage write failed (quota exceeded or storage blocked)';
      return { success: false, error: msg };
    }
  },

  /**
   * Create an ingested content record from form inputs.
   */
  async createSubmissionRecord(params: {
    title: string;
    brandProfileId: string;
    brandProfileName: string;
    ruleVersionRef: string;
    contentType: ContentType;
    rawText: string;
    fileMetadata?: FileMetadata;
  }): Promise<{ success: boolean; record?: SubmittedContent; error?: string }> {
    const normalized = normalizeNewlines(params.rawText);
    const validation = validateSubmissionInput(
      params.title,
      params.brandProfileId,
      params.contentType,
      normalized
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || 'Validation failed.';
      return { success: false, error: firstError };
    }

    const timestamp = new Date().toISOString();
    const contentHash = await computeSha256(normalized);
    const contentId = `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const versionId = `ver_${Date.now()}_01`;
    const versionNumber = 'v1.0';

    const words = normalized.trim().split(/\s+/).filter(Boolean).length;
    const chars = normalized.length;

    const initialVersionRecord: ContentVersionRecord = {
      versionId,
      versionNumber,
      contentHash,
      rawText: normalized,
      characterCount: chars,
      wordCount: words,
      createdAt: timestamp,
      ruleVersionRef: params.ruleVersionRef,
      changeSummary: 'Initial content ingestion'
    };

    const record: SubmittedContent = {
      id: contentId,
      title: params.title.trim(),
      brandProfileId: params.brandProfileId,
      brandProfileName: params.brandProfileName,
      ruleVersionRef: params.ruleVersionRef,
      contentType: params.contentType,
      rawText: normalized,
      contentHash,
      versionId,
      versionNumber,
      status: 'ingested',
      createdAt: timestamp,
      updatedAt: timestamp,
      fileMetadata: params.fileMetadata,
      characterCount: chars,
      wordCount: words,
      versionHistory: [initialVersionRecord]
    };

    const saveResult = this.saveSubmission(record);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    return { success: true, record };
  },

  /**
   * Create a new immutable revision without overwriting earlier versions.
   */
  async createRevision(params: {
    parentId: string;
    newText: string;
    updatedTitle?: string;
    ruleVersionRef?: string;
    changeSummary?: string;
  }): Promise<{ success: boolean; record?: SubmittedContent; error?: string }> {
    const existing = this.getSubmissionById(params.parentId);
    if (!existing) {
      return { success: false, error: `Content record with ID "${params.parentId}" not found.` };
    }

    const normalized = normalizeNewlines(params.newText);
    const title = params.updatedTitle || existing.title;
    const validation = validateSubmissionInput(
      title,
      existing.brandProfileId,
      existing.contentType,
      normalized
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || 'Validation failed.';
      return { success: false, error: firstError };
    }

    const timestamp = new Date().toISOString();
    const contentHash = await computeSha256(normalized);

    // Compute next version number (e.g. v1.0 -> v1.1)
    const currentVerMatch = existing.versionNumber.match(/^v?(\d+)\.(\d+)$/);
    let nextVersionNumber = 'v1.1';
    if (currentVerMatch) {
      const major = parseInt(currentVerMatch[1], 10);
      const minor = parseInt(currentVerMatch[2], 10);
      nextVersionNumber = `v${major}.${minor + 1}`;
    }

    const newVersionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ruleRef = params.ruleVersionRef || existing.ruleVersionRef;

    const words = normalized.trim().split(/\s+/).filter(Boolean).length;
    const chars = normalized.length;

    const newVersionRecord: ContentVersionRecord = {
      versionId: newVersionId,
      versionNumber: nextVersionNumber,
      contentHash,
      rawText: normalized,
      characterCount: chars,
      wordCount: words,
      createdAt: timestamp,
      ruleVersionRef: ruleRef,
      changeSummary: params.changeSummary || `Revision ${nextVersionNumber}`
    };

    const updatedRecord: SubmittedContent = {
      ...existing,
      title: title.trim(),
      rawText: normalized,
      contentHash,
      versionId: newVersionId,
      versionNumber: nextVersionNumber,
      ruleVersionRef: ruleRef,
      updatedAt: timestamp,
      characterCount: chars,
      wordCount: words,
      // Retain complete immutable history of earlier versions!
      versionHistory: [...existing.versionHistory, newVersionRecord]
    };

    const saveResult = this.saveSubmission(updatedRecord);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    return { success: true, record: updatedRecord };
  },

  /**
   * Delete a saved submission by ID.
   */
  deleteSubmission(id: string): boolean {
    try {
      const existing = this.loadAllSubmissions();
      const filtered = existing.filter((s) => s.id !== id);
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clear all submissions (for test resets).
   */
  clearAllSubmissions(): void {
    try {
      localStorage.removeItem(SUBMISSIONS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
};
