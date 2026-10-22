import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  badge,
  onClick
}) => {
  return (
    <article
      className="card"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '110px'
      }}
      onClick={onClick}
      aria-label={`${label}: ${value}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        <div style={{ color: 'var(--color-deep-teal)', display: 'flex', alignItems: 'center' }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 4px 0' }}>
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-midnight-ink)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {badge}
      </div>

      <span className="text-muted" style={{ fontSize: '12px' }}>
        {subtext}
      </span>
    </article>
  );
};
