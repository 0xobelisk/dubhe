/**
 * Pixel-art SVG icons for the farm game.
 * All icons use a 16×16 viewBox — no external assets needed.
 *
 * Crop growth stages (0–3):
 *   0 = Seed       (just planted)
 *   1 = Sprout     (first leaves)
 *   2 = Growing    (almost mature)
 *   3 = Ripe       (ready to harvest)
 */

interface IconProps {
  size?: number;
  className?: string;
}

function R({ x, y, w = 1, h = 1, c }: { x: number; y: number; w?: number; h?: number; c: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={c} />;
}

const ISO: React.CSSProperties = { imageRendering: 'pixelated', display: 'block' };

// ─── Gold Coin ────────────────────────────────────────────────────────────────
export function IconGold({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={4} y={1} w={8} h={1} c="#FFD700" />
      <R x={2} y={2} w={12} h={1} c="#FFD700" />
      <R x={1} y={3} w={14} h={10} c="#FFD700" />
      <R x={2} y={13} w={12} h={1} c="#FFD700" />
      <R x={4} y={14} w={8} h={1} c="#FFD700" />
      <R x={3} y={3} w={3} h={2} c="#FFF176" />
      <R x={7} y={4} w={3} h={1} c="#B8860B" />
      <R x={6} y={5} w={1} h={1} c="#B8860B" />
      <R x={7} y={6} w={2} h={1} c="#B8860B" />
      <R x={9} y={7} w={1} h={1} c="#B8860B" />
      <R x={7} y={8} w={3} h={1} c="#B8860B" />
      <R x={8} y={4} w={1} h={7} c="#B8860B" />
      <R x={2} y={12} w={12} h={1} c="#B8860B" />
    </svg>
  );
}

// ─── Lock ─────────────────────────────────────────────────────────────────────
export function IconLock({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={5} y={2} w={6} h={1} c="#8B7355" />
      <R x={4} y={3} w={1} h={4} c="#8B7355" />
      <R x={11} y={3} w={1} h={4} c="#8B7355" />
      <R x={3} y={7} w={10} h={7} c="#C8A96E" />
      <R x={3} y={7} w={10} h={1} c="#8B7355" />
      <R x={3} y={13} w={10} h={1} c="#8B7355" />
      <R x={3} y={7} w={1} h={7} c="#8B7355" />
      <R x={12} y={7} w={1} h={7} c="#8B7355" />
      <R x={7} y={9} w={2} h={2} c="#5C3D1A" />
      <R x={7} y={11} w={2} h={2} c="#5C3D1A" />
    </svg>
  );
}

// ─── Seedling (empty plot hint) ───────────────────────────────────────────────
export function IconSeedling({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={7} y={7} w={2} h={6} c="#5A8A3C" />
      <R x={3} y={8} w={4} h={3} c="#4A7C3F" />
      <R x={9} y={6} w={4} h={3} c="#5A8A3C" />
      <R x={5} y={5} w={2} h={3} c="#5A8A3C" />
    </svg>
  );
}

// ─── Plots icon ───────────────────────────────────────────────────────────────
export function IconPlots({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={1} y={1} w={6} h={6} c="#8B6914" />
      <R x={9} y={1} w={6} h={6} c="#6B4423" />
      <R x={1} y={9} w={6} h={6} c="#6B4423" />
      <R x={9} y={9} w={6} h={6} c="#8B6914" />
      <R x={7} y={1} w={2} h={14} c="#3D2B1F" />
      <R x={1} y={7} w={14} h={2} c="#3D2B1F" />
      <R x={3} y={4} w={2} h={2} c="#5A8A3C" />
    </svg>
  );
}

// ─── Scarecrow ────────────────────────────────────────────────────────────────
export function IconScarecrow({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO} className={className}>
      <R x={7} y={8} w={2} h={8} c="#8B6914" />
      <R x={4} y={6} w={8} h={2} c="#8B6914" />
      <R x={5} y={8} w={6} h={5} c="#C8A96E" />
      <R x={5} y={2} w={6} h={6} c="#F5E6C8" />
      <R x={4} y={1} w={8} h={2} c="#3D2B1F" />
      <R x={5} y={0} w={6} h={2} c="#3D2B1F" />
      <R x={6} y={4} w={1} h={1} c="#3D2B1F" />
      <R x={9} y={4} w={1} h={1} c="#3D2B1F" />
      <R x={6} y={6} w={4} h={1} c="#3D2B1F" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// WHEAT  ·  4 growth stages
// ════════════════════════════════════════════════════════════════════════════════

/** Stage 0 — Seed */
function WheatSeed({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Oval seed body */}
      <R x={6} y={9} w={4} h={1} c="#C8A040" />
      <R x={5} y={10} w={6} h={1} c="#D4B048" />
      <R x={5} y={11} w={6} h={1} c="#C8A040" />
      <R x={6} y={12} w={4} h={1} c="#A07820" />
      <R x={7} y={13} w={2} h={1} c="#806010" />
      {/* Shine */}
      <R x={6} y={10} w={2} h={1} c="#ECD870" />
      {/* Tiny crack – starting to sprout */}
      <R x={7} y={8} w={2} h={1} c="#7AC050" />
    </svg>
  );
}

/** Stage 1 — Sprout */
function WheatSprout({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Stem */}
      <R x={7} y={7} w={2} h={7} c="#5A8A3C" />
      {/* Bright new tip */}
      <R x={7} y={6} w={2} h={1} c="#80C050" />
      {/* Left leaf */}
      <R x={4} y={9} w={3} h={1} c="#4A7C3F" />
      <R x={4} y={10} w={2} h={1} c="#3A6A30" />
      {/* Right leaf */}
      <R x={9} y={11} w={3} h={1} c="#5A8A3C" />
      <R x={10} y={12} w={2} h={1} c="#4A7A30" />
    </svg>
  );
}

/** Stage 2 — Growing (grain head forming) */
function WheatGrowing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Stalk */}
      <R x={7} y={5} w={2} h={9} c="#7A6520" />
      {/* Left leaf */}
      <R x={3} y={7} w={4} h={1} c="#5A8A3C" />
      <R x={3} y={8} w={3} h={1} c="#4A7C3F" />
      {/* Right leaf */}
      <R x={9} y={9} w={4} h={1} c="#5A8A3C" />
      <R x={10} y={10} w={3} h={1} c="#4A7C3F" />
      {/* Forming grain head — greenish-gold */}
      <R x={7} y={3} w={2} h={1} c="#C0A030" />
      <R x={6} y={4} w={4} h={2} c="#B89030" />
      <R x={6} y={3} w={1} h={1} c="#D4B040" />
      <R x={9} y={3} w={1} h={1} c="#D4B040" />
    </svg>
  );
}

/** Stage 3 — Ripe (full golden wheat) */
function WheatRipe({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Stalk */}
      <R x={7} y={8} w={2} h={7} c="#8B6914" />
      {/* Golden grain head */}
      <R x={6} y={1} w={4} h={1} c="#F5C518" />
      <R x={5} y={2} w={6} h={2} c="#F5C518" />
      <R x={6} y={4} w={4} h={2} c="#DAA520" />
      <R x={7} y={6} w={2} h={2} c="#B8860B" />
      {/* Grain bumps */}
      <R x={5} y={2} w={1} h={1} c="#FFF176" />
      <R x={10} y={2} w={1} h={1} c="#FFF176" />
      <R x={6} y={4} w={1} h={1} c="#F0D030" />
      <R x={9} y={4} w={1} h={1} c="#F0D030" />
      {/* Leaves */}
      <R x={3} y={9} w={4} h={2} c="#5A8A3C" />
      <R x={9} y={11} w={4} h={2} c="#5A8A3C" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// CORN  ·  4 growth stages
// ════════════════════════════════════════════════════════════════════════════════

/** Stage 0 — Kernel */
function CornSeed({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Kernel shape */}
      <R x={7} y={8} w={2} h={1} c="#FFD700" />
      <R x={6} y={9} w={4} h={1} c="#FFD700" />
      <R x={5} y={10} w={6} h={1} c="#FFD700" />
      <R x={5} y={11} w={6} h={1} c="#E6C200" />
      <R x={6} y={12} w={4} h={1} c="#C8A800" />
      <R x={7} y={13} w={2} h={1} c="#A08000" />
      {/* Shine */}
      <R x={6} y={10} w={2} h={1} c="#FFF176" />
      {/* Embryo stripe */}
      <R x={8} y={10} w={1} h={3} c="#8B7020" />
    </svg>
  );
}

/** Stage 1 — Sprout (single rolled sheath leaf) */
function CornSprout({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Stem/sheath */}
      <R x={7} y={8} w={2} h={6} c="#5A8A3C" />
      {/* Rolled leaf emerging */}
      <R x={6} y={5} w={2} h={5} c="#4A7C3F" />
      <R x={7} y={4} w={3} h={5} c="#5A8A3C" />
      <R x={9} y={6} w={2} h={3} c="#4A7C3F" />
      {/* Leaf shine */}
      <R x={7} y={5} w={1} h={2} c="#80C060" />
    </svg>
  );
}

/** Stage 2 — Growing (tall stalk, cob forming) */
function CornGrowing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Main stalk */}
      <R x={7} y={2} w={2} h={12} c="#4A8C3A" />
      {/* Left leaf */}
      <R x={3} y={5} w={4} h={1} c="#5A9A3C" />
      <R x={2} y={6} w={5} h={1} c="#4A8A30" />
      <R x={2} y={7} w={4} h={1} c="#3A7A28" />
      {/* Right leaf */}
      <R x={9} y={8} w={4} h={1} c="#5A9A3C" />
      <R x={9} y={9} w={5} h={1} c="#4A8A30" />
      <R x={10} y={10} w={4} h={1} c="#3A7A28" />
      {/* Small cob forming (left side of stalk) */}
      <R x={4} y={4} w={3} h={5} c="#4A8A30" /> {/* husk */}
      <R x={5} y={5} w={2} h={3} c="#E8C840" /> {/* tiny kernels */}
      {/* Tassel */}
      <R x={7} y={1} w={2} h={1} c="#C8A040" />
      <R x={6} y={2} w={1} h={1} c="#A08030" />
      <R x={10} y={2} w={1} h={1} c="#A08030" />
    </svg>
  );
}

/** Stage 3 — Ripe (full corn with golden cob) */
function CornRipe({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Stalk */}
      <R x={7} y={11} w={2} h={5} c="#5A8A3C" />
      {/* Husk */}
      <R x={5} y={3} w={6} h={9} c="#4A7C3F" />
      <R x={4} y={5} w={1} h={5} c="#4A7C3F" />
      <R x={11} y={5} w={1} h={5} c="#4A7C3F" />
      {/* Kernels */}
      <R x={6} y={4} w={4} h={7} c="#FFD700" />
      <R x={7} y={3} w={2} h={1} c="#FFD700" />
      {/* Kernel highlights */}
      <R x={6} y={5} w={1} h={1} c="#FFF176" />
      <R x={8} y={6} w={1} h={1} c="#FFF176" />
      <R x={6} y={8} w={1} h={1} c="#FFF176" />
      {/* Tassel */}
      <R x={7} y={1} w={1} h={3} c="#8B6914" />
      <R x={6} y={2} w={1} h={2} c="#8B6914" />
      <R x={9} y={2} w={1} h={2} c="#8B6914" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// CARROT  ·  4 growth stages
// ════════════════════════════════════════════════════════════════════════════════

/** Stage 0 — Seed */
function CarrotSeed({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      <R x={6} y={9} w={4} h={1} c="#CC6600" />
      <R x={5} y={10} w={6} h={1} c="#DD7700" />
      <R x={5} y={11} w={6} h={1} c="#CC6600" />
      <R x={6} y={12} w={4} h={1} c="#AA4400" />
      <R x={7} y={13} w={2} h={1} c="#883300" />
      {/* Shine */}
      <R x={6} y={10} w={2} h={1} c="#FF9040" />
    </svg>
  );
}

/** Stage 1 — Tiny green tops */
function CarrotSprout({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Three wispy carrot-top leaves */}
      <R x={5} y={7} w={1} h={5} c="#4A7C3F" />
      <R x={6} y={6} w={2} h={6} c="#5A8A3C" />
      <R x={7} y={4} w={2} h={8} c="#68A040" />
      <R x={9} y={6} w={2} h={5} c="#5A8A3C" />
      <R x={10} y={7} w={1} h={4} c="#4A7C3F" />
      {/* Tiny orange tip at ground level */}
      <R x={7} y={12} w={2} h={2} c="#FF8030" />
    </svg>
  );
}

/** Stage 2 — Growing (leafy tops + visible orange body) */
function CarrotGrowing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Feathery green tops — three clusters */}
      <R x={3} y={4} w={2} h={5} c="#4A7C3F" />
      <R x={4} y={3} w={2} h={4} c="#5A8A3C" />
      <R x={6} y={2} w={2} h={7} c="#5A8A3C" />
      <R x={7} y={1} w={2} h={8} c="#70B048" />
      <R x={9} y={3} w={2} h={6} c="#5A8A3C" />
      <R x={10} y={4} w={2} h={5} c="#4A7C3F" />
      {/* Orange carrot body (emerging from soil) */}
      <R x={6} y={9} w={4} h={1} c="#FF8C00" />
      <R x={6} y={10} w={4} h={1} c="#FF6B00" />
      <R x={7} y={11} w={2} h={1} c="#E55A00" />
      <R x={7} y={12} w={2} h={1} c="#CC4400" />
      {/* Highlight */}
      <R x={6} y={10} w={1} h={1} c="#FFA040" />
    </svg>
  );
}

/** Stage 3 — Ripe (full carrot) */
function CarrotRipe({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Lush leaves */}
      <R x={5} y={1} w={2} h={4} c="#4A7C3F" />
      <R x={7} y={1} w={2} h={3} c="#5A8A3C" />
      <R x={9} y={1} w={2} h={4} c="#4A7C3F" />
      {/* Full orange body */}
      <R x={5} y={5} w={6} h={1} c="#FF8C00" />
      <R x={5} y={6} w={6} h={2} c="#FF6B00" />
      <R x={6} y={8} w={4} h={2} c="#FF6B00" />
      <R x={7} y={10} w={2} h={2} c="#E55A00" />
      <R x={8} y={12} w={1} h={2} c="#CC4400" />
      {/* Highlight */}
      <R x={5} y={6} w={1} h={2} c="#FFA040" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PUMPKIN  ·  4 growth stages
// ════════════════════════════════════════════════════════════════════════════════

/** Stage 0 — Flat seed */
function PumpkinSeed({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      <R x={6} y={9} w={4} h={1} c="#D4C880" />
      <R x={5} y={10} w={6} h={1} c="#E0D498" />
      <R x={5} y={11} w={6} h={1} c="#C8C078" />
      <R x={6} y={12} w={4} h={1} c="#B0A860" />
      <R x={7} y={13} w={2} h={1} c="#907848" />
      {/* Center stripe (characteristic pumpkin seed) */}
      <R x={8} y={10} w={1} h={3} c="#A09050" />
      {/* Shine */}
      <R x={6} y={10} w={2} h={1} c="#F0EAB8" />
    </svg>
  );
}

/** Stage 1 — Vine with first leaf */
function PumpkinSprout({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Vine stem */}
      <R x={7} y={8} w={2} h={6} c="#5A8A3C" />
      <R x={6} y={7} w={2} h={2} c="#4A7C3F" />
      {/* Tendril curling right */}
      <R x={9} y={6} w={3} h={1} c="#5A8A3C" />
      <R x={11} y={7} w={1} h={1} c="#4A7C3F" />
      {/* Big rounded pumpkin leaf */}
      <R x={3} y={7} w={4} h={1} c="#5A9A3C" />
      <R x={2} y={8} w={5} h={1} c="#5A9A3C" />
      <R x={2} y={9} w={4} h={1} c="#4A8830" />
      <R x={3} y={6} w={3} h={1} c="#4A7C3F" />
      {/* Leaf veins */}
      <R x={4} y={7} w={1} h={2} c="#3A6A28" />
    </svg>
  );
}

/** Stage 2 — Small pumpkin forming on vine */
function PumpkinGrowing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Vine */}
      <R x={6} y={9} w={3} h={1} c="#4A7C3F" />
      <R x={7} y={10} w={1} h={4} c="#5A8A3C" />
      {/* Leaf (left) */}
      <R x={2} y={7} w={4} h={1} c="#5A9A3C" />
      <R x={2} y={8} w={4} h={1} c="#4A8A30" />
      <R x={3} y={6} w={3} h={1} c="#4A7C3F" />
      {/* Small pumpkin body */}
      <R x={8} y={4} w={5} h={5} c="#E06808" />
      <R x={7} y={5} w={7} h={3} c="#E06808" />
      {/* Rib */}
      <R x={10} y={4} w={1} h={5} c="#C04800" />
      {/* Stem */}
      <R x={10} y={3} w={1} h={2} c="#5A8A3C" />
      {/* Highlight */}
      <R x={8} y={5} w={1} h={1} c="#FF9040" />
    </svg>
  );
}

/** Stage 3 — Ripe (full pumpkin) */
function PumpkinRipe({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={ISO}>
      {/* Stem */}
      <R x={7} y={1} w={2} h={2} c="#5A8A3C" />
      {/* Body */}
      <R x={3} y={3} w={10} h={9} c="#E8650A" />
      <R x={1} y={5} w={14} h={5} c="#E8650A" />
      <R x={2} y={4} w={12} h={7} c="#E8650A" />
      {/* Ribs */}
      <R x={5} y={3} w={1} h={9} c="#CC4A00" />
      <R x={10} y={3} w={1} h={9} c="#CC4A00" />
      {/* Jack face */}
      <R x={4} y={6} w={2} h={2} c="#1A0A00" />
      <R x={10} y={6} w={2} h={2} c="#1A0A00" />
      <R x={4} y={9} w={8} h={1} c="#1A0A00" />
      <R x={5} y={10} w={2} h={1} c="#1A0A00" />
      <R x={9} y={10} w={2} h={1} c="#1A0A00" />
      {/* Highlight */}
      <R x={3} y={4} w={2} h={2} c="#FF8C30" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PUBLIC EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

// Mature icons (stage 3) kept as named exports for HUD / shop use
export const IconWheat = ({ size = 20, className }: IconProps) => <WheatRipe size={size} />;
export const IconCorn = ({ size = 20, className }: IconProps) => <CornRipe size={size} />;
export const IconCarrot = ({ size = 20, className }: IconProps) => <CarrotRipe size={size} />;
export const IconPumpkin = ({ size = 20, className }: IconProps) => <PumpkinRipe size={size} />;

/**
 * Render a crop icon at a specific growth stage.
 * stage: 0=Seed  1=Sprout  2=Growing  3=Ripe
 */
export function CropStageIcon({
  cropType,
  stage,
  size = 32
}: {
  cropType: number;
  stage: number;
  size?: number;
}) {
  const s = Math.max(0, Math.min(3, stage));

  if (cropType === 1) {
    return [
      <WheatSeed size={size} />,
      <WheatSprout size={size} />,
      <WheatGrowing size={size} />,
      <WheatRipe size={size} />
    ][s];
  }
  if (cropType === 2) {
    return [
      <CornSeed size={size} />,
      <CornSprout size={size} />,
      <CornGrowing size={size} />,
      <CornRipe size={size} />
    ][s];
  }
  if (cropType === 3) {
    return [
      <CarrotSeed size={size} />,
      <CarrotSprout size={size} />,
      <CarrotGrowing size={size} />,
      <CarrotRipe size={size} />
    ][s];
  }
  if (cropType === 4) {
    return [
      <PumpkinSeed size={size} />,
      <PumpkinSprout size={size} />,
      <PumpkinGrowing size={size} />,
      <PumpkinRipe size={size} />
    ][s];
  }
  return <IconSeedling size={size} />;
}

/** Legacy helper — always returns the mature (stage 3) icon. */
export function CropIcon({ cropType, size = 48 }: { cropType: number; size?: number }) {
  return <CropStageIcon cropType={cropType} stage={3} size={size} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Seed-bag icon: shows a burlap sack wrapping a tiny crop seed icon.
// The knot / tie ribbon uses the crop's accent colour for quick recognition.
// ────────────────────────────────────────────────────────────────────────────

const SEED_BAG_COLORS: Record<number, { bag: string; knot: string; label: string }> = {
  1: { bag: '#C8A660', knot: '#DAA520', label: 'W' }, // Wheat  — amber
  2: { bag: '#C8A660', knot: '#F5D020', label: 'C' }, // Corn   — yellow
  3: { bag: '#C8A660', knot: '#E07820', label: 'Ca' }, // Carrot — orange
  4: { bag: '#C8A660', knot: '#E06820', label: 'P' } // Pumpkin — deep-orange
};

export function SeedBagIcon({ cropType, size = 22 }: { cropType: number; size?: number }) {
  const c = SEED_BAG_COLORS[cropType] ?? { bag: '#C8A660', knot: '#888', label: '?' };
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bag body */}
      <path
        d="M4 10.5 C3 10.5 2 11.5 2.5 14 L4 20.5 C4.5 22 6 22.5 8 22.5 L14 22.5 C16 22.5 17.5 22 18 20.5 L19.5 14 C20 11.5 19 10.5 18 10.5 Z"
        fill={c.bag}
        stroke="#7A5820"
        strokeWidth="0.6"
      />
      {/* Bag neck pinch */}
      <path
        d="M8 10.5 L8.5 8 C9 6.5 10 6 11 6 C12 6 13 6.5 13.5 8 L14 10.5"
        stroke="#7A5820"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Knot / ribbon */}
      <ellipse cx="11" cy="7" rx="2.2" ry="1.4" fill={c.knot} stroke="#5A3810" strokeWidth="0.5" />
      {/* Cross-hatch texture lines on bag */}
      <line x1="6" y1="13" x2="16" y2="13" stroke="#7A5820" strokeWidth="0.4" strokeOpacity="0.4" />
      <line
        x1="5.5"
        y1="16"
        x2="16.5"
        y2="16"
        stroke="#7A5820"
        strokeWidth="0.4"
        strokeOpacity="0.4"
      />
      <line x1="5" y1="19" x2="17" y2="19" stroke="#7A5820" strokeWidth="0.4" strokeOpacity="0.4" />
      {/* Small crop stage-0 icon centred in the bag */}
      <foreignObject x="7" y="12" width="8" height="8">
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CropStageIcon cropType={cropType} stage={0} size={7} />
        </div>
      </foreignObject>
    </svg>
  );
}
