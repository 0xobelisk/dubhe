import { BasicBcsTypes } from './const';

function capitalizeFirstLetter(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function normalizeHexAddress(input: string): string | null {
  const hexRegex = /^(0x)?[0-9a-fA-F]{64}$/;

  if (hexRegex.test(input)) {
    if (input.startsWith('0x')) {
      return input;
    } else {
      return '0x' + input;
    }
  } else {
    return null;
  }
}

function numberToAddressHex(num: number): string {
  const hex = num.toString(16);
  const paddedHex = '0x' + hex.padStart(64, '0');
  return paddedHex;
}

function normalizePackageId(input: string): string {
  const withPrefix = input.startsWith('0x') ? input : '0x' + input;
  const withoutPrefix = withPrefix.slice(2);
  const normalized = withoutPrefix.replace(/^0+/, '');
  return '0x' + normalized;
}

function convertHttpToWebSocket(url: string): string {
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://');
  } else if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://');
  }
  return url;
}

/**
 * Build the fully-qualified Move type string for a DApp's `DappKey`.
 *
 * The format matches what `std::type_name::get<DappKey>()` returns on-chain:
 * `<64-char-zero-padded-address>::dapp_key::DappKey`
 *
 * @param packageId - The DApp's published package ID (with or without 0x prefix).
 *
 * @example
 * ```typescript
 * tx.moveCall({
 *   target: `${frameworkPackageId}::dapp_system::settle_writes`,
 *   typeArguments: [normalizeDappKey(packageId)],
 *   arguments: [...],
 * });
 * ```
 */
function normalizeDappKey(packageId: string): string {
  const raw = packageId.replace(/^0x/, '');
  return `${raw.padStart(64, '0')}::dapp_key::DappKey`;
}

export {
  BasicBcsTypes,
  capitalizeFirstLetter,
  normalizeHexAddress,
  numberToAddressHex,
  normalizePackageId,
  convertHttpToWebSocket,
  normalizeDappKey
};
