import React, { useState, useMemo } from 'react';
import type {
  AuditEvent,
  BrandProfile,
  SubmittedContent,
  ApprovalDecisionRecord,
  PersonaRole,
  PageId
} from '../types';
import { auditService } from '../services/auditService.ts';
import {
  Download,
  Filter,
  Calendar,
  User,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Search,
  Printer,
  GitBranch,
  Layers,
  Info,
  RefreshCw
} from 'lucide-react';

interface AuditReportsPageProps {
  auditLogs: AuditEvent[];
  brandProfiles: BrandProfile[];
  savedSubmissions?: SubmittedContent[];
  decisions?: ApprovalDecisionRecord[];
  activeProfile: BrandProfile;
  currentRole: PersonaRole;
  onNavigate: (page: PageId) => void;
  onShowToast: (message: string) => void;
}

type TabMode = 'dashboard' | 'timeline' | 'lifecycle';

function computeDateRangeBounds(filter: 'all' | '7d' | '30d'): { start: string; end: string } | undefined {
  if (filter === 'all') return undefined;
  const now = new Date();
  const days = filter === '7d' ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { start, end: now.toISOString() };
}

export const AuditReportsPage: React.FC<AuditReportsPageProps> = ({
  auditLogs,
  brandProfiles,
  savedSubmissions = [],
  decisions = [],
  activeProfile,
  currentRole,
  onNavigate,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('dashboard');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [selectedContentIdForLifecycle, setSelectedContentIdForLifecycle] = useState<string>(
    savedSubmissions[0]?.id || ''
  );
  const [chainVerifyResult, setChainVerifyResult] = useState<{
    tested: boolean;
    isValid: boolean;
    message: string;
  } | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const pageSize = 15;

  // Calculate Date Bounds
  const dateBounds = useMemo(() => {
    return computeDateRangeBounds(dateRangeFilter);
  }, [dateRangeFilter]);

  // Compute Governance Metrics strictly from genuine persisted data
  const metrics = useMemo(() => {
    return auditService.computeGovernanceMetrics(
      auditLogs,
      savedSubmissions,
      decisions,
      {
        brandId: selectedBrandId === 'all' ? undefined : selectedBrandId,
        dateRange: dateBounds
      }
    );
  }, [auditLogs, savedSubmissions, decisions, selectedBrandId, dateBounds]);

  // Filter audit logs for the timeline
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Brand filter
      if (selectedBrandId !== 'all') {
        if (log.brandId && log.brandId !== selectedBrandId) return false;
      }
      // Date range filter
      if (dateBounds?.start) {
        const logTime = new Date(log.timestamp).getTime();
        const startTime = new Date(dateBounds.start).getTime();
        if (logTime < startTime) return false;
      }
      // Event type filter
      if (eventTypeFilter !== 'all') {
        if (log.eventType !== eventTypeFilter) return false;
      }
      // Outcome filter
      if (outcomeFilter !== 'all') {
        const logOutcome = log.outcome || 'SUCCESS';
        if (logOutcome !== outcomeFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = log.documentTitle?.toLowerCase().includes(q);
        const summaryMatch = log.summary?.toLowerCase().includes(q);
        const actorMatch = log.actorName?.toLowerCase().includes(q);
        const ruleMatch = log.ruleVersion?.toLowerCase().includes(q) || log.ruleId?.toLowerCase().includes(q);
        const hashMatch = log.contentHash?.toLowerCase().includes(q);
        if (!titleMatch && !summaryMatch && !actorMatch && !ruleMatch && !hashMatch) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, selectedBrandId, dateBounds, eventTypeFilter, outcomeFilter, searchQuery]);

  // Paginated timeline records
  const paginatedLogs = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, pageNumber, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  // Reconstructed lifecycle for selected content item
  const activeLifecycle = useMemo(() => {
    if (!selectedContentIdForLifecycle) return null;
    return auditService.reconstructLifecycle(
      selectedContentIdForLifecycle,
      savedSubmissions,
      auditLogs,
      decisions
    );
  }, [selectedContentIdForLifecycle, savedSubmissions, auditLogs, decisions]);

  // CSV Export with formula injection defense
  const handleExportCsv = () => {
    const brandName =
      selectedBrandId === 'all'
        ? 'All Brands'
        : brandProfiles.find((b) => b.id === selectedBrandId)?.name || selectedBrandId;
    const filterDesc = `Brand: ${brandName}, DateRange: ${dateRangeFilter}, EventType: ${eventTypeFilter}`;
    const csvContent = auditService.exportAuditCsv(filteredLogs, filterDesc, {
      brandName,
      exportedBy: `${currentRole === 'brand_manager' ? 'Brand Manager' : 'Authorized Reviewer'} (${currentRole})`
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandguard-audit-ledger-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(`Exported ${filteredLogs.length} audit records to CSV.`);
  };

  // Structured JSON Export
  const handleExportJson = () => {
    const brandName =
      selectedBrandId === 'all'
        ? 'All Brands'
        : brandProfiles.find((b) => b.id === selectedBrandId)?.name || selectedBrandId;
    const filterDesc = `Brand: ${brandName}, DateRange: ${dateRangeFilter}`;
    const jsonContent = auditService.exportAuditJson(filteredLogs, metrics, filterDesc, {
      brandName,
      exportedBy: `${currentRole.replace('_', ' ')} (Compliance Lead)`
    });

    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandguard-governance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported complete governance report as JSON.');
  };

  // Browser Print View (PDF Save)
  const handlePrint = () => {
    window.print();
  };

  // Cryptographic Hash Chain Verification
  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    try {
      const res = await auditService.verifyAuditChainIntegrity(auditLogs);
      setChainVerifyResult({
        tested: true,
        isValid: res.isValid,
        message: res.message
      });
      onShowToast(res.isValid ? 'Audit chain integrity verified.' : 'Audit chain anomaly detected!');
    } catch {
      setChainVerifyResult({
        tested: true,
        isValid: false,
        message: 'Chain verification encountered an unexpected error.'
      });
    } finally {
      setIsVerifyingChain(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="title-display">Audit & Governance Ledger</h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-sand-light)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.04em'
              }}
            >
              Cryptographic Hash Chain
            </span>
          </div>
          <p className="text-muted" style={{ marginTop: '4px', maxWidth: '720px' }}>
            Traceable, append-only register of every content submission, evaluation run, surgical correction, and human approval decision. Active baseline: <strong>{activeProfile.name} ({activeProfile.version})</strong>.
          </p>
        </div>

        {/* Action Controls: Export & Print */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCsv}
            className="btn btn-secondary"
            title="Download CSV export with formula injection defense"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="btn btn-secondary"
            title="Download structured JSON audit report"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-dark"
            title="Print or save compliance summary as PDF via browser print"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            <Printer size={14} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Honest Storage & Integrity Disclosure Banner */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          backgroundColor: 'rgba(255, 182, 133, 0.12)',
          borderLeft: '4px solid var(--color-warm-peach)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={18} color="var(--color-warm-peach)" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
              Storage & Cryptographic Integrity Disclosure:
            </span>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
              Governance records are maintained with SHA-256 sequential cryptographic hash chaining. Every policy update, content scan, and approval decision generates a cryptographically linked ledger block.
            </p>
          </div>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={isVerifyingChain}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
        >
          <RefreshCw size={13} className={isVerifyingChain ? 'animate-spin' : ''} />
          <span>{isVerifyingChain ? 'Verifying...' : 'Verify Hash Chain'}</span>
        </button>
      </div>

      {/* Chain Verification Status Toast / Notice if tested */}
      {chainVerifyResult && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: chainVerifyResult.isValid ? 'rgba(0, 229, 168, 0.12)' : 'rgba(240, 107, 112, 0.12)',
            border: `1px solid ${chainVerifyResult.isValid ? 'var(--color-mint)' : 'var(--color-coral)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {chainVerifyResult.isValid ? (
              <CheckCircle2 size={16} color="var(--color-mint)" />
            ) : (
              <AlertTriangle size={16} color="var(--color-coral)" />
            )}
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {chainVerifyResult.message}
            </span>
          </div>
          <button
            onClick={() => setChainVerifyResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Filter Bar: Brand Scope & Time Horizon */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Brand Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="var(--color-text-muted)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Brand Scope:</span>
          <select
            value={selectedBrandId}
            onChange={(e) => {
              setSelectedBrandId(e.target.value);
              setPageNumber(1);
            }}
            className="form-select"
            style={{ width: 'auto', fontSize: '13px', padding: '6px 12px' }}
          >
            <option value="all">All Brands ({brandProfiles.length})</option>
            {brandProfiles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.version})
              </option>
            ))}
          </select>
        </div>

        {/* Time Horizon Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={15} color="var(--color-text-muted)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Time Horizon:</span>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-sand-dark)' }}>
            <button
              onClick={() => {
                setDateRangeFilter('all');
                setPageNumber(1);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: dateRangeFilter === 'all' ? 'var(--color-deep-teal)' : 'var(--color-sand)',
                color: dateRangeFilter === 'all' ? '#fff' : 'var(--color-midnight-ink)',
                cursor: 'pointer'
              }}
            >
              All Time
            </button>
            <button
              onClick={() => {
                setDateRangeFilter('30d');
                setPageNumber(1);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderLeft: '1px solid var(--color-sand-dark)',
                backgroundColor: dateRangeFilter === '30d' ? 'var(--color-deep-teal)' : 'var(--color-sand)',
                color: dateRangeFilter === '30d' ? '#fff' : 'var(--color-midnight-ink)',
                cursor: 'pointer'
              }}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                setDateRangeFilter('7d');
                setPageNumber(1);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderLeft: '1px solid var(--color-sand-dark)',
                backgroundColor: dateRangeFilter === '7d' ? 'var(--color-deep-teal)' : 'var(--color-sand)',
                color: dateRangeFilter === '7d' ? '#fff' : 'var(--color-midnight-ink)',
                cursor: 'pointer'
              }}
            >
              Last 7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-sand-dark)', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'dashboard' ? '3px solid var(--color-deep-teal)' : '3px solid transparent',
            color: activeTab === 'dashboard' ? 'var(--color-deep-teal)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} />
          <span>Governance Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'timeline' ? '3px solid var(--color-deep-teal)' : '3px solid transparent',
            color: activeTab === 'timeline' ? 'var(--color-deep-teal)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Clock size={16} />
          <span>Audit Event Timeline ({filteredLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'lifecycle' ? '3px solid var(--color-deep-teal)' : '3px solid transparent',
            color: activeTab === 'lifecycle' ? 'var(--color-deep-teal)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <GitBranch size={16} />
          <span>Lifecycle Traceability</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GOVERNANCE DASHBOARD                                                */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>Total Submissions</span>
                <FileText size={18} color="var(--color-deep-teal)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--color-midnight-ink)' }}>
                {metrics.totalSubmissions}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {metrics.totalVersions} total versions drafted
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>Approved Releases</span>
                <CheckCircle2 size={18} color="var(--color-mint)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--color-midnight-ink)' }}>
                {metrics.approvedCount}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {metrics.standardApprovedCount} standard · {metrics.exceptionApprovedCount} exceptions
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>Awaiting Review</span>
                <Clock size={18} color="var(--color-warm-peach)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--color-midnight-ink)' }}>
                {metrics.awaitingReviewCount}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Pending human sign-off
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>Unresolved Violations</span>
                <AlertTriangle size={18} color="var(--color-coral)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--color-coral)' }}>
                {metrics.findingsBySeverity.critical}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {metrics.findingsBySeverity.warning} warnings across drafts
              </div>
            </div>
          </div>

          {/* Breakdown Grid: Severity Distribution & Evidence Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Finding Severity Breakdown */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="title-section" style={{ fontSize: '15px' }}>Findings by Severity</h3>
                <span className="text-muted" style={{ fontSize: '12px' }}>Latest Evaluated Versions</span>
              </div>
              <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                Aggregated count of active policy findings across evaluated content versions. Does not double-count multiple scans.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-coral)' }}>Critical Violations (Blocks Approval)</span>
                    <span style={{ fontWeight: 700 }}>{metrics.findingsBySeverity.critical}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-sand)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (metrics.findingsBySeverity.critical / Math.max(1, metrics.findingsBySeverity.critical + metrics.findingsBySeverity.warning + metrics.findingsBySeverity.info)) * 100)}%`,
                        height: '100%',
                        backgroundColor: 'var(--color-coral)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-warm-peach)' }}>Warning Breaches (Review Advised)</span>
                    <span style={{ fontWeight: 700 }}>{metrics.findingsBySeverity.warning}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-sand)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (metrics.findingsBySeverity.warning / Math.max(1, metrics.findingsBySeverity.critical + metrics.findingsBySeverity.warning + metrics.findingsBySeverity.info)) * 100)}%`,
                        height: '100%',
                        backgroundColor: 'var(--color-warm-peach)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Advisory & Clarifications</span>
                    <span style={{ fontWeight: 700 }}>{metrics.findingsBySeverity.info}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-sand)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (metrics.findingsBySeverity.info / Math.max(1, metrics.findingsBySeverity.critical + metrics.findingsBySeverity.warning + metrics.findingsBySeverity.info)) * 100)}%`,
                        height: '100%',
                        backgroundColor: 'var(--color-lavender)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-sand-dark)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Compliant Versions (0 findings):</span>
                <span style={{ fontWeight: 700, color: 'var(--color-mint)' }}>{metrics.compliantVersionsCount}</span>
              </div>
            </div>

            {/* Evidence Substantiation Status */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="title-section" style={{ fontSize: '15px' }}>Evidence Substantiation Status</h3>
                <span className="text-muted" style={{ fontSize: '12px' }}>Factual Claims</span>
              </div>
              <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                Status of empirical benchmarks and numerical performance claims checked against registered evidence records.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--color-mint)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Verified with Citation</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{metrics.evidenceChecks.verified}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="var(--color-coral)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Unverified Claims (Missing Study)</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-coral)' }}>{metrics.evidenceChecks.unverified}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} color="var(--color-text-muted)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Non-Empirical / General Language</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{metrics.evidenceChecks.na}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Triggered Governance Rules */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 className="title-section" style={{ fontSize: '15px' }}>Most Frequently Triggered Brand Rules</h3>
            <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
              Specific governance rules generating the highest breach volume across reviewed marketing copy.
            </p>

            {metrics.topTriggeredRules.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No rule breaches recorded in the selected horizon.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                {metrics.topTriggeredRules.map((rule, idx) => (
                  <div
                    key={rule.ruleId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-sand)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)' }}>#{idx + 1}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{rule.ruleName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ID: <code style={{ fontSize: '11px' }}>{rule.ruleId}</code> · Category: {rule.category}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: 'rgba(240, 107, 112, 0.14)',
                        color: 'var(--color-coral)',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      {rule.count} {rule.count === 1 ? 'incident' : 'incidents'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT EVENT TIMELINE                                                */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search and Secondary Filter Controls */}
          <div
            className="card"
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
              <Search size={15} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search event title, actor, rule or hash..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageNumber(1);
                }}
                className="form-input"
                style={{ paddingLeft: '34px', fontSize: '13px', width: '100%' }}
              />
            </div>

            {/* Event Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type:</span>
              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setPageNumber(1);
                }}
                className="form-select"
                style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="all">All Types</option>
                <option value="CONTENT_SUBMITTED">Content Ingestion</option>
                <option value="GOVERNANCE_EVALUATION_COMPLETED">Evaluation Run</option>
                <option value="APPROVAL_GRANTED">Approval Granted</option>
                <option value="REJECTION_RECORDED">Rejection Recorded</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="EXCEPTION_RECORDED">Exception Overrule</option>
                <option value="REVISION_SAVED">Revision Saved</option>
                <option value="VERSION_SUPERSEDED">Version Superseded</option>
              </select>
            </div>

            {/* Outcome Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Outcome:</span>
              <select
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  setPageNumber(1);
                }}
                className="form-select"
                style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="all">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="WARNING">WARNING</option>
              </select>
            </div>

            <span className="text-muted" style={{ fontSize: '12px' }}>
              Showing {filteredLogs.length} events
            </span>
          </div>

          {/* Timeline Stream */}
          {filteredLogs.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No audit events match your criteria</div>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Try resetting filters or expanding the time horizon.</p>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Timeline continuous vertical connecting line */}
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  backgroundColor: 'var(--color-sand-dark)'
                }}
              />

              {paginatedLogs.map((log) => {
                const isSuccess = log.outcome === 'SUCCESS' || log.eventType === 'APPROVAL_GRANTED' || log.eventType === 'APPROVED';
                const isBlocked = log.outcome === 'BLOCKED' || log.eventType === 'REJECTION_RECORDED' || log.eventType === 'REJECTED';
                const isWarning = log.outcome === 'WARNING' || log.eventType === 'CHANGES_REQUESTED' || log.eventType === 'EXCEPTION_RECORDED';

                const nodeBg = isBlocked ? 'var(--color-coral)' : isSuccess ? 'var(--color-mint)' : isWarning ? 'var(--color-warm-peach)' : 'var(--color-deep-teal)';

                return (
                  <div key={log.id} style={{ position: 'relative' }}>
                    {/* Timeline Node dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '18px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: nodeBg,
                        border: '3px solid var(--color-soft-white)',
                        boxShadow: '0 0 0 1px var(--color-sand-dark)'
                      }}
                    />

                    {/* Event Card */}
                    <div
                      className="card"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'border-color 0.15s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedEvent(log)}
                    >
                      {/* Top Bar of Event */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isBlocked ? 'rgba(240, 107, 112, 0.15)' : isSuccess ? 'rgba(0, 229, 168, 0.15)' : 'rgba(255, 182, 133, 0.2)',
                              color: isBlocked ? 'var(--color-coral)' : isSuccess ? 'var(--color-deep-teal)' : 'var(--color-midnight-ink)'
                            }}
                          >
                            {log.eventType}
                          </span>

                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-midnight-ink)' }}>
                            {log.documentTitle} ({log.contentVersion})
                          </span>

                          {log.outcome && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-sand)',
                                color: 'var(--color-text-muted)'
                              }}
                            >
                              {log.outcome}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          <Clock size={13} />
                          <span>{new Date(log.timestamp).toLocaleString()} (UTC)</span>
                        </div>
                      </div>

                      {/* Event Summary */}
                      <p style={{ fontSize: '13px', margin: 0, color: 'var(--color-midnight-ink)' }}>
                        {log.summary}
                      </p>

                      {/* Event Metadata Strip */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--color-text-muted)', paddingTop: '6px', borderTop: '1px solid var(--color-sand)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} />
                            <span>{log.actorName} ({log.actorRole})</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Shield size={12} />
                            <span>Ruleset: {log.ruleVersion || 'v2.1'}</span>
                          </div>

                          {log.contentHash && log.contentHash !== 'N/A' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>Hash:</span>
                              <code style={{ fontSize: '10px' }}>{log.contentHash.substring(0, 12)}...</code>
                            </div>
                          )}
                        </div>

                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-deep-teal)' }}>
                          Inspect Details &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Page {pageNumber} of {totalPages}
              </span>
              <button
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIFECYCLE TRACEABILITY INSPECTOR                                    */}
      {/* ========================================================================= */}
      {activeTab === 'lifecycle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Content Item Selector */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitBranch size={16} color="var(--color-deep-teal)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Content Item to Trace:</span>
              <select
                value={selectedContentIdForLifecycle}
                onChange={(e) => setSelectedContentIdForLifecycle(e.target.value)}
                className="form-select"
                style={{ width: 'auto', fontSize: '13px', padding: '6px 14px' }}
              >
                {savedSubmissions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.title} ({sub.brandProfileName} · {sub.versionNumber})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-muted" style={{ fontSize: '12px' }}>
              Traces complete lineage from ingestion to human approval decision
            </span>
          </div>

          {/* Render Lifecycle Journey */}
          {!activeLifecycle ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No lifecycle records found for this submission</div>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Submit a document in New Review to initiate governance tracking.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Document Overview Header */}
              <div style={{ borderBottom: '1px solid var(--color-sand-dark)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 className="title-section" style={{ fontSize: '18px' }}>{activeLifecycle.contentTitle}</h2>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      <span>Brand: <strong>{activeLifecycle.brandProfileName}</strong></span>
                      <span>Latest Version: <strong>{activeLifecycle.currentVersionNumber}</strong></span>
                      <span>First Ingested: <strong>{new Date(activeLifecycle.createdAt).toLocaleString()}</strong></span>
                    </div>
                  </div>
                  <span className="badge badge-accent">Traceable Lineage</span>
                </div>
              </div>

              {/* Step-by-Step Lifecycle Stages */}
              <div style={{ position: 'relative', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Connecting Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '12px',
                    bottom: '12px',
                    width: '2px',
                    backgroundColor: 'var(--color-sand-dark)'
                  }}
                />

                {activeLifecycle.stages.map((stage, sIdx) => {
                  const isBlocked = stage.outcome === 'BLOCKED';
                  const isSuccess = stage.outcome === 'SUCCESS';
                  const isDecision = stage.stage === 'DECISION';

                  return (
                    <div key={`${stage.stage}-${sIdx}`} style={{ position: 'relative' }}>
                      {/* Step Indicator Dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-27px',
                          top: '6px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: isBlocked ? 'var(--color-coral)' : isSuccess ? 'var(--color-mint)' : isDecision ? 'var(--color-deep-teal)' : 'var(--color-sand-dark)',
                          border: '3px solid var(--color-soft-white)',
                          boxShadow: '0 0 0 1px var(--color-sand-dark)'
                        }}
                      />

                      <div
                        style={{
                          backgroundColor: 'var(--color-sand)',
                          padding: '14px 18px',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-deep-teal)' }}>
                              STAGE {sIdx + 1}: {stage.stage}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{stage.title}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {new Date(stage.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <p style={{ fontSize: '13px', margin: 0, color: 'var(--color-midnight-ink)' }}>
                          {stage.summary}
                        </p>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          <span>Target Version: <strong>{stage.versionNumber}</strong></span>
                          {stage.actorName && (
                            <span>Actor: <strong>{stage.actorName} ({stage.actorRole})</strong></span>
                          )}
                          {stage.findingsCount !== undefined && (
                            <span>Findings: <strong>{stage.findingsCount} ({stage.criticalCount} Critical)</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EVENT DETAILS INSPECTOR MODAL                                             */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(20, 35, 35, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-sand-dark)', paddingBottom: '14px' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(14, 59, 58, 0.1)',
                    color: 'var(--color-deep-teal)'
                  }}
                >
                  AUDIT EVENT INSPECTION
                </span>
                <h3 className="title-section" style={{ fontSize: '18px', marginTop: '6px' }}>
                  {selectedEvent.eventType}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>

            {/* Properties Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', fontSize: '12px' }}>
              <div>
                <span className="text-muted">Event ID:</span>
                <div style={{ fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>{selectedEvent.id}</div>
              </div>

              <div>
                <span className="text-muted">Timestamp (UTC):</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedEvent.timestamp}</div>
              </div>

              <div>
                <span className="text-muted">Document Title:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedEvent.documentTitle}</div>
              </div>

              <div>
                <span className="text-muted">Content Version:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedEvent.contentVersion}</div>
              </div>

              <div>
                <span className="text-muted">Brand Name & Ruleset:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>
                  {selectedEvent.brandName || 'NovaPulse AI'} ({selectedEvent.ruleVersion || 'v2.1'})
                </div>
              </div>

              <div>
                <span className="text-muted">Recorded Actor:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>
                  {selectedEvent.actorName} ({selectedEvent.actorRole})
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted">Content SHA-256 Digest:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', backgroundColor: 'var(--color-sand)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all', marginTop: '2px' }}>
                  {selectedEvent.contentHash}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted">Sequential Event Hash (SHA-256):</span>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', backgroundColor: 'var(--color-sand)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all', marginTop: '2px' }}>
                  {selectedEvent.eventHash || 'Initial unchained record'}
                </div>
              </div>

              {selectedEvent.prevEventHash && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span className="text-muted">Linked Prior Event Hash:</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', backgroundColor: 'var(--color-sand)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all', marginTop: '2px' }}>
                    {selectedEvent.prevEventHash}
                  </div>
                </div>
              )}
            </div>

            {/* Description / Summary Box */}
            <div>
              <span className="text-muted" style={{ fontSize: '12px' }}>Event Summary:</span>
              <div style={{ marginTop: '4px', padding: '12px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                {selectedEvent.summary}
              </div>
            </div>

            {/* Structured Metadata Payload */}
            {selectedEvent.payload && (
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Structured Event Payload (Metadata):</span>
                <pre
                  style={{
                    marginTop: '4px',
                    padding: '12px',
                    backgroundColor: 'var(--color-midnight-ink)',
                    color: 'var(--color-mint)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    overflowX: 'auto',
                    fontFamily: 'monospace'
                  }}
                >
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-sand-dark)', paddingTop: '16px' }}>
              {(selectedEvent.eventType === 'APPROVAL_GRANTED' || selectedEvent.eventType === 'APPROVED' || selectedEvent.eventType === 'REJECTION_RECORDED' || selectedEvent.eventType === 'CHANGES_REQUESTED' || selectedEvent.eventType === 'EXCEPTION_RECORDED') && (
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    onNavigate('approvals');
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  View in Approval Queue &rarr;
                </button>
              )}
              {(selectedEvent.eventType === 'GOVERNANCE_EVALUATION_COMPLETED' || selectedEvent.eventType === 'SCANNED') && (
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    onNavigate('results');
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  View Analysis Results &rarr;
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
