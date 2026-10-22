import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  title,
  onClose,
  children,
  footer
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className="modal-content"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-sand-dark)',
          backgroundColor: 'var(--color-sand)'
        }}>
          <h2 id="modal-title" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px', borderRadius: '50%' }}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {children}
        </div>

        {footer && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: 'var(--color-sand)',
            borderTop: '1px solid var(--color-sand-dark)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
