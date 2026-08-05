'use client';

import { memo } from 'react';
import { ACTIVITY_GLYPH, paletteFor } from '../lib/constants';

interface Props {
  agentId: string;
  name: string;
  activity: number;
  selected: boolean;
  bubble?: string;
  onClick: () => void;
  /** Percentage position within the map container. */
  leftPct: number;
  topPct: number;
}

/** A little 12x16 pixel villager, drawn with SVG rects (crisp edges). */
export const AgentSprite = memo(function AgentSprite({
  agentId,
  name,
  activity,
  selected,
  bubble,
  onClick,
  leftPct,
  topPct
}: Props) {
  const p = paletteFor(agentId);
  const glyph = ACTIVITY_GLYPH[activity];
  const sleeping = activity === 1;

  return (
    <div
      className="absolute z-20 cursor-pointer"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: '4%',
        transform: 'translate(-50%, -85%)',
        transition: 'left 1.2s steps(12, end), top 1.2s steps(12, end)'
      }}
      onClick={onClick}
      title={name}
    >
      {bubble && (
        <div
          className="animate-bubble pixel-border absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[170px] bg-cream px-2 py-1.5 text-[7px] leading-relaxed text-night"
          style={{ transform: 'translateX(-50%)' }}
        >
          {bubble}
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-cream" />
        </div>
      )}

      {glyph && !bubble && (
        <div className="animate-blink absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-gold">
          {glyph}
        </div>
      )}

      <div className={sleeping ? '' : 'animate-bob'}>
        <svg
          viewBox="0 0 12 16"
          shapeRendering="crispEdges"
          className="w-full"
          style={selected ? { filter: 'drop-shadow(0 0 3px #ffcd75)' } : undefined}
        >
          {/* hair */}
          <rect x="3" y="0" width="6" height="2" fill={p.hair} />
          <rect x="2" y="1" width="8" height="2" fill={p.hair} />
          {/* face */}
          <rect x="3" y="3" width="6" height="4" fill={p.skin} />
          <rect x="4" y="4" width="1" height="1" fill="#1a1c2c" />
          <rect x="7" y="4" width="1" height="1" fill="#1a1c2c" />
          {/* body */}
          <rect x="2" y="7" width="8" height="5" fill={p.shirt} />
          <rect x="1" y="8" width="1" height="3" fill={p.skin} />
          <rect x="10" y="8" width="1" height="3" fill={p.skin} />
          {/* legs */}
          <rect x="3" y="12" width="2" height="3" fill={p.pants} />
          <rect x="7" y="12" width="2" height="3" fill={p.pants} />
          {/* boots */}
          <rect x="3" y="15" width="2" height="1" fill="#1a1c2c" />
          <rect x="7" y="15" width="2" height="1" fill="#1a1c2c" />
        </svg>
      </div>

      <div
        className={`mx-auto mt-0.5 w-max px-1 text-center text-[7px] leading-none ${
          selected ? 'bg-gold text-night' : 'bg-night/70 text-cream'
        }`}
      >
        {name}
      </div>
    </div>
  );
});
