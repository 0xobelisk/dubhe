/**
 * Keeper duties: permissionless settlement calls that keep the town moving.
 * Anyone can perform them; the runner volunteers its first citizen.
 *   - town_system::tick             once the current town day is over
 *   - town_system::close_election   once an election round has ended
 */
import type { ActionExecutor } from './actions.ts';
import type { WorldSnapshot } from './perception.ts';
import type { Citizen } from './types.ts';

export async function runKeeper(
  executor: ActionExecutor,
  snapshot: WorldSnapshot,
  citizens: Citizen[],
  resolveStorage: (owner: string) => Promise<string>
): Promise<void> {
  const keeper = citizens[0];
  const now = Date.now();
  const { town, election } = snapshot;

  if (now >= town.dayStartMs + town.dayLengthMs) {
    try {
      const digest = await executor.tick(keeper.session);
      console.log(`[keeper] town day ${town.day} -> ${town.day + 1} (${digest})`);
    } catch (e) {
      console.log(`[keeper] tick failed: ${trim(e)}`);
    }
  }

  if (election.round > 0 && election.endsAt > 0 && now >= election.endsAt) {
    try {
      const winner = pickWinner(election);
      // With no winner the Move side skips the ownership check, so any
      // storage satisfies the parameter.
      let storageId = keeper.userStorageId;
      if (winner) {
        const ownerRow = snapshot.agents.find((a) => a.agentId === winner);
        if (ownerRow) storageId = await resolveStorage(ownerRow.owner);
      }
      const digest = await executor.closeElection(keeper.session, storageId);
      console.log(`[keeper] election round ${election.round} closed, winner=${winner ?? 'none'} (${digest})`);
    } catch (e) {
      console.log(`[keeper] close_election failed: ${trim(e)}`);
    }
  }
}

/** Mirror of town_system::close_election winner selection. */
function pickWinner(e: WorldSnapshot['election']): string | null {
  const aOk = !isZero(e.candidateA);
  const bOk = !isZero(e.candidateB);
  if (aOk && (!bOk || e.votesA >= e.votesB)) return e.candidateA;
  if (bOk) return e.candidateB;
  return null;
}

function isZero(addr: string): boolean {
  return !addr || /^0x0+$/.test(addr);
}

function trim(e: unknown): string {
  return String(e instanceof Error ? e.message : e).slice(0, 140);
}
