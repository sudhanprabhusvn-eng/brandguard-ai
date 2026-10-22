import React, { useState } from 'react';
import type { BrandProfile } from '../../types';
import { ModalDialog } from '../common/ModalDialog';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface BrandProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: Partial<BrandProfile>) => void;
  existingProfile?: BrandProfile | null;
  allProfiles: BrandProfile[];
}

export const BrandProfileModal: React.FC<BrandProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingProfile,
  allProfiles
}) => {
  const isEditing = Boolean(existingProfile);

  const [name, setName] = useState(existingProfile?.name || '');
  const [description, setDescription] = useState(existingProfile?.description || '');
  const [industry, setIndustry] = useState(existingProfile?.industry || 'B2B SaaS / Enterprise Automation');
  const [voiceGuidelines, setVoiceGuidelines] = useState<string[]>(
    existingProfile?.voiceGuidelines || ['Clear, direct, and objective tone.', 'Avoid exaggerated superlatives.']
  );
  const [requiredPhrases, setRequiredPhrases] = useState<string[]>(
    existingProfile?.requiredPhrases || ['Terms and conditions apply.']
  );
  const [prohibitedPhrases, setProhibitedPhrases] = useState<string[]>(
    existingProfile?.prohibitedPhrases || ['100% risk-free', 'guaranteed results']
  );
  const [disclosures, setDisclosures] = useState<string[]>(
    existingProfile?.disclosures || ['Terms and conditions apply to all benchmark promotional offers.']
  );
  const [visualGuidelines, setVisualGuidelines] = useState<string[]>(
    existingProfile?.visualGuidelines || ['Enforce high text contrast (minimum 7:1 for body copy).']
  );

  const [newVoiceItem, setNewVoiceItem] = useState('');
  const [newRequiredPhrase, setNewRequiredPhrase] = useState('');
  const [newProhibitedPhrase, setNewProhibitedPhrase] = useState('');
  const [newDisclosure, setNewDisclosure] = useState('');
  const [newVisualGuideline, setNewVisualGuideline] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Brand name is required.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Brand description is required.');
      return;
    }

    // Check duplicate name if creating
    if (!isEditing) {
      const isDuplicate = allProfiles.some(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (isDuplicate) {
        setErrorMessage(`A brand profile named "${name.trim()}" already exists.`);
        return;
      }
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      industry: industry.trim(),
      voiceGuidelines,
      requiredPhrases,
      prohibitedPhrases,
      disclosures,
      visualGuidelines
    });

    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      title={isEditing ? `Edit Brand Profile: ${existingProfile?.name}` : 'Create New Brand Governance Profile'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--state-critical-bg)',
            border: '1px solid var(--state-critical-border)',
            color: 'var(--state-critical-text)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Basic Metadata */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Brand Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="e.g. Apex Security"
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Industry / Category
          </label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="form-input"
            placeholder="e.g. Healthcare, Fintech, Cloud Infrastructure"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Brand Description & Governance Purpose *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows={2}
            placeholder="Briefly state organizational mission and publishing compliance mandate..."
            required
          />
        </div>

        {/* Voice & Tone Guidelines */}
        <div style={{ borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Voice & Tone Guidelines ({voiceGuidelines.length})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newVoiceItem}
              onChange={(e) => setNewVoiceItem(e.target.value)}
              placeholder="Add voice guideline (e.g. Prefer clear and concise technical explanations)..."
              className="form-input"
              style={{ fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => {
                if (newVoiceItem.trim()) {
                  setVoiceGuidelines([...voiceGuidelines, newVoiceItem.trim()]);
                  setNewVoiceItem('');
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {voiceGuidelines.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                <span>• {item}</span>
                <button
                  type="button"
                  onClick={() => setVoiceGuidelines(voiceGuidelines.filter((_, i) => i !== idx))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 6px', borderColor: 'transparent' }}
                  title="Remove guideline"
                >
                  <Trash2 size={13} color="var(--color-coral)" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Required Phrases */}
        <div style={{ borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Required Phrases & Mandatory Boilerplate ({requiredPhrases.length})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newRequiredPhrase}
              onChange={(e) => setNewRequiredPhrase(e.target.value)}
              placeholder="Add required phrase (e.g. Terms and conditions apply)..."
              className="form-input"
              style={{ fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => {
                if (newRequiredPhrase.trim()) {
                  setRequiredPhrases([...requiredPhrases, newRequiredPhrase.trim()]);
                  setNewRequiredPhrase('');
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {requiredPhrases.map((phrase, idx) => (
              <span key={idx} className="badge badge-success" style={{ textTransform: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>"{phrase}"</span>
                <button
                  type="button"
                  onClick={() => setRequiredPhrases(requiredPhrases.filter((_, i) => i !== idx))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Prohibited Phrases */}
        <div style={{ borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Prohibited Phrases Lexicon ({prohibitedPhrases.length})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newProhibitedPhrase}
              onChange={(e) => setNewProhibitedPhrase(e.target.value)}
              placeholder="Add prohibited phrase (e.g. unconditionally risk-free)..."
              className="form-input"
              style={{ fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => {
                if (newProhibitedPhrase.trim()) {
                  setProhibitedPhrases([...prohibitedPhrases, newProhibitedPhrase.trim()]);
                  setNewProhibitedPhrase('');
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {prohibitedPhrases.map((phrase, idx) => (
              <span key={idx} className="badge badge-critical" style={{ textTransform: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>"{phrase}"</span>
                <button
                  type="button"
                  onClick={() => setProhibitedPhrases(prohibitedPhrases.filter((_, i) => i !== idx))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Required Disclosures */}
        <div style={{ borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Required Disclosures & Legal Statements ({disclosures.length})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newDisclosure}
              onChange={(e) => setNewDisclosure(e.target.value)}
              placeholder="Add mandatory disclosure statement..."
              className="form-input"
              style={{ fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => {
                if (newDisclosure.trim()) {
                  setDisclosures([...disclosures, newDisclosure.trim()]);
                  setNewDisclosure('');
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {disclosures.map((disc, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                <span>§ {disc}</span>
                <button
                  type="button"
                  onClick={() => setDisclosures(disclosures.filter((_, i) => i !== idx))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 6px', borderColor: 'transparent' }}
                  title="Remove disclosure"
                >
                  <Trash2 size={13} color="var(--color-coral)" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Brand Guidelines */}
        <div style={{ borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Visual Brand Guidelines ({visualGuidelines.length})
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newVisualGuideline}
              onChange={(e) => setNewVisualGuideline(e.target.value)}
              placeholder="Add visual guideline (e.g. Enforce 7:1 contrast for all headline elements)..."
              className="form-input"
              style={{ fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => {
                if (newVisualGuideline.trim()) {
                  setVisualGuidelines([...visualGuidelines, newVisualGuideline.trim()]);
                  setNewVisualGuideline('');
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {visualGuidelines.map((vItem, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                <span>✦ {vItem}</span>
                <button
                  type="button"
                  onClick={() => setVisualGuidelines(visualGuidelines.filter((_, i) => i !== idx))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 6px', borderColor: 'transparent' }}
                  title="Remove visual guideline"
                >
                  <Trash2 size={13} color="var(--color-coral)" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? 'Save Profile Changes' : 'Create Brand Profile'}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
};
