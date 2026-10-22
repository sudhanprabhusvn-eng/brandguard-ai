import React, { useState } from 'react';
import type { PageId, PersonaRole, BrandProfile } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  FileEdit,
  Search,
  GitCompare,
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

  const navigationItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'brand_dna' as PageId, label: 'Brand DNA & Rules', icon: <BookOpen size={18} /> },
    { id: 'new_review' as PageId, label: 'New Review', icon: <FileEdit size={18} /> },
    { id: 'results' as PageId, label: 'Analysis Results', icon: <Search size={18} /> },
    { id: 'fix_compare' as PageId, label: 'Fix & Compare', icon: <GitCompare size={18} /> },
    { id: 'approvals' as PageId, label: 'Approval Queue', icon: <CheckCircle size={18} /> },
    { id: 'audit' as PageId, label: 'Audit & Reports', icon: <FileText size={18} /> }
  ];

  const handleNavClick = (pageId: PageId) => {
    onNavigate(pageId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Ambient Visual Identity Layer */}
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
      </div>

      {/* Top Application Bar */}
      <header className="app-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ display: 'none', padding: '6px', backgroundColor: 'transparent', color: 'var(--color-soft-white)' }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            id="mobile-nav-toggle"
          >
            <Menu size={20} />
          </button>

          {/* Logo & Platform Name */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-mint)',
              color: 'var(--color-midnight-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(0, 229, 168, 0.4)'
            }}>
              <Shield size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-soft-white)' }}>
                  BrandGuard AI
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(0, 229, 168, 0.18)',
                  color: 'var(--color-mint)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em'
                }}>
                  PHASE 4
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Active Brand Profile Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 252, 247, 0.08)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px'
          }}>
            <span style={{ color: 'var(--color-sand-muted)' }}>Brand:</span>
            <select
              value={activeProfile.id}
              onChange={(e) => onSelectProfile(e.target.value)}
              className="form-select"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-soft-white)',
                borderColor: 'transparent',
                fontWeight: 600,
                fontSize: '13px',
                padding: '2px 6px',
                cursor: 'pointer'
              }}
              aria-label="Active Brand Profile"
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--color-midnight-ink)', color: 'var(--color-soft-white)' }}>
                  {p.name} ({p.version}) {p.isDemonstration ? '★ Demo' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={onCreateProfileClick}
              className="btn btn-sm"
              style={{
                backgroundColor: 'rgba(255, 252, 247, 0.12)',
                color: 'var(--color-mint)',
                border: 'none',
                padding: '2px 6px',
                fontSize: '11px',
                borderRadius: '4px'
              }}
              title="Create a new brand profile"
            >
              <Plus size={12} />
              <span>New Brand</span>
            </button>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Dual Engine / Degraded Toggle */}
          <button
            onClick={onToggleAiDegraded}
            className="btn btn-sm"
            style={{
              backgroundColor: isAiDegraded ? 'rgba(255, 182, 133, 0.16)' : 'rgba(0, 229, 168, 0.14)',
              color: isAiDegraded ? 'var(--color-warm-peach)' : 'var(--color-mint)',
              border: `1px solid ${isAiDegraded ? 'var(--color-warm-peach)' : 'rgba(0, 229, 168, 0.4)'}`,
              fontSize: '12px',
              padding: '4px 10px'
            }}
            title="Click to toggle simulated AI provider connectivity state"
          >
            <Activity size={13} />
            <span>
              {isAiDegraded ? 'Simulate: AI Offline (Deterministic Only)' : 'Engine: Dual Active ●'}
            </span>
          </button>

          {/* Persona Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-sand-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <UserCheck size={14} /> Role <span style={{ fontSize: '10px', opacity: 0.8 }}>(Demo Only)</span>:
            </span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as PersonaRole)}
              className="form-select"
              title="Client-side demo persona simulation. Does not enforce server-side authentication."
              style={{
                backgroundColor: 'var(--color-teal-tint)',
                color: 'var(--color-soft-white)',
                borderColor: 'rgba(255, 252, 247, 0.2)',
                padding: '5px 10px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              aria-label="Active Persona Role (Demo Mode Only)"
            >
              <option value="creator">Content Creator (Demo)</option>
              <option value="brand_manager">Brand Manager (Demo)</option>
              <option value="approver">Approver / Sign-Off (Demo)</option>
              <option value="admin">Administrator (Demo)</option>
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
          <div style={{ paddingTop: '16px' }}>
            <nav>
              {navigationItems.map((item) => {
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
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: 'rgba(255, 252, 247, 0.08)',
                color: 'var(--color-soft-white)',
                borderColor: 'transparent',
                padding: '6px'
              }}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
