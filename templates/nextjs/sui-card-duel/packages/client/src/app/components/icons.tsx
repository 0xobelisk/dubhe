/** Minimal inline SVG icon set for the Card Duel UI. */

export function IconCards({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="11" height="15" rx="2" fill="#6366f1" transform="rotate(-8 3 5)" />
      <rect
        x="9"
        y="4"
        width="11"
        height="15"
        rx="2"
        fill="#a855f7"
        stroke="#1e1b4b"
        strokeWidth="1"
        transform="rotate(8 9 4)"
      />
      <path d="M15.5 8l1 2 2 .3-1.5 1.5.4 2-1.9-1-1.9 1 .4-2L12.5 10l2-.3z" fill="#fde047" />
    </svg>
  );
}

export function IconSword({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 19l10-10 3-6-6 3L2 16z" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
      <path d="M4 20l2 2 3-1-4-4-1 3z" fill="#92400e" />
    </svg>
  );
}

export function IconShield({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"
        fill="#0ea5e9"
        stroke="#0c4a6e"
        strokeWidth="1.5"
      />
      <path d="M12 5l5 2v4c0 3.5-2.2 6.7-5 7.8V5z" fill="#38bdf8" opacity="0.6" />
    </svg>
  );
}

export function IconGold({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#92400e" strokeWidth="1" opacity="0.5" />
      <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#92400e">
        G
      </text>
    </svg>
  );
}

export function IconTrophy({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" />
      <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" stroke="#92400e" strokeWidth="1.5" />
      <path d="M11 14h2v3h-2z" fill="#fbbf24" />
      <rect x="8" y="17" width="8" height="3" rx="1" fill="#92400e" />
    </svg>
  );
}

export function IconMedal({ rank, size = 24 }: { rank: 1 | 2 | 3; size?: number }) {
  const colors: Record<number, [string, string]> = {
    1: ['#fbbf24', '#92400e'],
    2: ['#cbd5e1', '#475569'],
    3: ['#d97706', '#7c2d12']
  };
  const [fill, stroke] = colors[rank];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 2h3l-2 7H6zM16 2h-3l2 7h3z" fill={stroke} opacity="0.7" />
      <circle cx="12" cy="14" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="bold" fill={stroke}>
        {rank}
      </text>
    </svg>
  );
}

export function IconSkull({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3a8 8 0 0 0-8 8c0 3 1.5 5 3.5 6.2V20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2.8C18.5 16 20 14 20 11a8 8 0 0 0-8-8z"
        fill="#e2e8f0"
        stroke="#475569"
        strokeWidth="1.2"
      />
      <circle cx="9" cy="11" r="1.8" fill="#1e293b" />
      <circle cx="15" cy="11" r="1.8" fill="#1e293b" />
      <path d="M12 14l1 2.5h-2z" fill="#1e293b" />
    </svg>
  );
}
