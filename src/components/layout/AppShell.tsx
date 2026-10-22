import React, { useState } from 'react';
import type { PageId, PersonaRole, BrandProfile } from '../../types';
import {
  Home,
  FileEdit,
  BookOpen,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  User,
  Plus,
  Lightbulb,
  ChevronDown
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
            title="Go to Overview"
          >
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-mint)',
              color: 'var(--color-deep-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0, 210, 150, 0.3)'
            }}>
              <Shield size={18} strokeWidth={2.4} />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              BrandGuard AI
            </span>
          </div>

          {/* Discreet Brand Profile Selector Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '5px 14px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '13px'
          }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '12px' }}>Brand:</span>
            <select
              value={activeProfile.id}
              onChange={(e) => onSelectProfile(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                outline: 'none'
              }}
              aria-label="Select active brand profile"
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--color-deep-teal)', color: '#FFFFFF' }}>
                  {p.name} ({p.version})
                </option>
              ))}
            </select>
            <ChevronDown size={13} color="rgba(255, 255, 255, 0.6)" />

            <button
              onClick={onCreateProfileClick}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-mint)',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '4px'
              }}
              title="Create new brand profile"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Right: Engine Status & Demo Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Engine Status Pill */}
          <button
            onClick={onToggleAiDegraded}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
            title="Toggle simulated AI engine availability"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isAiDegraded ? 'var(--color-warm-peach)' : 'var(--color-mint)',
              boxShadow: isAiDegraded ? 'none' : '0 0 8px rgba(0, 210, 150, 0.8)'
            }} />
            <span>Engine: {isAiDegraded ? 'Offline (Demo)' : 'Gemini (Demo)'}</span>
            <ChevronDown size={12} color="rgba(255, 255, 255, 0.6)" />
          </button>

          {/* Persona Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF'
            }}>
              <User size={16} color="rgba(255, 255, 255, 0.7)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1 }}>Role</span>
                <select
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as PersonaRole)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0
                  }}
                  title="Client-side demo role simulation"
                  aria-label="Active persona role (Demo mode)"
                >
                  <option value="brand_manager" style={{ backgroundColor: 'var(--color-deep-teal)' }}>Brand Manager (Demo)</option>
                  <option value="creator" style={{ backgroundColor: 'var(--color-deep-teal)' }}>Creator (Demo)</option>
                  <option value="approver" style={{ backgroundColor: 'var(--color-deep-teal)' }}>Approver (Demo)</option>
                  <option value="admin" style={{ backgroundColor: 'var(--color-deep-teal)' }}>Admin (Demo)</option>
                </select>
              </div>
            </div>

            {/* Avatar Pill */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-teal-tint)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              SD
            </div>
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
          <div style={{ paddingTop: '12px' }}>
            {/* Overview Button (Home) */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              title={isSidebarCollapsed ? 'Overview' : undefined}
            >
              <Home size={18} />
              {!isSidebarCollapsed && <span>Overview</span>}
            </button>

            {/* Section 1: WORKSPACE */}
            <div style={{ height: '8px' }} />
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

            {/* Contextual Sub-Links for Content Review Workflow */}
            {!isSidebarCollapsed && isReviewWorkflowActive && (
              <div style={{
                marginLeft: '36px',
                marginRight: '12px',
                marginTop: '4px',
                marginBottom: '8px',
                paddingLeft: '10px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
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
                    color: currentPage === 'new_review' ? 'var(--color-mint-bright)' : 'rgba(255, 255, 255, 0.65)',
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
                    color: currentPage === 'results' ? 'var(--color-mint-bright)' : 'rgba(255, 255, 255, 0.65)',
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
                    color: currentPage === 'fix_compare' ? 'var(--color-mint-bright)' : 'rgba(255, 255, 255, 0.65)',
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

          {/* Bottom Area: Promo Callout & Sidebar Collapse */}
          <div>
            {!isSidebarCollapsed && (
              <div className="sidebar-bottom-card">
                <Lightbulb size={20} color="var(--color-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>
                    Stronger Brands. Safer Content.
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '4px', lineHeight: 1.35 }}>
                    Evidence-based governance for modern marketing.
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Collapse Action */}
            <div style={{
              padding: '8px 14px',
              display: 'flex',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-end'
            }}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.75)',
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
