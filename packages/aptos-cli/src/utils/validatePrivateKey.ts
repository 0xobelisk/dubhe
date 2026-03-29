export function validatePrivateKey(privateKey: string): boolean | string {
  if (privateKey.startsWith('0x')) {
    const strippedPrivateKey = privateKey.slice(2); // del "0x"
    if (strippedPrivateKey.length === 64) {
      return strippedPrivateKey;
    } else {
      return false;
    }
  } else {
    if (privateKey.length === 64) {
      return privateKey;
    } else {
      return false;
    }
  }
}
