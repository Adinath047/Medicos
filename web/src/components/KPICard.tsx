import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  colorBg: string;
  trend?: string;
  trendPositive?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title, value, subtitle, icon, color, colorBg, trend, trendPositive,
}) => (
  <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-bg': colorBg } as React.CSSProperties}>
    <div className="kpi-header">
      <div className="kpi-icon">{icon}</div>
      {trend && (
        <span className={`kpi-trend ${trendPositive !== false ? 'positive' : 'neutral'}`}>
          {trendPositive !== false ? '↑' : '→'} {trend}
        </span>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
    </div>
  </div>
);
