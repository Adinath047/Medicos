import React from 'react';
import { Avatar } from './Avatar';
import { useAuthStore } from '../hooks/useAuthStore';

interface NavItem {
  label: string;
  icon: string;
  page: string;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items, activePage, onNavigate, isOpen = false, onClose,
}) => {
  const { user, role, logout } = useAuthStore();

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onClose?.(); // auto-close drawer on mobile after navigation
  };

  return (
    <>
      {/* Dark backdrop — mobile only */}
      <div
        className={`sidebar-backdrop${isOpen ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo">M</div>
          <div>
            <div className="brand-name">Medicos</div>
            <div className="brand-tagline">Hospital Management</div>
          </div>
          {/* Close button — mobile only */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {items.map((item) => (
            <div
              key={item.page}
              className={`nav-item${activePage === item.page ? ' active' : ''}`}
              onClick={() => handleNavigate(item.page)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? (
                <span className="nav-badge">{item.badge}</span>
              ) : null}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={logout} title="Click to logout">
            <Avatar uri={user?.photoURL} name={user?.name ?? 'U'} size={36} />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? 'User'}</div>
              <div className="sidebar-user-role">
                {role} · Logout
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
