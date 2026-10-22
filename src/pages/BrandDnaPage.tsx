import React, { useState } from 'react';
import type { BrandProfile, BrandRule, RuleCategory } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { ModalDialog } from '../components/common/ModalDialog';
import { BrandProfileModal } from '../components/brand/BrandProfileModal';
import { RuleEditorModal } from '../components/brand/RuleEditorModal';
import { VersionHistoryModal } from '../components/brand/VersionHistoryModal';
import { STORAGE_DISCLOSURE } from '../services/storageService';
import {
  Search,
  Check,
  FileCheck,
  Download,
  Plus,
  History,
  Edit3,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Info,
  Layers
} from 'lucide-react';

interface BrandDnaPageProps {
  brandProfile: BrandProfile;
  allProfiles: BrandProfile[];
  onUpdateProfile: (updatedProfile: BrandProfile, versionChangeSummary?: string) => void;
  onResetSeed: () => void;
  onShowToast: (message: string) => void;
}

const getNowIso = (): string => new Date().toISOString();

export const BrandDnaPage: React.FC<BrandDnaPageProps> = ({
  brandProfile,
  allProfiles,
  onUpdateProfile,
  onResetSeed,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'all' | RuleCategory | 'evidence' | 'voice_summary'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedEngine, setSelectedEngine] = useState<string>('all');

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrandRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<BrandRule | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const rules = brandProfile.rules || [];
  const evidenceRecords = brandProfile.evidenceRecords || [];

  const filteredRules = rules.filter((rule) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'evidence' || activeTab === 'voice_summary'
        ? false
        : rule.category === activeTab;

    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.pattern.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'all' ? true : rule.severity === selectedSeverity;

    const matchesEngine =
      selectedEngine === 'all' ? true : rule.engine === selectedEngine;

    return matchesTab && matchesSearch && matchesSeverity && matchesEngine;
  });

  const handleToggleRule = (ruleId: string) => {
    const targetRule = rules.find((r) => r.id === ruleId);
    if (!targetRule) return;

    const updatedRules = rules.map((r) =>
      r.id === ruleId ? { ...r, active: !r.active, updatedAt: getNowIso() } : r
    );

    const updatedProfile: BrandProfile = {
      ...brandProfile,
      rules: updatedRules,
      updatedAt: getNowIso()
    };

    onUpdateProfile(
      updatedProfile,
      `Toggled rule ${ruleId} (${targetRule.name}) to ${targetRule.active ? 'Disabled' : 'Active'}.`
    );
    onShowToast(`Rule ${ruleId} ${targetRule.active ? 'disabled' : 'enabled'}.`);
  };

  const handleSaveRule = (savedRule: BrandRule) => {
    let updatedRules: BrandRule[];
    let summary: string;

    if (editingRule) {
      // Editing existing rule
      updatedRules = rules.map((r) => (r.id === savedRule.id ? savedRule : r));
      summary = `Updated governance rule ${savedRule.id} (${savedRule.name}).`;
    } else {
      // Adding new rule
      updatedRules = [...rules, savedRule];
      summary = `Added new governance rule ${savedRule.id} (${savedRule.name}) under ${savedRule.category}.`;
    }

    const updatedProfile: BrandProfile = {
      ...brandProfile,
      rules: updatedRules,
      updatedAt: new Date().toISOString()
    };

    onUpdateProfile(updatedProfile, summary);
    onShowToast(`Governance rule ${savedRule.id} saved successfully.`);
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleToDelete: BrandRule) => {
    const updatedRules = rules.filter((r) => r.id !== ruleToDelete.id);
    const updatedProfile: BrandProfile = {
      ...brandProfile,
      rules: updatedRules,
      updatedAt: new Date().toISOString()
    };

    onUpdateProfile(
      updatedProfile,
      `Deleted rule ${ruleToDelete.id} (${ruleToDelete.name}) from brand policy.`
    );
    onShowToast(`Rule ${ruleToDelete.id} deleted.`);
    setDeletingRule(null);
  };

  const handleSaveProfileMetadata = (data: Partial<BrandProfile>) => {
    const updatedProfile: BrandProfile = {
      ...brandProfile,
      ...data,
      updatedAt: new Date().toISOString()
    };

    onUpdateProfile(updatedProfile, `Updated brand profile guidance and metadata for ${updatedProfile.name}.`);
    onShowToast(`Brand profile "${updatedProfile.name}" updated successfully.`);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(brandProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandguard-${brandProfile.name.toLowerCase().replace(/\s+/g, '-')}-${brandProfile.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(`Exported ${brandProfile.name} brand ruleset.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Brand Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-deep-teal)',
          color: 'var(--color-soft-white)',
          padding: '28px',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '680px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(0, 229, 168, 0.2)', color: 'var(--color-mint)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>
              ACTIVE GOVERNANCE PROFILE
            </span>
            {brandProfile.isDemonstration && (
              <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(255, 182, 133, 0.25)', color: 'var(--color-warm-peach)', padding: '2px 8px', borderRadius: '4px' }}>
                ★ Demonstration Seed
              </span>
            )}
            <span className="text-mono" style={{ fontSize: '12px', color: 'var(--color-lavender)' }}>
              Ruleset Baseline: {brandProfile.version}
            </span>
            {brandProfile.industry && (
              <span style={{ fontSize: '12px', color: 'var(--color-sand-muted)' }}>
                • {brandProfile.industry}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: 'var(--color-soft-white)' }}>
            {brandProfile.name} Brand DNA & Governance Policies
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-sand-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            {brandProfile.description}
          </p>
        </div>

        {/* Action Controls in Header */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', zIndex: 1 }}>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255, 252, 247, 0.1)', color: 'var(--color-soft-white)', borderColor: 'rgba(255, 252, 247, 0.2)' }}
            title="Edit brand profile metadata, voice guidelines, and disclosures"
          >
            <Edit3 size={14} />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255, 252, 247, 0.1)', color: 'var(--color-soft-white)', borderColor: 'rgba(255, 252, 247, 0.2)' }}
            title="Inspect chronological version increments and modification audit trail"
          >
            <History size={14} />
            <span>Version History ({brandProfile.versionHistory?.length || 1})</span>
          </button>

          <button
            onClick={handleExportJson}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255, 252, 247, 0.1)', color: 'var(--color-soft-white)', borderColor: 'rgba(255, 252, 247, 0.2)' }}
            title="Export brand rules and evidence as JSON"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          {brandProfile.isDemonstration && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ backgroundColor: 'rgba(255, 252, 247, 0.08)', color: 'var(--color-warm-peach)', borderColor: 'rgba(255, 182, 133, 0.3)' }}
              title="Reset profile back to clean NovaPulse initial state"
            >
              <RotateCcw size={14} />
              <span>Reset Demo</span>
            </button>
          )}
        </div>
      </div>

      {/* Storage Architecture Disclosure Banner */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: 'var(--color-sand)',
        border: '1px solid var(--color-sand-dark)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={15} color="var(--color-deep-teal)" />
          <span>
            <strong>Persistence Architecture:</strong> {STORAGE_DISCLOSURE}
          </span>
        </div>
        <span className="text-mono" style={{ color: 'var(--color-text-muted)' }}>
          Active Brand ID: {brandProfile.id} • Last Updated: {new Date(brandProfile.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Primary Actions & Tabs Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--color-sand-dark)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-dark' : 'btn-secondary'}`}
          >
            All Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('prohibited_language')}
            className={`btn btn-sm ${activeTab === 'prohibited_language' ? 'btn-dark' : 'btn-secondary'}`}
          >
            Prohibited Phrases
          </button>
          <button
            onClick={() => setActiveTab('factual_claim')}
            className={`btn btn-sm ${activeTab === 'factual_claim' ? 'btn-dark' : 'btn-secondary'}`}
          >
            Factual Claims
          </button>
          <button
            onClick={() => setActiveTab('required_disclosure')}
            className={`btn btn-sm ${activeTab === 'required_disclosure' ? 'btn-dark' : 'btn-secondary'}`}
          >
            Required Disclosures
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`btn btn-sm ${activeTab === 'evidence' ? 'btn-dark' : 'btn-secondary'}`}
          >
            <FileCheck size={14} />
            <span>Approved Evidence ({evidenceRecords.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('voice_summary')}
            className={`btn btn-sm ${activeTab === 'voice_summary' ? 'btn-dark' : 'btn-secondary'}`}
          >
            <Layers size={14} />
            <span>Voice & Lexicon Overview</span>
          </button>
        </div>

        {/* Add Rule Button */}
        <div>
          <button
            onClick={() => {
              setEditingRule(null);
              setIsRuleModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>Add Brand Rule</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (shown when viewing rules) */}
      {activeTab !== 'evidence' && activeTab !== 'voice_summary' && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search rules by ID, name, description, or regex pattern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', paddingRight: '12px', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="form-select"
              style={{ fontSize: '13px', width: 'auto' }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
              <option value="info">Info Only</option>
            </select>

            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="form-select"
              style={{ fontSize: '13px', width: 'auto' }}
            >
              <option value="all">All Engines</option>
              <option value="deterministic">⚡ Deterministic Only</option>
              <option value="ai_contextual">🧠 AI Contextual Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Tab 1: Voice & Lexicon Overview */}
      {activeTab === 'voice_summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="title-section" style={{ fontSize: '15px' }}>
              Voice & Tone Guidelines ({brandProfile.voiceGuidelines?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {brandProfile.voiceGuidelines?.map((g, idx) => (
                <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                  • {g}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="title-section" style={{ fontSize: '15px' }}>
              Prohibited Phrases Lexicon ({brandProfile.prohibitedPhrases?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {brandProfile.prohibitedPhrases?.map((p, idx) => (
                <span key={idx} className="badge badge-critical" style={{ textTransform: 'none' }}>
                  "{p}"
                </span>
              ))}
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="title-section" style={{ fontSize: '15px' }}>
              Mandatory Legal Disclosures ({brandProfile.disclosures?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {brandProfile.disclosures?.map((d, idx) => (
                <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  § {d}
                </div>
              ))}
            </div>
          </div>

          {brandProfile.visualGuidelines && brandProfile.visualGuidelines.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 className="title-section" style={{ fontSize: '15px' }}>
                Visual Brand Guidance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {brandProfile.visualGuidelines.map((v, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                    ✦ {v}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Approved Evidence Library */}
      {activeTab === 'evidence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 className="title-section">Approved Empirical Evidence Claims</h2>
            <p className="text-muted" style={{ fontSize: '13px' }}>
              Factual claims in marketing copy must map to an active citation in this repository to receive Verified status.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {evidenceRecords.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  borderLeft: '4px solid var(--color-mint)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-mono" style={{ fontWeight: 600, color: 'var(--color-deep-teal)', fontSize: '13px' }}>
                    {item.id}
                  </span>
                  <span className="badge badge-success">
                    <Check size={12} /> Verified Baseline
                  </span>
                </div>

                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-midnight-ink)', lineHeight: 1.5 }}>
                  "{item.claim}"
                </p>

                <div style={{ backgroundColor: 'var(--color-sand)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <strong>Source Citation:</strong> {item.sourceCitation}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <span>Verified: {item.dateAdded}</span>
                  <span>Expires: {item.expirationDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Rules Grid View */}
      {activeTab !== 'evidence' && activeTab !== 'voice_summary' && (
        <>
          {filteredRules.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
                No brand governance rules match your current query or category filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSeverity('all');
                  setSelectedEngine('all');
                  setActiveTab('all');
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px' }}
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
              {filteredRules.map((rule) => {
                const stripeColor =
                  rule.severity === 'critical'
                    ? 'var(--color-coral)'
                    : rule.severity === 'warning'
                    ? 'var(--color-warm-peach)'
                    : 'var(--color-lavender)';

                return (
                  <div
                    key={rule.id}
                    className="card"
                    style={{
                      borderLeft: `4px solid ${stripeColor}`,
                      opacity: rule.active ? 1 : 0.65,
                      transition: 'all var(--motion-control) var(--ease-control)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      {/* Top Header of Rule Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="text-mono" style={{ fontWeight: 700, color: 'var(--color-deep-teal)', fontSize: '13px' }}>
                            {rule.id}
                          </span>
                          <SeverityBadge severity={rule.severity} />
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {rule.engine === 'deterministic' ? '⚡ Deterministic' : '🧠 AI Contextual'}
                          </span>
                        </div>

                        {/* Interactive Active Toggle Switch */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: rule.active ? 'var(--color-deep-teal)' : 'var(--color-text-muted)' }}>
                            {rule.active ? 'Active' : 'Disabled'}
                          </span>
                          <label className="switch" title={`Toggle rule ${rule.id} enabled/disabled`}>
                            <input
                              type="checkbox"
                              checked={rule.active}
                              onChange={() => handleToggleRule(rule.id)}
                            />
                            <span className="switch-slider" />
                          </label>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-midnight-ink)', marginTop: '8px' }}>
                        {rule.name}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>
                        {rule.description}
                      </p>

                      <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        <span className="text-muted">Target Pattern: </span>
                        <code className="text-mono" style={{ color: 'var(--color-deep-teal)', fontWeight: 600 }}>
                          {rule.pattern}
                        </code>
                      </div>

                      {rule.suggestedReplacement && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-deep-teal)' }}>Suggestion: </span>
                          <span>"{rule.suggestedReplacement}"</span>
                        </div>
                      )}

                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Rationale: {rule.explanation}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-sand-dark)', paddingTop: '8px', marginTop: '6px' }}>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        Updated: {new Date(rule.updatedAt).toLocaleDateString()}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsRuleModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="Edit rule pattern, description or severity"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeletingRule(rule)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="Delete this rule from brand policy"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal 1: Brand Profile Editor / Creator */}
      {isProfileModalOpen && (
        <BrandProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveProfileMetadata}
          existingProfile={brandProfile}
          allProfiles={allProfiles}
        />
      )}

      {/* Modal 2: Rule Editor (Add / Edit) */}
      {isRuleModalOpen && (
        <RuleEditorModal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setEditingRule(null);
          }}
          onSave={handleSaveRule}
          existingRule={editingRule}
          currentRules={rules}
          brandIdPrefix={brandProfile.name.substring(0, 3).toUpperCase()}
        />
      )}

      {/* Modal 3: Version History Viewer */}
      {isHistoryModalOpen && (
        <VersionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          brandProfile={brandProfile}
        />
      )}

      {/* Modal 4: Rule Deletion Confirmation Dialog */}
      {deletingRule && (
        <ModalDialog
          isOpen={Boolean(deletingRule)}
          title="Confirm Rule Removal"
          onClose={() => setDeletingRule(null)}
          footer={
            <>
              <button onClick={() => setDeletingRule(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRule(deletingRule)}
                className="btn btn-danger"
              >
                Yes, Delete Rule {deletingRule.id}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-coral)' }}>
              <AlertTriangle size={24} />
              <span style={{ fontSize: '15px', fontWeight: 600 }}>
                Are you sure you want to remove rule {deletingRule.id}?
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Deleting <strong>"{deletingRule.name}"</strong> will increment the brand ruleset version and remove this rule from all future content scans. Historical audit events will continue to reference this rule ID.
            </p>
          </div>
        </ModalDialog>
      )}

      {/* Modal 5: Reset to Demonstration Baseline Confirmation */}
      {isResetConfirmOpen && (
        <ModalDialog
          isOpen={isResetConfirmOpen}
          title="Reset BrandGuard Demonstration Data"
          onClose={() => setIsResetConfirmOpen(false)}
          footer={
            <>
              <button onClick={() => setIsResetConfirmOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetSeed();
                  setIsResetConfirmOpen(false);
                  onShowToast('BrandGuard reset back to initial NovaPulse demonstration baseline.');
                }}
                className="btn btn-danger"
              >
                Confirm Reset
              </button>
            </>
          }
        >
          <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            This will restore the NovaPulse demonstration profile to its original v2.1 baseline rules and clear any custom edits from your browser storage.
          </p>
        </ModalDialog>
      )}
    </div>
  );
};
