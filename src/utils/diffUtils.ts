/**
 * Diff computation utility for BrandGuard AI Fix & Compare Studio (Phase 8).
 * Word-level, accessible text comparison without external dependencies.
 */

export type DiffType = 'unchanged' | 'added' | 'removed';

export interface DiffSegment {
  type: DiffType;
  text: string;
}

export interface DiffMetrics {
  additionsCount: number;
  deletionsCount: number;
  unchangedCount: number;
  wordsAdded: number;
  wordsRemoved: number;
  characterDelta: number;
  originalWordCount: number;
  revisedWordCount: number;
}

export interface DiffResult {
  segments: DiffSegment[];
  metrics: DiffMetrics;
  hasChanges: boolean;
  changeSummaryDescriptions: string[];
}

/**
 * Tokenize text into words, whitespace, and punctuation tokens while preserving exact reconstruction.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  // Matches words, whitespace sequences, or individual punctuation marks
  const tokens = text.match(/\S+|\s+/g);
  return tokens || [];
}

/**
 * Compute Myers / LCS diff at the word/token level.
 */
export function computeWordDiff(original: string, revised: string): DiffResult {
  const origTokens = tokenizeWords(original);
  const revTokens = tokenizeWords(revised);

  const n = origTokens.length;
  const m = revTokens.length;

  // Build standard LCS table
  // For memory safety with long documents, cap table dimensions
  const maxTokens = 1200;
  const safeN = Math.min(n, maxTokens);
  const safeM = Math.min(m, maxTokens);

  const dp: number[][] = Array.from({ length: safeN + 1 }, () => new Array(safeM + 1).fill(0));

  for (let i = 0; i < safeN; i++) {
    for (let j = 0; j < safeM; j++) {
      if (origTokens[i] === revTokens[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to assemble segments
  let i = safeN;
  let j = safeM;
  const rawSegments: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === revTokens[j - 1]) {
      rawSegments.unshift({ type: 'unchanged', text: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.unshift({ type: 'added', text: revTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawSegments.unshift({ type: 'removed', text: origTokens[i - 1] });
      i--;
    }
  }

  // Handle any excess tokens beyond safety cap
  if (n > safeN) {
    rawSegments.unshift({ type: 'removed', text: origTokens.slice(safeN).join('') });
  }
  if (m > safeM) {
    rawSegments.push({ type: 'added', text: revTokens.slice(safeM).join('') });
  }

  // Merge adjacent segments with identical diff type
  const segments: DiffSegment[] = [];
  for (const seg of rawSegments) {
    if (segments.length > 0 && segments[segments.length - 1].type === seg.type) {
      segments[segments.length - 1].text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  // Calculate metrics
  let wordsAdded = 0;
  let wordsRemoved = 0;
  let additionsCount = 0;
  let deletionsCount = 0;
  let unchangedCount = 0;

  const changeSummaryDescriptions: string[] = [];

  for (const seg of segments) {
    const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
    if (seg.type === 'added') {
      additionsCount++;
      wordsAdded += wordCount;
      const snippet = seg.text.trim().substring(0, 40);
      if (snippet) {
        changeSummaryDescriptions.push(`[+] Added: "${snippet}${seg.text.trim().length > 40 ? '...' : ''}"`);
      }
    } else if (seg.type === 'removed') {
      deletionsCount++;
      wordsRemoved += wordCount;
      const snippet = seg.text.trim().substring(0, 40);
      if (snippet) {
        changeSummaryDescriptions.push(`[-] Removed: "${snippet}${seg.text.trim().length > 40 ? '...' : ''}"`);
      }
    } else {
      unchangedCount++;
    }
  }

  const origWordCount = original.trim().split(/\s+/).filter(Boolean).length;
  const revWordCount = revised.trim().split(/\s+/).filter(Boolean).length;

  return {
    segments,
    metrics: {
      additionsCount,
      deletionsCount,
      unchangedCount,
      wordsAdded,
      wordsRemoved,
      characterDelta: revised.length - original.length,
      originalWordCount: origWordCount,
      revisedWordCount: revWordCount
    },
    hasChanges: additionsCount > 0 || deletionsCount > 0,
    changeSummaryDescriptions: changeSummaryDescriptions.slice(0, 10)
  };
}
