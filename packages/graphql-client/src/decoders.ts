/**
 * Minimal BCS decoders for indexer raw values.
 *
 * The Dubhe indexer stores scene/object field values and marketplace record
 * data as hex-encoded BCS bytes (e.g. "0x0c00000000000000" for u64 12).
 * These helpers decode the primitive types commonly stored in system tables.
 */

export const ZERO_ADDRESS = '0x' + '0'.repeat(64);

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  const pairs = clean.match(/../g) ?? [];
  return Uint8Array.from(pairs.map((b) => parseInt(b, 16)));
}

function readUIntLE(bytes: Uint8Array, offset: number, width: number): bigint {
  let n = 0n;
  for (let i = width - 1; i >= 0; i--) {
    n = (n << 8n) | BigInt(bytes[offset + i] ?? 0);
  }
  return n;
}

/** Read a ULEB128-encoded length prefix. Returns [value, bytesConsumed]. */
function readUleb(bytes: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let consumed = 0;
  for (;;) {
    const byte = bytes[offset + consumed] ?? 0;
    value |= (byte & 0x7f) << shift;
    consumed++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [value, consumed];
}

export function decodeU8(hex: string): number {
  return Number(readUIntLE(hexToBytes(hex), 0, 1));
}

export function decodeU16(hex: string): number {
  return Number(readUIntLE(hexToBytes(hex), 0, 2));
}

export function decodeU32(hex: string): number {
  return Number(readUIntLE(hexToBytes(hex), 0, 4));
}

export function decodeU64(hex: string): bigint {
  return readUIntLE(hexToBytes(hex), 0, 8);
}

export function decodeU128(hex: string): bigint {
  return readUIntLE(hexToBytes(hex), 0, 16);
}

export function decodeBool(hex: string): boolean {
  return (hexToBytes(hex)[0] ?? 0) !== 0;
}

export function decodeAddress(hex: string): string {
  const bytes = hexToBytes(hex);
  return '0x' + Array.from(bytes.slice(0, 32), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function decodeVectorAddress(hex: string): string[] {
  const bytes = hexToBytes(hex);
  const [len, consumed] = readUleb(bytes, 0);
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const start = consumed + i * 32;
    out.push(
      '0x' +
        Array.from(bytes.slice(start, start + 32), (b) => b.toString(16).padStart(2, '0')).join('')
    );
  }
  return out;
}

/** Decode a BCS ascii/utf8 String (ULEB length prefix + bytes). */
export function decodeString(hex: string): string {
  const bytes = hexToBytes(hex);
  const [len, consumed] = readUleb(bytes, 0);
  return new TextDecoder().decode(bytes.slice(consumed, consumed + len));
}

/**
 * Marketplace recordDataRaw is a JSON array of per-field hex strings
 * (non-key fields, in schema order).
 */
export function parseRecordData(recordDataRaw: string): string[] {
  try {
    return JSON.parse(recordDataRaw) as string[];
  } catch {
    return [recordDataRaw];
  }
}
