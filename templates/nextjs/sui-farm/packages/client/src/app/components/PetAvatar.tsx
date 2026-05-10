/**
 * PetAvatar — pixel-art SVG pet portraits.
 * Each species has 3 visual stages keyed by level:
 *   Stage 0 (Lv 1-3)  : baby  — small, round, big eyes
 *   Stage 1 (Lv 4-6)  : young — medium size, recognisable features
 *   Stage 2 (Lv 7-10) : adult — full size, glowing accent pixels
 *
 * All on a 16×16 viewBox.  No external assets required.
 */

interface AvatarProps {
  size?: number;
  className?: string;
}
function R({ x, y, w = 1, h = 1, c }: { x: number; y: number; w?: number; h?: number; c: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={c} />;
}
const ISO: React.CSSProperties = { imageRendering: 'pixelated', display: 'block' };

// ─── BUNNY ───────────────────────────────────────────────────────────────────

function BunnyBaby({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Ears (tiny) */}
      <R x={5} y={2} w={1} h={3} c="#FFCCCC" />
      <R x={10} y={2} w={1} h={3} c="#FFCCCC" />
      {/* Head */}
      <R x={4} y={5} w={8} h={6} c="#F5F5F5" />
      <R x={3} y={6} w={10} h={4} c="#F5F5F5" />
      {/* Eyes */}
      <R x={5} y={7} w={2} h={2} c="#FF6B9D" />
      <R x={9} y={7} w={2} h={2} c="#FF6B9D" />
      {/* Nose */}
      <R x={7} y={10} w={2} h={1} c="#FF9BB5" />
      {/* Body (small blob) */}
      <R x={5} y={11} w={6} h={3} c="#F0F0F0" />
      {/* Shadow */}
      <R x={5} y={14} w={6} h={1} c="#D0D0D0" />
    </svg>
  );
}

function BunnyYoung({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Ears (longer) */}
      <R x={4} y={1} w={2} h={5} c="#F0D8D8" />
      <R x={10} y={1} w={2} h={5} c="#F0D8D8" />
      <R x={5} y={2} w={1} h={3} c="#FFAABB" />
      <R x={10} y={2} w={1} h={3} c="#FFAABB" />
      {/* Head */}
      <R x={3} y={5} w={10} h={7} c="#F5F5F5" />
      <R x={2} y={6} w={12} h={5} c="#F5F5F5" />
      {/* Eyes */}
      <R x={4} y={7} w={2} h={2} c="#FF6B9D" />
      <R x={10} y={7} w={2} h={2} c="#FF6B9D" />
      <R x={4} y={7} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={7} w={1} h={1} c="#FFFFFF" />
      {/* Nose + mouth */}
      <R x={7} y={10} w={2} h={1} c="#FF9BB5" />
      <R x={6} y={11} w={1} h={1} c="#FF9BB5" />
      <R x={9} y={11} w={1} h={1} c="#FF9BB5" />
      {/* Body */}
      <R x={4} y={12} w={8} h={3} c="#F0F0F0" />
      <R x={3} y={13} w={10} h={1} c="#F5F5F5" />
    </svg>
  );
}

function BunnyAdult({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Tall pointed ears */}
      <R x={3} y={0} w={2} h={6} c="#F0D8D8" />
      <R x={11} y={0} w={2} h={6} c="#F0D8D8" />
      <R x={4} y={1} w={1} h={4} c="#FF99BB" />
      <R x={11} y={1} w={1} h={4} c="#FF99BB" />
      {/* Glowing ear tips */}
      <R x={3} y={0} w={2} h={1} c="#FFD0E8" />
      <R x={11} y={0} w={2} h={1} c="#FFD0E8" />
      {/* Head */}
      <R x={2} y={5} w={12} h={7} c="#FFFFFF" />
      <R x={1} y={6} w={14} h={5} c="#FFFFFF" />
      {/* Eyes */}
      <R x={3} y={7} w={3} h={2} c="#FF3388" />
      <R x={10} y={7} w={3} h={2} c="#FF3388" />
      <R x={3} y={7} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={7} w={1} h={1} c="#FFFFFF" />
      {/* Nose */}
      <R x={7} y={10} w={2} h={1} c="#FF99BB" />
      <R x={5} y={11} w={2} h={1} c="#FFB8CC" />
      <R x={9} y={11} w={2} h={1} c="#FFB8CC" />
      {/* Body */}
      <R x={3} y={12} w={10} h={3} c="#F8F8F8" />
      <R x={2} y={13} w={12} h={2} c="#F0F0F0" />
      {/* Tummy */}
      <R x={6} y={13} w={4} h={2} c="#FFE8EE" />
    </svg>
  );
}

// ─── CHICK ───────────────────────────────────────────────────────────────────

function ChickBaby({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Round yellow body */}
      <R x={5} y={5} w={6} h={6} c="#FFE066" />
      <R x={4} y={6} w={8} h={4} c="#FFE066" />
      {/* Wing nubs */}
      <R x={3} y={7} w={2} h={2} c="#FFC840" />
      <R x={11} y={7} w={2} h={2} c="#FFC840" />
      {/* Eyes */}
      <R x={6} y={7} w={1} h={1} c="#1A1A1A" />
      <R x={9} y={7} w={1} h={1} c="#1A1A1A" />
      {/* Beak */}
      <R x={7} y={9} w={2} h={1} c="#FF8C00" />
      {/* Comb */}
      <R x={7} y={4} w={2} h={2} c="#FF4444" />
      <R x={6} y={4} w={1} h={1} c="#FF4444" />
      {/* Feet */}
      <R x={6} y={11} w={1} h={2} c="#FF8C00" />
      <R x={9} y={11} w={1} h={2} c="#FF8C00" />
      <R x={5} y={13} w={2} h={1} c="#FF8C00" />
      <R x={9} y={13} w={2} h={1} c="#FF8C00" />
    </svg>
  );
}

function ChickYoung({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Body */}
      <R x={4} y={6} w={8} h={7} c="#FFD633" />
      <R x={3} y={7} w={10} h={5} c="#FFD633" />
      {/* Wings */}
      <R x={2} y={8} w={2} h={3} c="#FFC020" />
      <R x={12} y={8} w={2} h={3} c="#FFC020" />
      <R x={2} y={9} w={1} h={1} c="#FFAA00" />
      <R x={13} y={9} w={1} h={1} c="#FFAA00" />
      {/* Head */}
      <R x={5} y={3} w={6} h={5} c="#FFE066" />
      <R x={4} y={4} w={8} h={4} c="#FFE066" />
      {/* Comb */}
      <R x={6} y={2} w={1} h={2} c="#FF3333" />
      <R x={8} y={1} w={2} h={3} c="#FF3333" />
      {/* Eyes */}
      <R x={5} y={5} w={2} h={2} c="#1A1A1A" />
      <R x={9} y={5} w={2} h={2} c="#1A1A1A" />
      <R x={5} y={5} w={1} h={1} c="#FFFFFF" />
      <R x={9} y={5} w={1} h={1} c="#FFFFFF" />
      {/* Beak */}
      <R x={7} y={7} w={2} h={2} c="#FF7700" />
      {/* Feet */}
      <R x={5} y={13} w={2} h={2} c="#FF8C00" />
      <R x={9} y={13} w={2} h={2} c="#FF8C00" />
      <R x={4} y={15} w={3} h={1} c="#FF8C00" />
      <R x={9} y={15} w={3} h={1} c="#FF8C00" />
    </svg>
  );
}

function ChickAdult({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Body */}
      <R x={3} y={7} w={10} h={7} c="#FFC800" />
      <R x={2} y={8} w={12} h={5} c="#FFC800" />
      {/* Wings spread */}
      <R x={1} y={8} w={2} h={4} c="#E8A800" />
      <R x={13} y={8} w={2} h={4} c="#E8A800" />
      <R x={0} y={9} w={2} h={2} c="#D09000" />
      <R x={14} y={9} w={2} h={2} c="#D09000" />
      {/* Tail feathers */}
      <R x={4} y={13} w={1} h={3} c="#FF9900" />
      <R x={7} y={14} w={2} h={2} c="#FF9900" />
      <R x={11} y={13} w={1} h={3} c="#FF9900" />
      {/* Head */}
      <R x={4} y={2} w={8} h={6} c="#FFD833" />
      <R x={3} y={3} w={10} h={5} c="#FFD833" />
      {/* Big comb */}
      <R x={5} y={0} w={2} h={3} c="#FF2222" />
      <R x={8} y={1} w={2} h={4} c="#FF2222" />
      <R x={11} y={0} w={2} h={3} c="#FF2222" />
      {/* Eyes */}
      <R x={4} y={4} w={3} h={2} c="#1A1A1A" />
      <R x={9} y={4} w={3} h={2} c="#1A1A1A" />
      <R x={4} y={4} w={1} h={1} c="#FFFFFF" />
      <R x={9} y={4} w={1} h={1} c="#FFFFFF" />
      {/* Beak */}
      <R x={6} y={6} w={4} h={2} c="#FF6600" />
      {/* Accent glow */}
      <R x={6} y={8} w={4} h={1} c="#FFE080" />
    </svg>
  );
}

// ─── FOX ─────────────────────────────────────────────────────────────────────

function FoxBaby({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Ears */}
      <R x={3} y={3} w={3} h={3} c="#E8650A" />
      <R x={10} y={3} w={3} h={3} c="#E8650A" />
      <R x={4} y={4} w={1} h={2} c="#FFCCAA" />
      <R x={11} y={4} w={1} h={2} c="#FFCCAA" />
      {/* Head */}
      <R x={4} y={5} w={8} h={6} c="#E8730A" />
      <R x={3} y={6} w={10} h={4} c="#E8730A" />
      {/* White muzzle */}
      <R x={5} y={9} w={6} h={2} c="#FFEECC" />
      {/* Eyes */}
      <R x={5} y={7} w={2} h={2} c="#1A1A1A" />
      <R x={9} y={7} w={2} h={2} c="#1A1A1A" />
      <R x={5} y={7} w={1} h={1} c="#FFFFFF" />
      <R x={9} y={7} w={1} h={1} c="#FFFFFF" />
      {/* Nose */}
      <R x={7} y={9} w={2} h={1} c="#331A00" />
      {/* Body */}
      <R x={5} y={11} w={6} h={4} c="#E07008" />
      {/* Tail */}
      <R x={11} y={12} w={3} h={2} c="#E07008" />
      <R x={13} y={11} w={2} h={1} c="#FFFFFF" />
    </svg>
  );
}

function FoxYoung({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Pointed ears */}
      <R x={2} y={2} w={3} h={4} c="#D86808" />
      <R x={11} y={2} w={3} h={4} c="#D86808" />
      <R x={3} y={3} w={1} h={3} c="#FFBBAA" />
      <R x={12} y={3} w={1} h={3} c="#FFBBAA" />
      {/* Head */}
      <R x={2} y={5} w={12} h={7} c="#E8720A" />
      <R x={1} y={6} w={14} h={5} c="#E8720A" />
      {/* White face patch */}
      <R x={3} y={7} w={4} h={4} c="#FFF0DD" />
      <R x={9} y={7} w={4} h={4} c="#FFF0DD" />
      {/* Eyes */}
      <R x={4} y={7} w={2} h={2} c="#1A1A1A" />
      <R x={10} y={7} w={2} h={2} c="#1A1A1A" />
      <R x={4} y={7} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={7} w={1} h={1} c="#FFFFFF" />
      {/* Nose */}
      <R x={7} y={10} w={2} h={1} c="#331A00" />
      {/* Body */}
      <R x={3} y={12} w={10} h={3} c="#D86808" />
      <R x={12} y={11} w={4} h={3} c="#D86808" />
      <R x={14} y={9} w={2} h={3} c="#FFFFFF" />
    </svg>
  );
}

function FoxAdult({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Tall pointed ears */}
      <R x={1} y={0} w={4} h={5} c="#CC5500" />
      <R x={11} y={0} w={4} h={5} c="#CC5500" />
      <R x={2} y={1} w={2} h={4} c="#FFAA88" />
      <R x={12} y={1} w={2} h={4} c="#FFAA88" />
      {/* Ear glow */}
      <R x={2} y={0} w={2} h={1} c="#FF8844" />
      <R x={12} y={0} w={2} h={1} c="#FF8844" />
      {/* Head */}
      <R x={1} y={4} w={14} h={8} c="#E06800" />
      <R x={0} y={5} w={16} h={6} c="#E06800" />
      {/* Bold white muzzle */}
      <R x={3} y={8} w={10} h={4} c="#FFEECC" />
      {/* Eyes */}
      <R x={2} y={5} w={4} h={3} c="#1A1A1A" />
      <R x={10} y={5} w={4} h={3} c="#1A1A1A" />
      <R x={2} y={5} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={5} w={1} h={1} c="#FFFFFF" />
      {/* Pupils */}
      <R x={3} y={6} w={2} h={1} c="#440000" />
      <R x={11} y={6} w={2} h={1} c="#440000" />
      {/* Nose */}
      <R x={6} y={9} w={4} h={2} c="#330000" />
      {/* Body */}
      <R x={2} y={12} w={12} h={3} c="#CC6000" />
      {/* Fluffy tail */}
      <R x={13} y={9} w={3} h={5} c="#CC6000" />
      <R x={14} y={7} w={2} h={3} c="#CC6000" />
      <R x={14} y={7} w={2} h={2} c="#FFEECC" />
    </svg>
  );
}

// ─── DEER ────────────────────────────────────────────────────────────────────

function DeerBaby({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Head */}
      <R x={4} y={4} w={8} h={6} c="#C88040" />
      <R x={3} y={5} w={10} h={4} c="#C88040" />
      {/* Big eyes */}
      <R x={5} y={6} w={2} h={2} c="#331A00" />
      <R x={9} y={6} w={2} h={2} c="#331A00" />
      <R x={5} y={6} w={1} h={1} c="#FFFFFF" />
      <R x={9} y={6} w={1} h={1} c="#FFFFFF" />
      {/* Muzzle */}
      <R x={6} y={8} w={4} h={2} c="#E8A060" />
      <R x={7} y={9} w={2} h={1} c="#BB6030" />
      {/* Ears */}
      <R x={2} y={5} w={2} h={3} c="#C88040" />
      <R x={12} y={5} w={2} h={3} c="#C88040" />
      <R x={2} y={5} w={1} h={2} c="#E8A060" />
      <R x={13} y={5} w={1} h={2} c="#E8A060" />
      {/* Body */}
      <R x={5} y={10} w={6} h={4} c="#B87030" />
      {/* Spots */}
      <R x={6} y={11} w={1} h={1} c="#DDAA60" />
      <R x={9} y={12} w={1} h={1} c="#DDAA60" />
    </svg>
  );
}

function DeerYoung({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Antler nubs */}
      <R x={4} y={1} w={1} h={3} c="#8B5520" />
      <R x={11} y={1} w={1} h={3} c="#8B5520" />
      {/* Head */}
      <R x={3} y={4} w={10} h={7} c="#C88040" />
      <R x={2} y={5} w={12} h={5} c="#C88040" />
      {/* Eyes */}
      <R x={4} y={6} w={2} h={2} c="#331A00" />
      <R x={10} y={6} w={2} h={2} c="#331A00" />
      <R x={4} y={6} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={6} w={1} h={1} c="#FFFFFF" />
      {/* Muzzle */}
      <R x={5} y={8} w={6} h={3} c="#E0A060" />
      <R x={7} y={10} w={2} h={1} c="#AA5020" />
      {/* Ears */}
      <R x={1} y={4} w={2} h={4} c="#C88040" />
      <R x={13} y={4} w={2} h={4} c="#C88040" />
      {/* Body */}
      <R x={4} y={11} w={8} h={4} c="#B07030" />
      <R x={3} y={12} w={10} h={3} c="#B07030" />
      {/* Spots */}
      <R x={5} y={12} w={1} h={1} c="#DDAA60" />
      <R x={8} y={13} w={1} h={1} c="#DDAA60" />
      <R x={11} y={12} w={1} h={1} c="#DDAA60" />
    </svg>
  );
}

function DeerAdult({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Full antlers */}
      <R x={3} y={0} w={1} h={4} c="#7A4820" />
      <R x={12} y={0} w={1} h={4} c="#7A4820" />
      <R x={2} y={1} w={2} h={1} c="#7A4820" />
      <R x={12} y={1} w={2} h={1} c="#7A4820" />
      <R x={1} y={2} w={2} h={1} c="#7A4820" />
      <R x={13} y={2} w={2} h={1} c="#7A4820" />
      <R x={4} y={2} w={2} h={1} c="#7A4820" />
      <R x={10} y={2} w={2} h={1} c="#7A4820" />
      {/* Head */}
      <R x={2} y={4} w={12} h={7} c="#C07830" />
      <R x={1} y={5} w={14} h={5} c="#C07830" />
      {/* Eyes (glowing amber) */}
      <R x={3} y={5} w={3} h={3} c="#331A00" />
      <R x={10} y={5} w={3} h={3} c="#331A00" />
      <R x={3} y={5} w={1} h={1} c="#FFCC44" />
      <R x={10} y={5} w={1} h={1} c="#FFCC44" />
      {/* Broad muzzle */}
      <R x={4} y={8} w={8} h={3} c="#DDA060" />
      <R x={6} y={10} w={4} h={1} c="#996633" />
      {/* Ears */}
      <R x={0} y={4} w={2} h={5} c="#C07830" />
      <R x={14} y={4} w={2} h={5} c="#C07830" />
      <R x={0} y={5} w={1} h={3} c="#E8A060" />
      <R x={15} y={5} w={1} h={3} c="#E8A060" />
      {/* Body */}
      <R x={2} y={11} w={12} h={4} c="#A86820" />
      <R x={1} y={12} w={14} h={3} c="#A86820" />
      {/* White belly spots */}
      <R x={5} y={12} w={2} h={2} c="#E8C888" />
      <R x={9} y={12} w={2} h={2} c="#E8C888" />
    </svg>
  );
}

// ─── DRAGON ──────────────────────────────────────────────────────────────────

function DragonBaby({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Head (round) */}
      <R x={4} y={4} w={8} h={7} c="#5A8A3C" />
      <R x={3} y={5} w={10} h={5} c="#5A8A3C" />
      {/* Small horns */}
      <R x={5} y={3} w={1} h={2} c="#3A6820" />
      <R x={10} y={3} w={1} h={2} c="#3A6820" />
      {/* Eyes (glowing yellow) */}
      <R x={5} y={6} w={2} h={2} c="#FFD700" />
      <R x={9} y={6} w={2} h={2} c="#FFD700" />
      <R x={5} y={6} w={1} h={1} c="#FFFFFF" />
      <R x={9} y={6} w={1} h={1} c="#FFFFFF" />
      {/* Nostrils */}
      <R x={7} y={9} w={1} h={1} c="#2A5010" />
      <R x={8} y={9} w={1} h={1} c="#2A5010" />
      {/* Body (chubby) */}
      <R x={5} y={11} w={6} h={4} c="#4A7A30" />
      {/* Tail */}
      <R x={10} y={12} w={4} h={2} c="#4A7A30" />
      <R x={13} y={11} w={2} h={2} c="#3A6820" />
      {/* Tummy */}
      <R x={6} y={12} w={4} h={2} c="#88CC66" />
    </svg>
  );
}

function DragonYoung({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Head */}
      <R x={3} y={3} w={10} h={7} c="#4A8838" />
      <R x={2} y={4} w={12} h={5} c="#4A8838" />
      {/* Horns with tip */}
      <R x={4} y={1} w={2} h={3} c="#2A5818" />
      <R x={10} y={1} w={2} h={3} c="#2A5818" />
      <R x={5} y={0} w={1} h={2} c="#88CC44" />
      <R x={10} y={0} w={1} h={2} c="#88CC44" />
      {/* Eyes */}
      <R x={4} y={5} w={3} h={2} c="#FFD700" />
      <R x={9} y={5} w={3} h={2} c="#FFD700" />
      <R x={5} y={5} w={1} h={2} c="#FF6600" />
      <R x={10} y={5} w={1} h={2} c="#FF6600" />
      {/* Mouth fire hint */}
      <R x={6} y={8} w={4} h={2} c="#2A5818" />
      <R x={7} y={9} w={2} h={1} c="#FF8822" />
      {/* Body + wings */}
      <R x={3} y={10} w={10} h={5} c="#3A7828" />
      <R x={1} y={9} w={3} h={4} c="#558833" />
      <R x={12} y={9} w={3} h={4} c="#558833" />
      {/* Tummy */}
      <R x={5} y={11} w={6} h={3} c="#77BB55" />
      {/* Tail */}
      <R x={12} y={13} w={4} h={2} c="#3A6820" />
    </svg>
  );
}

function DragonAdult({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Head */}
      <R x={2} y={3} w={12} h={7} c="#3A7820" />
      <R x={1} y={4} w={14} h={5} c="#3A7820" />
      {/* Dramatic horns */}
      <R x={3} y={0} w={2} h={4} c="#224810" />
      <R x={11} y={0} w={2} h={4} c="#224810" />
      <R x={2} y={1} w={2} h={2} c="#224810" />
      <R x={12} y={1} w={2} h={2} c="#224810" />
      <R x={4} y={0} w={1} h={1} c="#AAFF44" />
      <R x={11} y={0} w={1} h={1} c="#AAFF44" />
      {/* Glowing eyes */}
      <R x={2} y={4} w={4} h={3} c="#FF8800" />
      <R x={10} y={4} w={4} h={3} c="#FF8800" />
      <R x={3} y={5} w={2} h={1} c="#FFFF00" />
      <R x={11} y={5} w={2} h={1} c="#FFFF00" />
      <R x={2} y={4} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={4} w={1} h={1} c="#FFFFFF" />
      {/* Jaw + fire breath */}
      <R x={3} y={7} w={10} h={3} c="#224810" />
      <R x={5} y={9} w={6} h={2} c="#FF6600" />
      <R x={6} y={10} w={4} h={2} c="#FF4400" />
      <R x={7} y={11} w={2} h={2} c="#FFCC00" />
      {/* Body */}
      <R x={1} y={10} w={14} h={5} c="#2A6818" />
      {/* Scale ridge */}
      <R x={7} y={10} w={2} h={5} c="#1A5010" />
      {/* Wings */}
      <R x={0} y={8} w={2} h={5} c="#336622" />
      <R x={14} y={8} w={2} h={5} c="#336622" />
      <R x={0} y={6} w={1} h={4} c="#448833" />
      <R x={15} y={6} w={1} h={4} c="#448833" />
      {/* Tummy glow */}
      <R x={4} y={11} w={8} h={3} c="#66CC44" />
      <R x={6} y={12} w={4} h={1} c="#AAFF66" />
    </svg>
  );
}

// ─── EGGS ────────────────────────────────────────────────────────────────────

function EggCommon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      <R x={5} y={2} w={6} h={1} c="#E8D8B8" />
      <R x={3} y={3} w={10} h={1} c="#E8D8B8" />
      <R x={2} y={4} w={12} h={7} c="#F0E0C0" />
      <R x={3} y={11} w={10} h={2} c="#E8D8B8" />
      <R x={5} y={13} w={6} h={1} c="#D8C8A8" />
      {/* Shine */}
      <R x={4} y={5} w={3} h={2} c="#FFFBF0" />
    </svg>
  );
}

function EggRare({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      <R x={5} y={2} w={6} h={1} c="#9080F0" />
      <R x={3} y={3} w={10} h={1} c="#A090FF" />
      <R x={2} y={4} w={12} h={7} c="#B0A0FF" />
      <R x={3} y={11} w={10} h={2} c="#9080F0" />
      <R x={5} y={13} w={6} h={1} c="#7060D0" />
      {/* Stars on egg */}
      <R x={5} y={6} w={1} h={1} c="#FFFFFF" />
      <R x={10} y={5} w={1} h={1} c="#FFFFFF" />
      <R x={8} y={8} w={1} h={1} c="#FFFFFF" />
      {/* Shine */}
      <R x={4} y={5} w={2} h={2} c="#D8D0FF" />
    </svg>
  );
}

function EggSeasonal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      <R x={5} y={2} w={6} h={1} c="#D0A000" />
      <R x={3} y={3} w={10} h={1} c="#E8B800" />
      <R x={2} y={4} w={12} h={7} c="#F8D020" />
      <R x={3} y={11} w={10} h={2} c="#E8B800" />
      <R x={5} y={13} w={6} h={1} c="#C09000" />
      {/* Swirl decoration */}
      <R x={5} y={5} w={3} h={1} c="#E87800" />
      <R x={8} y={6} w={2} h={1} c="#E87800" />
      <R x={6} y={7} w={3} h={1} c="#E87800" />
      <R x={5} y={8} w={2} h={1} c="#E87800" />
      <R x={9} y={8} w={2} h={1} c="#E87800" />
      {/* Shine */}
      <R x={4} y={5} w={2} h={2} c="#FFFBE0" />
    </svg>
  );
}

// ─── UI ICONS ─────────────────────────────────────────────────────────────────

/** Paw icon — used for the PETS panel header */
export function IconPaw({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      {/* Toes */}
      <R x={2} y={2} w={3} h={3} c="#C88060" />
      <R x={6} y={1} w={3} h={3} c="#C88060" />
      <R x={10} y={1} w={3} h={3} c="#C88060" />
      <R x={12} y={4} w={2} h={2} c="#C88060" />
      {/* Pad */}
      <R x={3} y={5} w={10} h={7} c="#C88060" />
      <R x={2} y={7} w={12} h={5} c="#C88060" />
      {/* Inner pad */}
      <R x={5} y={7} w={6} h={4} c="#A86050" />
    </svg>
  );
}

/** Trophy icon */
export function IconTrophy({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={5} y={14} w={6} h={1} c="#8B6914" />
      <R x={6} y={13} w={4} h={2} c="#C8A030" />
      <R x={3} y={2} w={10} h={9} c="#FFD700" />
      <R x={1} y={3} w={2} h={5} c="#FFD700" />
      <R x={13} y={3} w={2} h={5} c="#FFD700" />
      <R x={1} y={8} w={2} h={1} c="#B8860B" />
      <R x={13} y={8} w={2} h={1} c="#B8860B" />
      <R x={5} y={2} w={6} h={1} c="#FFF176" />
      <R x={4} y={3} w={2} h={2} c="#FFF176" />
      <R x={6} y={6} w={2} h={2} c="#B8860B" />
      <R x={3} y={11} w={10} h={2} c="#DAA520" />
    </svg>
  );
}

/** Shop / market stall icon */
export function IconShop({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      {/* Roof awning */}
      <R x={1} y={3} w={14} h={2} c="#CC3322" />
      <R x={0} y={5} w={16} h={1} c="#AA2211" />
      {/* Stripes */}
      <R x={3} y={3} w={2} h={2} c="#FFFFFF" />
      <R x={7} y={3} w={2} h={2} c="#FFFFFF" />
      <R x={11} y={3} w={2} h={2} c="#FFFFFF" />
      {/* Facade */}
      <R x={1} y={6} w={14} h={9} c="#E8D0A0" />
      {/* Door */}
      <R x={6} y={10} w={4} h={5} c="#8B6914" />
      <R x={7} y={11} w={1} h={1} c="#FFD700" />
      {/* Windows */}
      <R x={2} y={8} w={3} h={3} c="#88CCFF" />
      <R x={11} y={8} w={3} h={3} c="#88CCFF" />
      <R x={2} y={7} w={3} h={1} c="#C89040" />
      <R x={11} y={7} w={3} h={1} c="#C89040" />
    </svg>
  );
}

/** Warning triangle */
export function IconWarning({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={7} y={1} w={2} h={1} c="#FF4400" />
      <R x={6} y={2} w={4} h={1} c="#FF4400" />
      <R x={5} y={3} w={6} h={1} c="#FF4400" />
      <R x={4} y={4} w={8} h={1} c="#FF4400" />
      <R x={3} y={5} w={10} h={1} c="#FF4400" />
      <R x={2} y={6} w={12} h={1} c="#FF4400" />
      <R x={1} y={7} w={14} h={1} c="#FF4400" />
      <R x={0} y={8} w={16} h={1} c="#FF4400" />
      <R x={1} y={9} w={14} h={2} c="#FF4400" />
      <R x={0} y={11} w={16} h={2} c="#FF4400" />
      <R x={1} y={13} w={14} h={1} c="#FF4400" />
      {/* Inner fill */}
      <R x={4} y={6} w={8} h={1} c="#FFD700" />
      <R x={3} y={7} w={10} h={1} c="#FFD700" />
      <R x={2} y={8} w={12} h={1} c="#FFD700" />
      <R x={3} y={9} w={10} h={2} c="#FFD700" />
      <R x={2} y={11} w={12} h={2} c="#FFD700" />
      {/* ! mark */}
      <R x={7} y={7} w={2} h={4} c="#331A00" />
      <R x={7} y={12} w={2} h={1} c="#331A00" />
    </svg>
  );
}

/** Tag / list icon */
export function IconTag({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={2} y={2} w={8} h={1} c="#C0A060" />
      <R x={1} y={3} w={9} h={8} c="#D0B070" />
      <R x={9} y={5} w={2} h={2} c="#D0B070" />
      <R x={10} y={6} w={2} h={4} c="#D0B070" />
      <R x={11} y={7} w={2} h={5} c="#D0B070" />
      <R x={10} y={5} w={1} h={1} c="#D0B070" />
      {/* Arrow tip */}
      <R x={12} y={9} w={2} h={2} c="#D0B070" />
      <R x={13} y={10} w={2} h={2} c="#D0B070" />
      <R x={14} y={11} w={1} h={1} c="#D0B070" />
      {/* Hole */}
      <R x={4} y={5} w={2} h={2} c="#7A5020" />
      {/* Text lines */}
      <R x={3} y={9} w={5} h={1} c="#A07840" />
      <R x={3} y={7} w={4} h={1} c="#A07840" />
      <R x={1} y={11} w={9} h={1} c="#C0A060" />
    </svg>
  );
}

/** Fork / feed bowl icon */
export function IconFeed({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      {/* Bowl */}
      <R x={2} y={9} w={12} h={1} c="#8B6914" />
      <R x={1} y={10} w={14} h={3} c="#C8A040" />
      <R x={2} y={13} w={12} h={1} c="#8B6914" />
      {/* Food in bowl */}
      <R x={3} y={10} w={10} h={2} c="#E8B060" />
      <R x={5} y={9} w={2} h={1} c="#CC6800" />
      <R x={9} y={9} w={2} h={1} c="#5A9A3C" />
      {/* Fork */}
      <R x={4} y={2} w={1} h={7} c="#C0C0C0" />
      <R x={4} y={2} w={1} h={3} c="#D0D0D0" />
      <R x={3} y={2} w={1} h={2} c="#C0C0C0" />
      <R x={5} y={2} w={1} h={2} c="#C0C0C0" />
      {/* Spoon */}
      <R x={11} y={5} w={2} h={5} c="#C0C0C0" />
      <R x={10} y={2} w={4} h={4} c="#D0D0D0" />
      <R x={11} y={3} w={2} h={2} c="#B8B8B8" />
    </svg>
  );
}

/** Key icon (for session) */
export function IconKey({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={1} y={5} w={8} h={8} c="#FFD700" />
      <R x={2} y={4} w={6} h={10} c="#FFD700" />
      <R x={3} y={3} w={4} h={12} c="#FFD700" />
      <R x={2} y={5} w={8} h={6} c="#FFD700" />
      <R x={3} y={6} w={6} h={4} c="#D4A000" />
      {/* Handle hole */}
      <R x={4} y={7} w={3} h={2} c="#8B4914" />
      {/* Teeth */}
      <R x={9} y={9} w={7} h={2} c="#FFD700" />
      <R x={11} y={11} w={2} h={2} c="#FFD700" />
      <R x={14} y={11} w={2} h={2} c="#FFD700" />
    </svg>
  );
}

/** Star (for level up) */
export function IconStar({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={7} y={1} w={2} h={3} c="#FFD700" />
      <R x={7} y={4} w={2} h={8} c="#FFD700" />
      <R x={4} y={7} w={8} h={2} c="#FFD700" />
      <R x={3} y={4} w={3} h={3} c="#FFD700" />
      <R x={10} y={4} w={3} h={3} c="#FFD700" />
      <R x={3} y={9} w={3} h={3} c="#FFD700" />
      <R x={10} y={9} w={3} h={3} c="#FFD700" />
      <R x={6} y={3} w={4} h={10} c="#FFD700" />
      <R x={3} y={6} w={10} h={4} c="#FFD700" />
    </svg>
  );
}

/** Heart (for happiness) */
export function IconHeart({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={2} y={3} w={4} h={2} c="#FF6688" />
      <R x={10} y={3} w={4} h={2} c="#FF6688" />
      <R x={1} y={5} w={6} h={4} c="#FF6688" />
      <R x={9} y={5} w={6} h={4} c="#FF6688" />
      <R x={2} y={9} w={12} h={3} c="#FF6688" />
      <R x={4} y={12} w={8} h={2} c="#FF6688" />
      <R x={6} y={14} w={4} h={1} c="#FF6688" />
      <R x={7} y={15} w={2} h={1} c="#FF6688" />
      {/* Shine */}
      <R x={3} y={5} w={2} h={2} c="#FFB0C8" />
    </svg>
  );
}

/** Wheat seedling (splash screen) */
export function IconFarm({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={ISO} className={className}>
      {/* Stalk */}
      <R x={15} y={8} w={2} h={18} c="#8B6914" />
      {/* Golden grain head */}
      <R x={12} y={2} w={8} h={2} c="#F5C518" />
      <R x={10} y={4} w={12} h={4} c="#F5C518" />
      <R x={12} y={8} w={8} h={4} c="#DAA520" />
      {/* Leaves */}
      <R x={6} y={14} w={8} h={4} c="#5A8A3C" />
      <R x={18} y={18} w={8} h={4} c="#5A8A3C" />
      {/* Shine */}
      <R x={10} y={4} w={4} h={2} c="#FFF176" />
      {/* Ground */}
      <R x={6} y={26} w={20} h={2} c="#5C3D1A" />
      <R x={4} y={28} w={24} h={2} c="#4A2E10" />
    </svg>
  );
}

/** Small sprout (registration screen) */
export function IconSprout({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={ISO} className={className}>
      <R x={15} y={16} w={2} h={10} c="#5A8A3C" />
      <R x={14} y={12} w={4} h={6} c="#68A040" />
      <R x={8} y={14} w={6} h={4} c="#4A7C3F" />
      <R x={18} y={10} w={6} h={4} c="#5A8A3C" />
      <R x={12} y={10} w={2} h={4} c="#68A040" />
      <R x={6} y={26} w={20} h={2} c="#5C3D1A" />
    </svg>
  );
}

/** Medal icons (rank 1/2/3) */
export function IconMedal({ rank, size = 24 }: { rank: 1 | 2 | 3; size?: number }) {
  const c = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
  const shade = rank === 1 ? '#B8860B' : rank === 2 ? '#909090' : '#A05020';
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Ribbon */}
      <R x={5} y={0} w={2} h={5} c={rank === 1 ? '#CC2200' : rank === 2 ? '#4488CC' : '#228844'} />
      <R x={9} y={0} w={2} h={5} c={rank === 1 ? '#CC2200' : rank === 2 ? '#4488CC' : '#228844'} />
      {/* Circle */}
      <R x={3} y={4} w={10} h={10} c={c} />
      <R x={2} y={5} w={12} h={8} c={c} />
      <R x={4} y={3} w={8} h={1} c={c} />
      <R x={4} y={12} w={8} h={1} c={c} />
      {/* Shine + shade */}
      <R x={4} y={5} w={3} h={3} c={rank === 1 ? '#FFF8A0' : rank === 2 ? '#FFFFFF' : '#E8A060'} />
      <R x={10} y={10} w={2} h={2} c={shade} />
      {/* Number */}
      <R x={7} y={7} w={2} h={4} c={shade} />
      {rank === 1 && (
        <>
          <R x={6} y={7} w={2} h={1} c={shade} />
        </>
      )}
      {rank === 2 && (
        <>
          <R x={6} y={7} w={4} h={1} c={shade} />
          <R x={6} y={9} w={2} h={1} c={shade} />
          <R x={6} y={11} w={4} h={1} c={shade} />
        </>
      )}
      {rank === 3 && (
        <>
          <R x={6} y={7} w={4} h={1} c={shade} />
          <R x={8} y={9} w={2} h={1} c={shade} />
          <R x={6} y={11} w={4} h={1} c={shade} />
        </>
      )}
    </svg>
  );
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function PetAvatar({
  species,
  level,
  size = 48,
  className
}: {
  species: number;
  level: number;
  size?: number;
  className?: string;
}) {
  const stage = level >= 7 ? 2 : level >= 4 ? 1 : 0;
  const key = `${species}-${stage}`;

  const components: Record<string, JSX.Element> = {
    '1-0': <BunnyBaby size={size} />,
    '1-1': <BunnyYoung size={size} />,
    '1-2': <BunnyAdult size={size} />,
    '2-0': <ChickBaby size={size} />,
    '2-1': <ChickYoung size={size} />,
    '2-2': <ChickAdult size={size} />,
    '3-0': <FoxBaby size={size} />,
    '3-1': <FoxYoung size={size} />,
    '3-2': <FoxAdult size={size} />,
    '4-0': <DeerBaby size={size} />,
    '4-1': <DeerYoung size={size} />,
    '4-2': <DeerAdult size={size} />,
    '5-0': <DragonBaby size={size} />,
    '5-1': <DragonYoung size={size} />,
    '5-2': <DragonAdult size={size} />
  };

  return (
    <span className={className} style={{ display: 'inline-block' }}>
      {components[key] ?? <BunnyBaby size={size} />}
    </span>
  );
}

export function EggIcon({ eggType, size = 32 }: { eggType: number; size?: number }) {
  if (eggType === 2) return <EggRare size={size} />;
  if (eggType === 3) return <EggSeasonal size={size} />;
  return <EggCommon size={size} />;
}
