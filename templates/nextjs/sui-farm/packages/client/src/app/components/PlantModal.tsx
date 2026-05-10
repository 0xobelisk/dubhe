'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CROP_LIST } from '../lib/crops';
import { CropStageIcon, SeedBagIcon } from './icons/GameIcons';

interface PlantModalProps {
  plotId: number | null;
  inventory: Record<number, bigint>;
  onPlant: (plotId: number, cropType: number, count: number) => void;
  onClose: () => void;
}

export function PlantModal({ plotId, inventory, onPlant, onClose }: PlantModalProps) {
  const [hoveredType, setHoveredType] = useState<number | null>(null);

  if (plotId === null) return null;

  function handleClose() {
    setHoveredType(null);
    onClose();
  }

  const growLabel = (ms: number) => (ms / 60000 < 60 ? `${ms / 60000}m` : `${ms / 3600000}h`);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-[#1A0D04] border-2 border-[#C8A96E] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
          initial={{ scale: 0.88, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#3A2010]">
            <h2 className="font-pixel text-[#C8A96E] text-[11px] tracking-widest uppercase">
              Choose a Crop
            </h2>
            <button
              onClick={handleClose}
              className="text-[#5C3D1A] hover:text-[#C8A96E] text-xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Crop cards */}
          <div className="grid grid-cols-2 gap-2 p-4">
            {CROP_LIST.map((crop) => {
              const owned = Number(inventory[crop.type] ?? 0);
              const canPlant = owned >= 1;
              const isHov = hoveredType === crop.type;

              return (
                <button
                  key={crop.type}
                  disabled={!canPlant}
                  onMouseEnter={() => canPlant && setHoveredType(crop.type)}
                  onMouseLeave={() => setHoveredType(null)}
                  onClick={() => {
                    if (!canPlant || plotId === null) return;
                    onPlant(plotId, crop.type, 1);
                  }}
                  className={`
                    flex flex-col items-start gap-2 p-3 rounded-lg border-2
                    transition-all duration-150 text-left
                    ${
                      canPlant
                        ? isHov
                          ? 'border-[#FFD700] bg-[#3A2008] scale-[1.02] cursor-pointer'
                          : 'border-[#7B5A14] bg-[#231008] hover:border-[#C8A96E] cursor-pointer'
                        : 'border-[#2A1408] bg-[#120804] opacity-35 cursor-not-allowed'
                    }
                  `}
                >
                  {/* Top row: mature icon + name/time */}
                  <div className="flex items-center gap-2 w-full">
                    <CropStageIcon cropType={crop.type} stage={3} size={36} />
                    <div className="flex-1">
                      <p className="font-pixel text-[10px] text-[#C8A96E] leading-tight">
                        {crop.name}
                      </p>
                      <p className="text-[9px] text-[#8B6030] mt-0.5">
                        {growLabel(crop.growthMs)} grow
                      </p>
                      <p
                        className={`text-[9px] font-bold mt-0.5 flex items-center gap-1 ${
                          canPlant ? 'text-[#DAA520]' : 'text-[#5C3D1A]'
                        }`}
                      >
                        <SeedBagIcon cropType={crop.type} size={13} />
                        {owned} seeds
                      </p>
                    </div>
                  </div>

                  {/* Preview row: sprout icons showing how many plants will grow */}
                  <div className="w-full">
                    <p className="text-[8px] font-pixel text-[#5C4020] mb-1">
                      1 seed → {crop.yieldPerSeed} {crop.name.toLowerCase()}s ·{' '}
                      {growLabel(crop.growthMs)}
                    </p>
                    <div className="flex flex-wrap gap-0.5">
                      {Array.from({ length: crop.yieldPerSeed }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={false}
                          animate={
                            isHov
                              ? { scale: 1, opacity: 1, y: 0 }
                              : { scale: 0.85, opacity: 0.5, y: 2 }
                          }
                          transition={{ delay: i * 0.03 }}
                        >
                          <CropStageIcon cropType={crop.type} stage={1} size={16} />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Not enough seeds warning */}
                  {owned === 0 && (
                    <p className="text-[8px] font-pixel text-[#5C3D1A]">buy seeds first</p>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[8px] font-pixel text-[#3A2010] pb-3">
            tap a crop to plant it
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
