import type { WorkbenchCategory, WorkbenchEvent, WorkbenchSeverity } from './workbenchUtils';

export type DebugTuiFilters = {
  category: WorkbenchCategory | 'all';
  severity: WorkbenchSeverity | 'all';
  search: string;
};

function includesIgnoreCase(raw: string | undefined, query: string): boolean {
  if (!query) return true;
  if (!raw) return false;
  return raw.toLowerCase().includes(query.toLowerCase());
}

export function filterWorkbenchEvents(
  events: WorkbenchEvent[],
  filters: DebugTuiFilters
): WorkbenchEvent[] {
  const query = filters.search.trim().toLowerCase();
  return events.filter((event) => {
    if (filters.category !== 'all' && event.category !== filters.category) return false;
    if (filters.severity !== 'all' && event.severity !== filters.severity) return false;
    if (!query) return true;

    if (includesIgnoreCase(event.title, query)) return true;
    if (includesIgnoreCase(event.detail, query)) return true;
    if (includesIgnoreCase(event.sourceFile, query)) return true;
    if (includesIgnoreCase(event.command, query)) return true;
    if (event.tags.some((item) => includesIgnoreCase(item, query))) return true;
    return false;
  });
}

export function extractDigestFromEvent(event: WorkbenchEvent): string | undefined {
  const joined = [event.title, event.detail, ...(event.tags || [])].filter(Boolean).join(' ');
  const match = joined.match(/0x[a-fA-F0-9]{8,}/);
  return match ? match[0] : undefined;
}

function nodeRank(node: any): number {
  const kind = node?.kind;
  if (kind === 'tx') return 0;
  if (kind === 'kind') return 1;
  if (kind === 'call') return 2;
  return 3;
}

export function buildPseudoCallStack(traceCallGraph: any, digest: string | undefined): string[] {
  if (!traceCallGraph || typeof traceCallGraph !== 'object') return [];
  const nodes = Array.isArray(traceCallGraph.nodes) ? traceCallGraph.nodes : [];
  if (nodes.length === 0) return [];
  const normalizedDigest =
    typeof digest === 'string' && digest.trim().length > 0 ? digest.trim() : undefined;

  const scoped = normalizedDigest
    ? nodes.filter((node: any) => node?.digest === normalizedDigest)
    : nodes.slice(0, 8);
  if (scoped.length === 0) return [];

  const sorted = scoped
    .slice()
    .sort(
      (a: any, b: any) => nodeRank(a) - nodeRank(b) || (a?.callIndex || 0) - (b?.callIndex || 0)
    );
  return sorted
    .map((node: any) => (typeof node?.label === 'string' ? node.label : 'unknown frame'))
    .slice(0, 20);
}

export function findContinueIndex(
  events: WorkbenchEvent[],
  currentIndex: number,
  breakpoints: Set<string>
): number | undefined {
  if (events.length === 0) return undefined;
  for (let i = currentIndex + 1; i < events.length; i += 1) {
    const event = events[i];
    if (!event) continue;
    if (breakpoints.has(event.id)) return i;
    if (event.severity === 'warn' || event.severity === 'error') return i;
  }
  return undefined;
}

export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}
