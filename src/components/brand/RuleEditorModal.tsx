import React, { useState } from 'react';
import type { BrandRule, RuleCategory, Severity, EngineTarget } from '../../types';
import { ModalDialog } from '../common/ModalDialog';
import { storageService } from '../../services/storageService';
import { AlertCircle, ShieldCheck } from 'lucide-react';

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: BrandRule) => void;
  existingRule?: BrandRule | null;
  currentRules: BrandRule[];
  brandIdPrefix?: string;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingRule,
  currentRules,
  brandIdPrefix = 'NP'
}) => {
  const isEditing = Boolean(existingRule);

  const [id, setId] = useState(
    existingRule?.id || `${brandIdPrefix}-${String(currentRules.length + 1).padStart(3, '0')}`
  );
  const [name, setName] = useState(existingRule?.name || '');
  const [description, setDescription] = useState(existingRule?.description || '');
  const [explanation, setExplanation] = useState(existingRule?.explanation || '');
  const [category, setCategory] = useState<RuleCategory>(existingRule?.category || 'prohibited_language');
  const [severity, setSeverity] = useState<Severity>(existingRule?.severity || 'critical');
  const [engine, setEngine] = useState<EngineTarget>(existingRule?.engine || 'deterministic');
  const [pattern, setPattern] = useState(existingRule?.pattern || '');
  const [suggestedReplacement, setSuggestedReplacement] = useState(existingRule?.suggestedReplacement || '');
  const [evidenceReferenceId, setEvidenceReferenceId] = useState(existingRule?.evidenceReferenceId || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const ruleData: Partial<BrandRule> = {
      id: id.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      explanation: explanation.trim(),
      category,
      severity,
      engine,
      pattern: pattern.trim(),
      suggestedReplacement: suggestedReplacement.trim() || undefined,
      evidenceReferenceId: evidenceReferenceId.trim() || undefined
    };

    // Use safe validation from storageService
    const validation = storageService.validateRule(ruleData, currentRules, isEditing);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid rule configuration.');
      return;
    }

    const finalRule: BrandRule = {
      id: ruleData.id!,
      name: ruleData.name!,
      description: ruleData.description!,
      explanation: ruleData.explanation!,
      category: ruleData.category!,
      severity: ruleData.severity!,
      engine: ruleData.engine!,
      pattern: ruleData.pattern!,
      suggestedReplacement: ruleData.suggestedReplacement,
      evidenceReferenceId: ruleData.evidenceReferenceId,
      active: existingRule ? existingRule.active : true,
      createdAt: existingRule ? existingRule.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modifiedBy: 'Brand Manager'
    };

    onSave(finalRule);
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      title={isEditing ? `Edit Governance Rule: ${existingRule?.id}` : 'Create New Brand Governance Rule'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {validationError && (
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
            <span>{validationError}</span>
          </div>
        )}

        {/* Rule ID & Category Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Rule Identifier *
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isEditing}
              className="form-input text-mono"
              placeholder="e.g. NP-006"
              style={{ textTransform: 'uppercase', fontWeight: 600 }}
              required
            />
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Unique alphanumeric code
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Rule Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="e.g. Prohibit Unsubstantiated ROI Multipliers"
              required
            />
          </div>
        </div>

        {/* Category, Engine, and Severity Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RuleCategory)}
              className="form-select"
            >
              <option value="prohibited_language">Prohibited Language</option>
              <option value="factual_claim">Factual Claim</option>
              <option value="required_disclosure">Required Disclosure</option>
              <option value="tone">Tone of Voice</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Evaluation Engine *
            </label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineTarget)}
              className="form-select"
            >
              <option value="deterministic">⚡ Deterministic (Exact Regex)</option>
              <option value="ai_contextual">🧠 AI Contextual Analysis</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Severity *
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="form-select"
            >
              <option value="critical">🔴 Critical (Blocks Approval)</option>
              <option value="warning">🟡 Warning (Review Required)</option>
              <option value="info">🔵 Info (Editorial Guidance)</option>
            </select>
          </div>
        </div>

        {/* Pattern & Regex Configuration */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Target Detection Pattern (Safe Regular Expression or Phrase) *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="form-input text-mono"
              placeholder="e.g. (unconditionally|100%)\\s*guarantee"
              required
            />
          </div>
          <span className="text-muted" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
            Validated safely at runtime. Does not execute untrusted script code.
          </span>
        </div>

        {/* Description & Explanation */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Description & Policy Scope *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows={2}
            placeholder="Describe what specific marketing terminology or statements this rule governs..."
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Compliance Rationale (Shown in Findings) *
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="form-textarea"
            rows={2}
            placeholder="Explain why this finding is raised and reference organizational policy..."
            required
          />
        </div>

        {/* Suggested Replacement and Evidence Reference */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Suggested Compliant Replacement (Optional)
            </label>
            <input
              type="text"
              value={suggestedReplacement}
              onChange={(e) => setSuggestedReplacement(e.target.value)}
              className="form-input"
              placeholder="e.g. engineered to deliver verified performance metrics"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Evidence Citation ID (Optional)
            </label>
            <input
              type="text"
              value={evidenceReferenceId}
              onChange={(e) => setEvidenceReferenceId(e.target.value)}
              className="form-input text-mono"
              placeholder="e.g. EVD-NP-01"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--color-sand-dark)', paddingTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <ShieldCheck size={16} strokeWidth={2.4} />
            <span>{isEditing ? 'Save Rule Modifications' : 'Add Rule to Brand Policy'}</span>
          </button>
        </div>
      </form>
    </ModalDialog>
  );
};
