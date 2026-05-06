import React from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, actions, onMenuToggle }) => (
  <header className="topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Hamburger — only visible on mobile via CSS */}
      <button
        className="hamburger-btn"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
      >
        <span />
        <span />
        <span />
      </button>
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
    </div>
    {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
  </header>
);
