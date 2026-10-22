import React from 'react';
import type { BrandProfile } from '../../types';
import { ModalDialog } from '../common/ModalDialog';
import { CheckCircle, Clock, User } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandProfile: BrandProfile;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  brandProfile
}) => {
  const historyEntries = [...brandProfile.versionHistory].reverse();

  return (
    <ModalDialog
      isOpen={isOpen}
      title={`${brandProfile.name} — Policy Version History`}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
        <p className="text-muted" style={{ fontSize: '13px' }}>
          Rule changes create an immutable version baseline. Evaluations and approvals are cryptographically bound to specific rule versions.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {historyEntries.map((entry, idx) => {
            const isCurrent = entry.version === brandProfile.version;
            return (
              <div
                key={entry.version || idx}
                style={{
                  padding: '14px 16px',
                  backgroundColor: isCurrent ? 'var(--state-success-bg)' : 'var(--color-sand)',
                  border: `1px solid ${isCurrent ? 'var(--color-mint)' : 'var(--color-sand-dark)'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="text-mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-midnight-ink)' }}>
                      {entry.version}
                    </span>
                    {isCurrent ? (
                      <span className="badge badge-success">
                        <CheckCircle size={11} /> Active Baseline
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Historical</span>
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    {entry.ruleCount} Rules Defined
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {entry.summary}
                </p>

                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {entry.modifiedBy}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </ModalDialog>
  );
};
