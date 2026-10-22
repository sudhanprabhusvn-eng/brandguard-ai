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
        padding: '16px 18px',
        minHeight: '100px',
        borderRadius: 'var(--radius-md)'
      }}
      onClick={onClick}
      aria-label={`${label}: ${value}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.01em' }}>
          {label}
        </span>
        <div style={{ color: 'var(--color-deep-teal)', opacity: 0.85, display: 'flex', alignItems: 'center' }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px 0' }}>
        <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-midnight-ink)', letterSpacing: '-0.025em' }}>
          {value}
        </span>
        {badge}
      </div>

      <span className="text-muted" style={{ fontSize: '11.5px' }}>
        {subtext}
      </span>
    </article>
  );
};
