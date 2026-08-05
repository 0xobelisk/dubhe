'use client';

import { memo } from 'react';
import type { BuildingMeta } from '../lib/constants';
import { MAP_H, MAP_W } from '../lib/constants';

/**
 * Pixel-art building drawn with SVG rects. One base house shape, with a
 * per-kind decoration (flag, crops, awning, pier, chimney, sign).
 */
export const BuildingSprite = memo(function BuildingSprite({
  b,
  night = false
}: {
  b: BuildingMeta;
  night?: boolean;
}) {
  const wTiles = 6;
  const hTiles = 5.5;
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${((b.x - wTiles / 2) / MAP_W) * 100}%`,
        top: `${((b.y - hTiles + 1) / MAP_H) * 100}%`,
        width: `${(wTiles / MAP_W) * 100}%`
      }}
    >
      <svg viewBox="0 0 24 22" shapeRendering="crispEdges" className="w-full">
        <Decor kind={b.kind} wall={b.wall} roof={b.roof} trim={b.trim} night={night} />
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-full w-max -translate-x-1/2 bg-night/70 px-1 py-0.5 text-[7px] leading-none text-gold">
        {b.label}
      </div>
    </div>
  );
});

function Decor({
  kind,
  wall,
  roof,
  trim,
  night
}: {
  kind: number;
  wall: string;
  roof: string;
  trim: string;
  night: boolean;
}) {
  const dark = '#1a1c2c';
  // Windows glow warm at night — the town looks inhabited after dusk.
  const glass = night ? '#ffcd75' : '#5fcde4';
  const base = (
    <>
      {/* roof */}
      <polygon points="2,8 12,1 22,8" fill={roof} />
      <polygon points="4,8 12,2.5 20,8" fill={roof} />
      <rect x="2" y="7" width="20" height="2" fill={trim} />
      {/* walls */}
      <rect x="4" y="9" width="16" height="9" fill={wall} />
      <rect x="4" y="9" width="16" height="1" fill={trim} />
      {/* door */}
      <rect x="10" y="13" width="4" height="5" fill={trim} />
      <rect x="11" y="14" width="2" height="4" fill={dark} />
      {/* windows */}
      <rect x="6" y="11" width="3" height="3" fill={glass} />
      <rect x="15" y="11" width="3" height="3" fill={glass} />
      <rect x="6" y="12" width="3" height="1" fill={dark} opacity="0.3" />
      <rect x="15" y="12" width="3" height="1" fill={dark} opacity="0.3" />
      {/* ground shadow */}
      <rect x="3" y="18" width="18" height="1" fill={dark} opacity="0.35" />
    </>
  );

  switch (kind) {
    case 1: // town hall — flag on the roof
      return (
        <>
          {base}
          <rect x="11.5" y="-3" width="1" height="5" fill={trim} />
          <rect x="12.5" y="-3" width="4" height="2" fill="#ffcd75" />
          <rect x="8" y="9" width="8" height="1" fill="#ffcd75" />
        </>
      );
    case 2: // farm — crop rows next to the house
      return (
        <>
          {base}
          <rect x="0" y="19" width="24" height="2" fill="#8f563b" />
          <rect x="1" y="19.5" width="2" height="1" fill="#6abe30" />
          <rect x="5" y="19.5" width="2" height="1" fill="#6abe30" />
          <rect x="9" y="19.5" width="2" height="1" fill="#6abe30" />
          <rect x="13" y="19.5" width="2" height="1" fill="#6abe30" />
          <rect x="17" y="19.5" width="2" height="1" fill="#6abe30" />
          <rect x="21" y="19.5" width="2" height="1" fill="#6abe30" />
        </>
      );
    case 3: // cafe — striped awning
      return (
        <>
          {base}
          <rect x="4" y="10" width="16" height="2" fill="#fff" />
          <rect x="4" y="10" width="2" height="2" fill="#b13e53" />
          <rect x="8" y="10" width="2" height="2" fill="#b13e53" />
          <rect x="12" y="10" width="2" height="2" fill="#b13e53" />
          <rect x="16" y="10" width="2" height="2" fill="#b13e53" />
          <rect x="6" y="5" width="2" height="3" fill="#94b0c2" />
        </>
      );
    case 4: // dock — pier planks into the water
      return (
        <>
          {base}
          <rect x="18" y="18" width="8" height="2" fill="#8f563b" />
          <rect x="20" y="20" width="1" height="2" fill="#663931" />
          <rect x="24" y="20" width="1" height="2" fill="#663931" />
        </>
      );
    case 5: // workshop — chimney with smoke
      return (
        <>
          {base}
          <rect x="17" y="2" width="3" height="6" fill={trim} />
          <rect x="17.5" y="0.5" width="2" height="1" fill="#94b0c2" opacity="0.8" />
          <rect x="19" y="-1" width="1.5" height="1" fill="#94b0c2" opacity="0.5" />
          <rect x="5" y="15" width="3" height="3" fill="#696a6a" />
        </>
      );
    case 6: // tavern — hanging sign
      return (
        <>
          {base}
          <rect x="2" y="10" width="1" height="4" fill={trim} />
          <rect x="0.5" y="12" width="4" height="3" fill="#ffcd75" />
          <rect x="1.5" y="13" width="2" height="1" fill={roof} />
        </>
      );
    default:
      return base;
  }
}
