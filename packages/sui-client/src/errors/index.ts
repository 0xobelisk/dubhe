export class ContractDataParsingError extends Error {
  public readonly errorType: string;
  public readonly functionName: string;
  public readonly moduleAddress: string;
  public readonly errorMessage: string;

  constructor(dryResult: any) {
    const error = dryResult?.effects?.status?.error || '';
    const functionMatch = error
      ? error.match(/function_name: Some\("([^"]+)"\)/)
      : null;
    const moduleMatch = error ? error.match(/address: ([a-fA-F0-9]+)/) : null;

    const functionName = functionMatch ? functionMatch[1] : 'unknown';
    const moduleAddress = moduleMatch ? '0x' + moduleMatch[1] : 'unknown';
    const errorMessage = dryResult.error ? dryResult.error : 'UNKNOWN_ERROR';

    const message = [
      `\n- Function: ${functionName}`,
      `- Module Address: ${moduleAddress}`,
      `- Error Message: ${errorMessage}`,
    ].join('\n');

    super(message);

    this.errorType = 'ContractDataParsingError';
    this.functionName = functionName;
    this.moduleAddress = moduleAddress;
    this.errorMessage = errorMessage;
  }
}
