'use client';

/**
 * Collection — card inventory, pack opening (on-chain randomness) and
 * battle deck selection (exactly 5 distinct owned cards).
 */

import { useState } from 'react';
import { toast } from 'sonner';

import { useGame } from '../hooks/useGame';
import { GameShell } from '../components/GameShell';
import { CardView } from '../components/CardView';
import { IconGold, IconCards } from '../components/icons';
import { DECK_SIZE } from '../lib/game';
import { ZERO_ADDRESS } from '@0xobelisk/graphql-client';

const SUI_RANDOM = '0x8';
const PACK_PRICE = 100; // mirrors deploy_hook default; shown as a hint only

export default function CollectionPage() {
  const game = useGame(5000);
  const { player, userStorageId, storageId, pkg, execTx, isLoading } = game;

  // Deck editing state: starts from the on-chain deck.
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);

  const inMatch = player.battle.matchId !== ZERO_ADDRESS;
  const deckSet = new Set(player.deck);

  const startEditing = () => {
    setSelection([...player.deck]);
    setEditing(true);
  };

  const toggleCard = (cardId: string) => {
    setSelection((sel) => {
      if (sel.includes(cardId)) return sel.filter((c) => c !== cardId);
      if (sel.length >= DECK_SIZE) {
        toast.error(`Deck is full (${DECK_SIZE} cards) — remove one first`);
        return sel;
      }
      return [...sel, cardId];
    });
  };

  const handleOpenPack = () =>
    execTx((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::card_system::open_pack`,
        arguments: [tx.object(storageId), tx.object(userStorageId), tx.object(SUI_RANDOM)]
      });
    }, 'Pack opened — a new card joins your collection!');

  const handleSaveDeck = () => {
    if (selection.length !== DECK_SIZE) {
      toast.error(`Select exactly ${DECK_SIZE} cards`);
      return;
    }
    execTx(
      (tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::card_system::set_deck`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.pure.vector('address', selection)
          ]
        });
      },
      'Battle deck updated!',
      () => setEditing(false)
    );
  };

  const sortedCards = [...player.cards].sort(
    (a, b) => b.rarity - a.rarity || a.kind - b.kind || b.power - a.power
  );

  return (
    <GameShell game={game}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: pack + deck ── */}
        <div className="space-y-4">
          <div className="bg-slate-950/80 border-2 border-indigo-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-pixel text-indigo-300 text-xs flex items-center gap-2">
              <IconCards size={18} /> Card Pack
            </h2>
            <p className="text-indigo-700 text-[11px]">
              Mint a random card using Sui on-chain randomness. Kind: Strike 40% / Fireball 25% /
              Heal 20% / Shield 15%. Rarity: Common 70% / Rare 25% / Epic 5%.
            </p>
            <button
              onClick={handleOpenPack}
              disabled={isLoading || player.gold < BigInt(PACK_PRICE)}
              className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              Open Pack — <IconGold size={12} /> {PACK_PRICE}
            </button>
          </div>

          <div className="bg-slate-950/80 border-2 border-amber-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-amber-300 text-xs">Battle Deck ({DECK_SIZE})</h2>
              {!editing ? (
                <button
                  onClick={startEditing}
                  disabled={inMatch}
                  title={inMatch ? 'Cannot edit the deck mid-match' : undefined}
                  className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSaveDeck}
                    disabled={isLoading || selection.length !== DECK_SIZE}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Save ({selection.length}/{DECK_SIZE})
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <p className="text-amber-700/70 text-[11px]">
              In duels each deck card can be played once per match. Brawl cards are reusable every
              turn.
            </p>
            <div className="flex flex-wrap gap-2">
              {(editing ? selection : player.deck).map((id) => {
                const card = player.cards.find((c) => c.cardId === id);
                return card ? (
                  <CardView
                    key={id}
                    card={card}
                    small
                    onClick={editing ? () => toggleCard(id) : undefined}
                    selected={editing}
                  />
                ) : (
                  <div
                    key={id}
                    className="w-20 h-28 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-[9px] font-pixel"
                  >
                    listed?
                  </div>
                );
              })}
              {(editing ? selection : player.deck).length === 0 && (
                <p className="text-slate-600 text-[11px]">No deck set.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: full collection ── */}
        <div className="lg:col-span-2">
          <h2 className="font-pixel text-indigo-400 text-xs mb-3">
            Collection ({player.cards.length} cards)
            {editing && (
              <span className="text-amber-400 ml-2">— click cards to add/remove from deck</span>
            )}
          </h2>
          {sortedCards.length === 0 ? (
            <div className="bg-slate-950/40 border border-indigo-900/40 rounded-xl p-8 text-center">
              <p className="text-indigo-700 font-pixel text-[11px]">
                No cards yet — register grants a starter deck, or open a pack.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {sortedCards.map((card) => (
                <div key={card.cardId} className="relative">
                  <CardView
                    card={card}
                    selected={editing ? selection.includes(card.cardId) : deckSet.has(card.cardId)}
                    onClick={editing ? () => toggleCard(card.cardId) : undefined}
                  />
                  {!editing && deckSet.has(card.cardId) && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[8px] font-pixel px-1.5 py-0.5 rounded-full">
                      DECK
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
