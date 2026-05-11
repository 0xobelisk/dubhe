'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CROPS, CROP_NONE, growthStage, growthProgress, formatDuration } from '../lib/crops';
import { IconLock, IconSeedling, CropIcon } from './icons/GameIcons';

interface PlotData {
  plotId: number;
  cropType: number;
  count: bigint;
  plantedAt: bigint;
  harvestAt: bigint;
}

interface FarmPlotCardProps {
  plot: PlotData | null;
  plotIndex: number;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  isLoading?: boolean;
}

/** SVG icon by default; PNG overlaid on top when the sprite file actually exists. */
function CropSprite({ cropType, stage, name }: { cropType: number; stage: number; name: string }) {
  const [pngFailed, setPngFailed] = useState(false);
  const pngSrc = `/assets/crops/${name.toLowerCase()}_stage${stage}.png`;

  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <CropIcon cropType={cropType} size={56} />
      {!pngFailed && (
        <Image
          src={pngSrc}
          alt={name}
          fill
          className="object-contain"
          style={{ imageRendering: 'pixelated' }}
          onError={() => setPngFailed(true)}
        />
      )}
    </div>
  );
}

export function FarmPlotCard({
  plot,
  plotIndex,
  onPlant,
  onHarvest,
  isLoading
}: FarmPlotCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (plot === null) {
    return (
      <div
        className="
        relative flex flex-col items-center justify-center h-52
        rounded-lg border-2 border-dashed border-[#5C3D1A]
        bg-[#1A0E06] overflow-hidden
      "
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #6B4423 0px, #6B4423 2px, transparent 2px, transparent 8px)'
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <IconLock size={32} className="opacity-50" />
          <p className="text-[#5C3D1A] text-xs font-pixel">Locked</p>
          <p className="text-[#3D2212] text-[10px] font-pixel text-center">Buy from shop</p>
        </div>
      </div>
    );
  }

  const cropType = plot.cropType;
  const isEmpty = cropType === CROP_NONE;
  const crop = isEmpty ? null : CROPS[cropType];
  const harvestAt = Number(plot.harvestAt);
  const plantedAt = Number(plot.plantedAt);
  const isReady = !isEmpty && now >= harvestAt;
  const progress = isEmpty ? 0 : growthProgress(plantedAt, harvestAt, now);
  const stage = isEmpty ? 0 : growthStage(plantedAt, harvestAt, now);
  const timeLeft = isEmpty ? 0 : Math.max(0, harvestAt - now);

  return (
    <motion.div
      className={`
        relative flex flex-col h-52 rounded-lg border-2 overflow-hidden cursor-pointer
        ${
          isReady
            ? 'border-[#7CFC00] shadow-[0_0_12px_rgba(124,252,0,0.3)]'
            : isEmpty
            ? 'border-[#5C3D1A]'
            : 'border-[#8B6914]'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        bg-[#1A0E06]
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A1708] via-[#1E1005] to-[#150B04]" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #6B4423 1px, transparent 1px)',
          backgroundSize: '8px 8px'
        }}
      />
      {isReady && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#7CFC00]/10 to-transparent animate-pulse" />
      )}

      <div className="absolute top-2 left-2 z-20 bg-[#3D2212]/90 border border-[#8B6914]/60 text-[#C8A96E] text-[10px] px-2 py-0.5 rounded font-pixel">
        Plot {plotIndex + 1}
      </div>

      <AnimatePresence>
        {isReady && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-2 right-2 z-20 bg-[#3D6B00] border border-[#7CFC00]/60 text-[#CCFF66] text-[10px] px-2 py-0.5 rounded font-pixel"
          >
            READY
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-1 opacity-40">
            <IconSeedling size={40} />
            <p className="text-[10px] font-pixel text-[#6B4423]">Empty</p>
          </div>
        ) : (
          <motion.div
            key={`${cropType}-${stage}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-1"
          >
            <CropSprite cropType={cropType} stage={stage} name={crop!.name} />
            <div className="text-center">
              <p className="text-[10px] text-[#C8A96E] font-pixel">{crop!.name}</p>
              <p className="text-[10px] text-[#8B7355]">×{Number(plot.count)}</p>
            </div>
          </motion.div>
        )}
      </div>

      {!isEmpty && (
        <div className="relative z-10 px-3 pb-1">
          <div className="flex justify-between text-[10px] font-pixel mb-1">
            <span className={isReady ? 'text-[#7CFC00]' : 'text-[#8B7355]'}>
              {isReady ? 'Harvest!' : formatDuration(timeLeft)}
            </span>
            <span className="text-[#5C3D1A]">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-[#0D0702] rounded-full overflow-hidden border border-[#3D2212]">
            <motion.div
              className={`h-full rounded-full ${isReady ? 'bg-[#7CFC00]' : 'bg-[#8B6914]'}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="relative z-10 px-3 pb-3 pt-1">
        {isEmpty ? (
          <button
            onClick={() => onPlant(plot.plotId)}
            className="w-full py-1.5 rounded bg-[#2A4A1A] hover:bg-[#3A6A22] border border-[#5A8A3C] hover:border-[#7CCC55] text-[#A8E88A] text-[11px] font-pixel tracking-wide transition-all duration-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          >
            Plant Seeds
          </button>
        ) : isReady ? (
          <motion.button
            onClick={() => onHarvest(plot.plotId)}
            className="w-full py-1.5 rounded bg-[#4A6B00] hover:bg-[#5A8B00] border border-[#7CFC00] text-[#CCFF66] text-[11px] font-pixel tracking-wide transition-all duration-100"
            animate={{
              boxShadow: [
                '0 0 6px rgba(124,252,0,0.3)',
                '0 0 14px rgba(124,252,0,0.6)',
                '0 0 6px rgba(124,252,0,0.3)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            Harvest!
          </motion.button>
        ) : (
          <div className="w-full py-1.5 bg-[#1A1005] border border-[#3D2212] text-[#5C3D1A] text-[11px] font-pixel rounded text-center">
            Growing...
          </div>
        )}
      </div>
    </motion.div>
  );
}
