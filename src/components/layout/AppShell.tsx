import React, { useState } from 'react';
import type { PageId, PersonaRole, BrandProfile } from '../../types';
import {
  LayoutDashboard,
  FileEdit,
  BookOpen,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  Activity,
  UserCheck,
  Plus
} from 'lucide-react';

interface AppShellProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  currentRole: PersonaRole;
  onRoleChange: (role: PersonaRole) => void;
  isAiDegraded: boolean;
  onToggleAiDegraded: () => void;
  activeProfile: BrandProfile;
  allProfiles: BrandProfile[];
  onSelectProfile: (id: string) => void;
  onCreateProfileClick: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  currentRole,
  onRoleChange,
  isAiDegraded,
  onToggleAiDegraded,
  activeProfile,
  allProfiles,
  onSelectProfile,
  onCreateProfileClick,
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Grouped Navigation: WORKSPACE & GOVERNANCE
  const workspaceItems = [
    { id: 'dashboard' as PageId, label: 'Overview', icon: <LayoutDashboard size={17} /> },
    {
      id: 'new_review' as PageId,
      label: 'Content Reviews',
      icon: <FileEdit size={17} />,
      isReviewGroup: true
    },
    { id: 'brand_dna' as PageId, label: 'Brand Rules', icon: <BookOpen size={17} /> }
  ];

  const governanceItems = [
    { id: 'approvals' as PageId, label: 'Approval Queue', icon: <CheckCircle size={17} /> },
    { id: 'audit' as PageId, label: 'Audit & Reports', icon: <FileText size={17} /> }
  ];

  const handleNavClick = (pageId: PageId) => {
    onNavigate(pageId);
    setIsMobileMenuOpen(false);
  };

  // Check if current page is within the review workflow
  const isReviewWorkflowActive = currentPage === 'new_review' || currentPage === 'results' || currentPage === 'fix_compare';

  return (
    <div className="app-shell">
      {/* Top Application Bar */}
      <header className="app-topbar">
        {/* Left: Brand Identity & Active Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ display: 'none', padding: '6px', backgroundColor: 'transparent', color: 'var(--color-soft-white)' }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            id="mobile-nav-toggle"
          >
            <Menu size={18} />
          </button>

          {/* Logo & Product Name */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
            title="Go to Overview"
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-mint)',
              color: 'var(--color-deep-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              <Shield size={16} strokeWidth={2.5} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-soft-white)' }}>
                BrandGuard AI
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: 'rgba(255, 252, 247, 0.1)',
                color: 'rgba(255, 252, 247, 0.75)',
                padding: '1px 6px',
                borderRadius: '3px',
                letterSpacing: '0.04em'
              }}>
                DEMO
              </span>
            </div>
          </div>

          {/* Subtle Vertical Divider */}
          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 252, 247, 0.12)' }} />

          {/* Discreet Brand Profile Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 252, 247, 0.06)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px'
          }}>
            <span style={{ color: 'rgba(255, 252, 247, 0.55)', fontSize: '12px' }}>Brand:</span>
            <select
              value={activeProfile.id}
              onChange={(e) => onSelectProfile(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-soft-white)',
                border: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                padding: '2px 4px',
                cursor: 'pointer',
                outline: 'none'
              }}
              aria-label="Select active brand profile"
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--color-midnight-ink)', color: 'var(--color-soft-white)' }}>
                  {p.name} ({p.version})
                </option>
              ))}
            </select>

            <button
              onClick={onCreateProfileClick}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-mint)',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Create new brand profile"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Right: Engine Status & Demo Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Dual Engine Status */}
          <button
            onClick={onToggleAiDegraded}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isAiDegraded ? 'rgba(255, 182, 133, 0.12)' : 'rgba(0, 229, 168, 0.10)',
              color: isAiDegraded ? 'var(--color-warm-peach)' : 'var(--color-mint)',
              border: `1px solid ${isAiDegraded ? 'rgba(255, 182, 133, 0.3)' : 'rgba(0, 229, 168, 0.3)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: '11.5px',
              fontWeight: 500,
              padding: '3px 8px',
              cursor: 'pointer'
            }}
            title="Toggle simulated AI engine availability"
          >
            <Activity size={12} />
            <span>{isAiDegraded ? 'Deterministic Only' : 'Dual Engine Active'}</span>
          </button>

          {/* Persona Role Switcher (Restrained Demo Indicator) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11.5px', color: 'rgba(255, 252, 247, 0.55)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <UserCheck size={13} />
            </span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as PersonaRole)}
              style={{
                backgroundColor: 'rgba(255, 252, 247, 0.08)',
                color: 'var(--color-soft-white)',
                border: '1px solid rgba(255, 252, 247, 0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
              title="Client-side demo role simulation for testing authorization gates"
              aria-label="Active persona role (Demo mode)"
            >
              <option value="creator" style={{ backgroundColor: 'var(--color-midnight-ink)' }}>Creator (Demo)</option>
              <option value="brand_manager" style={{ backgroundColor: 'var(--color-midnight-ink)' }}>Brand Manager (Demo)</option>
              <option value="approver" style={{ backgroundColor: 'var(--color-midnight-ink)' }}>Approver (Demo)</option>
              <option value="admin" style={{ backgroundColor: 'var(--color-midnight-ink)' }}>Admin (Demo)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main App Body */}
      <div className="app-body">
        {/* Left Navigation Sidebar */}
        <aside
          className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          aria-label="Primary Navigation"
        >
          <div style={{ paddingTop: '8px' }}>
            {/* Section 1: WORKSPACE */}
            {!isSidebarCollapsed && (
              <div className="nav-section-title">Workspace</div>
            )}
            <nav>
              {workspaceItems.map((item) => {
                const isActive = item.isReviewGroup ? isReviewWorkflowActive : currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    title={isSidebarCollapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    {!isSidebarCollapsed && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Contextual Sub-Links for Content Review Workflow when on results or fix_compare */}
            {!isSidebarCollapsed && isReviewWorkflowActive && (
              <div style={{
                marginLeft: '36px',
                marginRight: '12px',
                marginTop: '4px',
                marginBottom: '8px',
                paddingLeft: '10px',
                borderLeft: '1px solid rgba(255, 252, 247, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <button
                  onClick={() => handleNavClick('new_review')}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: currentPage === 'new_review' ? 'var(--color-mint)' : 'rgba(255, 252, 247, 0.65)',
                    fontWeight: currentPage === 'new_review' ? 600 : 400,
                    padding: '3px 0',
                    cursor: 'pointer'
                  }}
                >
                  • New Submission
                </button>
                <button
                  onClick={() => handleNavClick('results')}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: currentPage === 'results' ? 'var(--color-mint)' : 'rgba(255, 252, 247, 0.65)',
                    fontWeight: currentPage === 'results' ? 600 : 400,
                    padding: '3px 0',
                    cursor: 'pointer'
                  }}
                >
                  • Analysis Findings
                </button>
                <button
                  onClick={() => handleNavClick('fix_compare')}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: currentPage === 'fix_compare' ? 'var(--color-mint)' : 'rgba(255, 252, 247, 0.65)',
                    fontWeight: currentPage === 'fix_compare' ? 600 : 400,
                    padding: '3px 0',
                    cursor: 'pointer'
                  }}
                >
                  • Fix & Compare
                </button>
              </div>
            )}

            {/* Section 2: GOVERNANCE */}
            <div style={{ height: '12px' }} />
            {!isSidebarCollapsed && (
              <div className="nav-section-title">Governance</div>
            )}
            <nav>
              {governanceItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    title={isSidebarCollapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    {!isSidebarCollapsed && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Collapse Action */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid rgba(255, 252, 247, 0.08)',
            display: 'flex',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-end'
          }}>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{
                backgroundColor: 'rgba(255, 252, 247, 0.06)',
                color: 'rgba(255, 252, 247, 0.75)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>
        </aside>

        {/* Viewport Content Area */}
        <main className="app-main" id="main-content">
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
