import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => (
  <span className={`badge badge-${variant}`}>{label}</span>
);
