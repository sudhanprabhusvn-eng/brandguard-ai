import React from 'react';
import type { EvidenceStatus } from '../../types';
import { CheckCircle2, HelpCircle, AlertCircle, Minus } from 'lucide-react';

interface EvidenceBadgeProps {
  status: EvidenceStatus;
  citation?: string;
  className?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ status, citation, className = '' }) => {
  if (status === 'verified' || status === 'approved') {
    return (
      <span className={`badge badge-success ${className}`} title={citation ? `Verified against: ${citation}` : 'Verified with approved evidence citation'}>
        <CheckCircle2 size={12} strokeWidth={2.2} />
        <span>Verified Evidence</span>
      </span>
    );
  }

  if (status === 'missing') {
    return (
      <span className={`badge badge-warning ${className}`} title="No evidence record found in library">
        <HelpCircle size={12} strokeWidth={2.2} />
        <span>Evidence Missing</span>
      </span>
    );
  }

  if (status === 'unverified') {
    return (
      <span className={`badge badge-warning ${className}`} title="Substantiating evidence is not currently in approved library (claim is not proven false)">
        <HelpCircle size={12} strokeWidth={2.2} />
        <span>Unverified Claim</span>
      </span>
    );
  }

  if (status === 'contradicted') {
    return (
      <span className={`badge badge-critical ${className}`} title="Contradicts verified benchmark data">
        <AlertCircle size={12} strokeWidth={2.2} />
        <span>Contradicted Claim</span>
      </span>
    );
  }

  return (
    <span className={`badge badge-neutral ${className}`} title="Not an empirical factual claim">
      <Minus size={12} strokeWidth={2} />
      <span>Evidence N/A</span>
    </span>
  );
};
