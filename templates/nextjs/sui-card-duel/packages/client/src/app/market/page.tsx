'use client';

/**
 * Market — card NFTs (keyed + listable) and gold (fungible + listable)
 * traded for SUI through the framework marketplace.
 *
 * Listing/buying requires the main wallet: the framework rejects session
 * keys for marketplace record operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { useGame } from '../hooks/useGame';
import { GameShell } from '../components/GameShell';
import { CardView } from '../components/CardView';
import { IconGold } from '../components/icons';
import { decodeU8, decodeU32, decodeU64, parseRecordData } from '@0xobelisk/graphql-client';
import { KIND_NAME, RARITY_NAME, shortAddr, type CardData } from '../lib/game';
import { ZERO_ADDRESS } from '@0xobelisk/graphql-client';

interface CardListing {
  id: string;
  seller: string;
  card: CardData;
  price: bigint;
}

interface GoldListing {
  id: string;
  seller: string;
  amount: bigint;
  price: bigint;
}

export default function MarketPage() {
  const game = useGame(10000);
  const {
    account,
    graphqlClient,
    player,
    userStorageId,
    hubId,
    storageId,
    pkg,
    execTxWithMainWallet,
    isLoading
  } = game;

  const [activeTab, setActiveTab] = useState<'cards' | 'gold'>('cards');
  const [cardListings, setCardListings] = useState<CardListing[]>([]);
  const [goldListings, setGoldListings] = useState<GoldListing[]>([]);
  const [cardToList, setCardToList] = useState<string>('');
  const [cardPrice, setCardPrice] = useState(0.1);
  const [goldForm, setGoldForm] = useState({ amount: 100, price: 0.05 });

  const inMatch = player.battle.matchId !== ZERO_ADDRESS;

  // ── Fetch listings ──────────────────────────────────────────────────────────

  const fetchListings = useCallback(async () => {
    if (!graphqlClient) return;
    try {
      const result = await graphqlClient.getMarketplaceListings({ status: 'listed' });
      const cards: CardListing[] = [];
      const gold: GoldListing[] = [];
      result.edges.forEach(({ node }: any) => {
        const { recordType, listingId, seller, price, recordDataRaw } = node;
        if (recordType === 'card') {
          try {
            // Non-key fields in schema order: kind(u8), power(u32), rarity(u8)
            const raw = parseRecordData(recordDataRaw);
            cards.push({
              id: listingId,
              seller,
              price: BigInt(price),
              card: {
                cardId: listingId,
                kind: decodeU8(raw[0] ?? '0x00'),
                power: decodeU32(raw[1] ?? '0x00000000'),
                rarity: decodeU8(raw[2] ?? '0x00')
              }
            });
          } catch {
            /* skip malformed */
          }
        } else if (recordType === 'gold') {
          const raw = parseRecordData(recordDataRaw);
          gold.push({
            id: listingId,
            seller,
            amount: decodeU64(raw[0] ?? '0x00'),
            price: BigInt(price)
          });
        }
      });
      setCardListings(cards);
      setGoldListings(gold);
    } catch (err) {
      console.error('[market] fetch error:', err);
    }
  }, [graphqlClient]);

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 5000);
    return () => clearInterval(interval);
  }, [fetchListings]);

  // ── Actions (main wallet only) ──────────────────────────────────────────────

  const handleListCard = () => {
    if (!cardToList) {
      toast.error('Pick a card to list');
      return;
    }
    execTxWithMainWallet(
      (tx) => {
        if (!userStorageId) throw new Error('UserStorage not found');
        tx.moveCall({
          target: `${pkg}::market_system::list_card`,
          arguments: [
            tx.object(storageId),
            tx.object(userStorageId),
            tx.pure.address(cardToList),
            tx.pure.u64(BigInt(Math.round(cardPrice * 1e9)))
          ]
        });
      },
      'Card listed on the market!',
      () => setCardToList('')
    );
  };

  const handleBuyCard = (l: CardListing) =>
    execTxWithMainWallet((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(l.price)]);
      tx.moveCall({
        target: `${pkg}::market_system::buy_card`,
        arguments: [
          tx.object(hubId),
          tx.object(storageId),
          tx.object(l.id),
          tx.object(userStorageId),
          payment
        ]
      });
    }, 'Card purchased!');

  const handleCancelCard = (l: CardListing) =>
    execTxWithMainWallet((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::market_system::cancel_card_listing`,
        arguments: [tx.object(l.id), tx.object(userStorageId)]
      });
    }, 'Listing cancelled — card returned.');

  const handleListGold = () =>
    execTxWithMainWallet((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::market_system::list_gold`,
        arguments: [
          tx.object(storageId),
          tx.object(userStorageId),
          tx.pure.u64(goldForm.amount),
          tx.pure.u64(BigInt(Math.round(goldForm.price * 1e9)))
        ]
      });
    }, `Listed ${goldForm.amount} gold!`);

  const handleBuyGold = (l: GoldListing) =>
    execTxWithMainWallet((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(l.price)]);
      tx.moveCall({
        target: `${pkg}::market_system::buy_gold`,
        arguments: [
          tx.object(hubId),
          tx.object(storageId),
          tx.object(l.id),
          tx.object(userStorageId),
          payment
        ]
      });
    }, `Bought ${l.amount} gold!`);

  const handleCancelGold = (l: GoldListing) =>
    execTxWithMainWallet((tx) => {
      if (!userStorageId) throw new Error('UserStorage not found');
      tx.moveCall({
        target: `${pkg}::market_system::cancel_gold_listing`,
        arguments: [tx.object(l.id), tx.object(userStorageId)]
      });
    }, 'Listing cancelled — gold returned.');

  // Cards I own that are NOT in my battle deck are the safest to list.
  const listableCards = player.cards;

  return (
    <GameShell game={game}>
      <p className="mb-4 text-[11px] text-indigo-700 font-pixel px-1">
        Market requires main wallet signature (session keys are not permitted for marketplace
        operations). Prices are in SUI.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['cards', 'gold'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-pixel rounded-xl transition-colors border capitalize ${
              activeTab === tab
                ? 'bg-indigo-700 text-indigo-100 border-indigo-600'
                : 'bg-indigo-950/40 text-indigo-500 border-indigo-800/40 hover:bg-indigo-900/40'
            }`}
          >
            {tab === 'cards' ? 'Card NFTs' : 'Gold'}
          </button>
        ))}
      </div>

      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List form */}
          <div className="bg-slate-950/80 border-2 border-indigo-800 rounded-2xl p-4 space-y-3 self-start">
            <h2 className="font-pixel text-indigo-300 text-xs">List a Card</h2>
            {inMatch && (
              <p className="text-red-500 text-[10px]">Cannot list cards while in a match.</p>
            )}
            <select
              value={cardToList}
              onChange={(e) => setCardToList(e.target.value)}
              className="w-full bg-indigo-950/40 border border-indigo-800 text-indigo-200 rounded-lg px-3 py-2 text-xs"
            >
              <option value="">Select a card…</option>
              {listableCards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {KIND_NAME[c.kind]} {c.power} ({RARITY_NAME[c.rarity]})
                  {player.deck.includes(c.cardId) ? ' — in deck' : ''}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0.001}
              step={0.001}
              value={cardPrice}
              onChange={(e) => setCardPrice(Number(e.target.value))}
              placeholder="Price (SUI)"
              className="w-full bg-indigo-950/40 border border-indigo-800 text-indigo-200 rounded-lg px-3 py-2 text-xs"
            />
            <button
              onClick={handleListCard}
              disabled={isLoading || !cardToList || inMatch}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
            >
              List Card
            </button>
            <p className="text-indigo-800 text-[10px]">
              Listing removes the card from your storage (and battle deck) until sold or cancelled.
            </p>
          </div>

          {/* Listings */}
          <div className="lg:col-span-2">
            <h2 className="font-pixel text-indigo-400 text-xs mb-3">Card Listings</h2>
            {cardListings.length === 0 ? (
              <EmptyState text="No cards listed yet." />
            ) : (
              <div className="flex flex-wrap gap-4">
                {cardListings.map((l) => {
                  const isMine = l.seller === account?.address;
                  return (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <CardView card={l.card} />
                      <p className="text-indigo-400 text-[10px] font-pixel">
                        {(Number(l.price) / 1e9).toFixed(4)} SUI
                      </p>
                      <p className="text-indigo-700 text-[9px]">
                        {shortAddr(l.seller)}
                        {isMine && <span className="text-amber-500"> (you)</span>}
                      </p>
                      {isMine ? (
                        <button
                          onClick={() => handleCancelCard(l)}
                          disabled={isLoading}
                          className="w-full py-1 bg-red-900/70 hover:bg-red-800 text-red-300 text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyCard(l)}
                          disabled={isLoading}
                          className="w-full py-1 bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                        >
                          Buy
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gold' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-950/80 border-2 border-amber-800/60 rounded-2xl p-4 space-y-3 self-start">
            <h2 className="font-pixel text-amber-300 text-xs">List Gold</h2>
            <div className="flex items-center gap-2">
              <label className="text-amber-600 text-[10px] font-pixel w-16">Amount</label>
              <input
                type="number"
                min={1}
                value={goldForm.amount}
                onChange={(e) => setGoldForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className="flex-1 bg-amber-950/30 border border-amber-800/60 text-amber-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-amber-600 text-[10px] font-pixel w-16">Price SUI</label>
              <input
                type="number"
                min={0.001}
                step={0.001}
                value={goldForm.price}
                onChange={(e) => setGoldForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="flex-1 bg-amber-950/30 border border-amber-800/60 text-amber-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <button
              onClick={handleListGold}
              disabled={isLoading || player.gold < BigInt(goldForm.amount)}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-pixel rounded-lg disabled:opacity-40 transition-colors"
            >
              List Gold (own {player.gold.toString()})
            </button>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-pixel text-amber-400 text-xs mb-3">Gold Listings</h2>
            {goldListings.length === 0 ? (
              <EmptyState text="No gold listed yet." />
            ) : (
              goldListings.map((l) => {
                const isMine = l.seller === account?.address;
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-amber-950/20 border border-amber-800/40 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <IconGold size={18} />
                      <div>
                        <p className="font-pixel text-amber-200 text-xs">
                          {l.amount.toString()} gold
                        </p>
                        <p className="text-amber-700 text-[10px]">
                          {shortAddr(l.seller)}
                          {isMine && <span className="text-amber-500"> (you)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 text-xs">
                        {(Number(l.price) / 1e9).toFixed(4)} SUI
                      </span>
                      {isMine ? (
                        <button
                          onClick={() => handleCancelGold(l)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-red-900/70 hover:bg-red-800 text-red-300 text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyGold(l)}
                          disabled={isLoading}
                          className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-pixel rounded-lg disabled:opacity-40 transition-colors"
                        >
                          Buy
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-slate-950/40 border border-indigo-900/40 rounded-xl p-8 text-center">
      <p className="text-indigo-700 font-pixel text-[11px]">{text}</p>
    </div>
  );
}
