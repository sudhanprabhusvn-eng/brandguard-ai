import React from 'react';
import type { Severity } from '../../types';
import { OctagonAlert, TriangleAlert, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  if (severity === 'critical') {
    return (
      <span className={`badge badge-critical ${className}`} title="Critical Violation - Blocks Publication">
        <OctagonAlert size={12} strokeWidth={2.2} />
        <span>Critical</span>
      </span>
    );
  }

  if (severity === 'warning') {
    return (
      <span className={`badge badge-warning ${className}`} title="Warning - Requires Review or Substantiation">
        <TriangleAlert size={12} strokeWidth={2.2} />
        <span>Warning</span>
      </span>
    );
  }

  return (
    <span className={`badge badge-info ${className}`} title="Guideline Suggestion">
      <Info size={12} strokeWidth={2.2} />
      <span>Info</span>
    </span>
  );
};
