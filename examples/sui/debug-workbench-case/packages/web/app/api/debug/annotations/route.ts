import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { resolveContractsDir } from '@/lib/debug-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STORE_FILENAME = 'workbench-annotations.json';
const MAX_NOTE_LENGTH = 6000;

type StepAnnotation = {
  starred: boolean;
  note: string;
  updatedAt: string;
};

type AnnotationMap = Record<string, StepAnnotation>;

type AnnotationStore = {
  revision: string;
  updatedAt: string;
  annotations: AnnotationMap;
};

type PutPayload = {
  contractsDir?: string;
  revision?: string;
  annotations?: Record<string, Partial<StepAnnotation>>;
};

function annotationsPath(contractsDir: string): string {
  const reportsDir = path.join(contractsDir, '.reports', 'move');
  fs.mkdirSync(reportsDir, { recursive: true });
  return path.join(reportsDir, STORE_FILENAME);
}

function normalizeStepId(raw: string): string {
  return raw.trim().slice(0, 240);
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeAnnotation(value: Partial<StepAnnotation>): StepAnnotation {
  const note = typeof value.note === 'string' ? value.note.slice(0, MAX_NOTE_LENGTH) : '';
  return {
    starred: value.starred === true,
    note,
    updatedAt: normalizeTimestamp(value.updatedAt)
  };
}

function normalizeAnnotations(input: unknown): AnnotationMap {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const out: AnnotationMap = {};

  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const stepId = normalizeStepId(rawKey);
    if (!stepId) continue;
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue;

    const normalized = normalizeAnnotation(rawValue as Partial<StepAnnotation>);
    if (!normalized.starred && !normalized.note.trim()) {
      continue;
    }

    out[stepId] = normalized;
  }

  return out;
}

function readStore(filePath: string): AnnotationStore {
  if (!fs.existsSync(filePath)) {
    return {
      revision: '0',
      updatedAt: new Date().toISOString(),
      annotations: {}
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<AnnotationStore>;
    const annotations = normalizeAnnotations(raw.annotations);
    const revision = typeof raw.revision === 'string' ? raw.revision : '0';
    const updatedAt = normalizeTimestamp(raw.updatedAt);

    return {
      revision,
      updatedAt,
      annotations
    };
  } catch {
    return {
      revision: '0',
      updatedAt: new Date().toISOString(),
      annotations: {}
    };
  }
}

function nextRevision(current: string): string {
  const parsed = Number.parseInt(current, 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return String(parsed + 1);
  }
  return String(Date.now());
}

function writeStore(filePath: string, store: AnnotationStore): void {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(store, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function responseHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };
}

export async function GET(request: NextRequest) {
  try {
    const contractsDir = resolveContractsDir(
      request.nextUrl.searchParams.get('contractsDir') ?? undefined
    );
    const filePath = annotationsPath(contractsDir);
    const store = readStore(filePath);

    return NextResponse.json(
      {
        ok: true,
        revision: store.revision,
        updatedAt: store.updatedAt,
        annotations: store.annotations
      },
      {
        headers: responseHeaders()
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: responseHeaders() }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as PutPayload;
    const contractsDir = resolveContractsDir(payload.contractsDir);
    const expectedRevision = typeof payload.revision === 'string' ? payload.revision : undefined;
    const filePath = annotationsPath(contractsDir);

    const current = readStore(filePath);
    if (typeof expectedRevision === 'string' && expectedRevision !== current.revision) {
      return NextResponse.json(
        {
          ok: false,
          error: 'annotations revision conflict',
          expectedRevision,
          currentRevision: current.revision,
          currentAnnotations: current.annotations,
          currentUpdatedAt: current.updatedAt
        },
        {
          status: 409,
          headers: responseHeaders()
        }
      );
    }

    const annotations = normalizeAnnotations(payload.annotations);
    const store: AnnotationStore = {
      revision: nextRevision(current.revision),
      updatedAt: new Date().toISOString(),
      annotations
    };
    writeStore(filePath, store);

    return NextResponse.json(
      {
        ok: true,
        revision: store.revision,
        updatedAt: store.updatedAt,
        annotations: store.annotations
      },
      {
        headers: responseHeaders()
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      {
        status: 400,
        headers: responseHeaders()
      }
    );
  }
}
