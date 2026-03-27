import type {
  DryRunTransactionBlockResponse,
  ObjectOwner,
  SuiTransaction,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';

type TraceFormatOptions = {
  maxCalls?: number;
  maxEvents?: number;
  maxObjectChanges?: number;
  maxBalanceChanges?: number;
  showInputs?: boolean;
};

function shortId(id: string, prefix: number = 10, suffix: number = 6): string {
  if (id.length <= prefix + suffix + 3) return id;
  return `${id.slice(0, prefix)}...${id.slice(-suffix)}`;
}

function formatOwner(owner: ObjectOwner | undefined): string {
  if (!owner) return 'unknown';
  if (owner === 'Immutable') return 'Immutable';
  if ('AddressOwner' in owner) return `Address(${shortId(owner.AddressOwner)})`;
  if ('ObjectOwner' in owner) return `Object(${shortId(owner.ObjectOwner)})`;
  if ('Shared' in owner) return `Shared(v${owner.Shared.initial_shared_version})`;
  if ('ConsensusV2' in owner) {
    const authenticator = owner.ConsensusV2.authenticator;
    if ('SingleOwner' in authenticator) {
      return `Consensus(${shortId(authenticator.SingleOwner)})`;
    }
    return 'Consensus(multi)';
  }
  return 'unknown';
}

function formatBigIntLike(value: string | number | bigint): string {
  const asBigInt =
    typeof value === 'bigint'
      ? value
      : typeof value === 'number'
      ? BigInt(Math.trunc(value))
      : BigInt(value);
  return asBigInt.toLocaleString('en-US');
}

function formatSignedAmount(amount: string): string {
  const value = BigInt(amount);
  const abs = value < 0n ? -value : value;
  const sign = value >= 0n ? '+' : '-';
  return `${sign}${abs.toLocaleString('en-US')}`;
}

function summarizeProgrammableStep(step: SuiTransaction): string {
  if ('MoveCall' in step) {
    const call = step.MoveCall;
    const typeArgCount = call.type_arguments?.length ?? 0;
    const argCount = call.arguments?.length ?? 0;
    return `MoveCall ${shortId(call.package)}::${call.module}::${
      call.function
    } (${argCount} args, ${typeArgCount} type args)`;
  }
  if ('TransferObjects' in step) {
    const [objects] = step.TransferObjects;
    return `TransferObjects (${objects.length} objects)`;
  }
  if ('SplitCoins' in step) {
    const [, amounts] = step.SplitCoins;
    return `SplitCoins (${amounts.length} splits)`;
  }
  if ('MergeCoins' in step) {
    const [, mergeCoins] = step.MergeCoins;
    return `MergeCoins (${mergeCoins.length} merged)`;
  }
  if ('Publish' in step) {
    return `Publish (${step.Publish.length} modules)`;
  }
  if ('Upgrade' in step) {
    const [modules, packageId] = step.Upgrade;
    return `Upgrade ${shortId(packageId)} (${modules.length} modules)`;
  }
  if ('MakeMoveVec' in step) {
    const [, args] = step.MakeMoveVec;
    return `MakeMoveVec (${args.length} elements)`;
  }
  return 'Unknown transaction step';
}

function summarizeValue(value: unknown, maxLength: number = 120): string {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  } catch {
    return String(value);
  }
}

export function formatTraceOutput(
  response: SuiTransactionBlockResponse,
  options: TraceFormatOptions = {}
): string {
  const maxCalls = options.maxCalls ?? 12;
  const maxEvents = options.maxEvents ?? 10;
  const maxObjectChanges = options.maxObjectChanges ?? 20;
  const maxBalanceChanges = options.maxBalanceChanges ?? 20;
  const showInputs = options.showInputs ?? false;

  const lines: string[] = [];

  lines.push('Transaction Trace');
  lines.push(`Digest: ${response.digest}`);
  if (response.checkpoint != null) {
    lines.push(`Checkpoint: ${response.checkpoint}`);
  }
  if (response.timestampMs != null) {
    lines.push(`Timestamp: ${new Date(Number(response.timestampMs)).toISOString()}`);
  }

  const effects = response.effects;
  if (effects?.status) {
    const status = effects.status.status.toUpperCase();
    lines.push(`Status: ${status}`);
    if (effects.status.error) {
      lines.push(`Error: ${effects.status.error}`);
    }
  }
  if (response.transaction?.data?.sender) {
    lines.push(`Sender: ${response.transaction.data.sender}`);
  }

  if (effects?.gasUsed) {
    const computation = BigInt(effects.gasUsed.computationCost);
    const storage = BigInt(effects.gasUsed.storageCost);
    const rebate = BigInt(effects.gasUsed.storageRebate);
    const charged = computation + storage - rebate;
    lines.push('Gas:');
    lines.push(`  Charged: ${formatBigIntLike(charged)}`);
    lines.push(`  Computation: ${formatBigIntLike(computation)}`);
    lines.push(`  Storage: ${formatBigIntLike(storage)}`);
    lines.push(`  Rebate: ${formatBigIntLike(rebate)}`);
    lines.push(`  NonRefundable: ${formatBigIntLike(effects.gasUsed.nonRefundableStorageFee)}`);

    const gasData = response.transaction?.data?.gasData;
    if (gasData) {
      lines.push(`  Budget: ${formatBigIntLike(gasData.budget)}`);
      lines.push(`  Price: ${formatBigIntLike(gasData.price)}`);
      lines.push(`  GasOwner: ${gasData.owner}`);
    }
  }

  const txKind = response.transaction?.data?.transaction;
  if (txKind?.kind === 'ProgrammableTransaction') {
    const steps = txKind.transactions ?? [];
    if (showInputs) {
      lines.push(`Programmable Inputs: ${txKind.inputs.length}`);
      for (let i = 0; i < txKind.inputs.length; i++) {
        const input = txKind.inputs[i];
        lines.push(`  [${i}] ${summarizeValue(input)}`);
      }
    }
    lines.push(`Programmable Calls: ${steps.length}`);
    for (let i = 0; i < Math.min(steps.length, maxCalls); i++) {
      lines.push(`  ${i + 1}. ${summarizeProgrammableStep(steps[i])}`);
    }
    if (steps.length > maxCalls) {
      lines.push(`  ... ${steps.length - maxCalls} more calls`);
    }
  } else if (txKind?.kind) {
    lines.push(`Transaction Kind: ${txKind.kind}`);
  }

  const events = response.events ?? [];
  lines.push(`Events: ${events.length}`);
  for (let i = 0; i < Math.min(events.length, maxEvents); i++) {
    const event = events[i];
    lines.push(
      `  ${i + 1}. ${event.transactionModule}::${event.type} sender=${shortId(event.sender)}`
    );
  }
  if (events.length > maxEvents) {
    lines.push(`  ... ${events.length - maxEvents} more events`);
  }

  const objectChanges = response.objectChanges ?? [];
  const objectChangeCounts = objectChanges.reduce<Record<string, number>>((acc, change) => {
    acc[change.type] = (acc[change.type] ?? 0) + 1;
    return acc;
  }, {});
  if (objectChanges.length > 0) {
    lines.push(
      `Object Changes: ${objectChanges.length} (${Object.entries(objectChangeCounts)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')})`
    );
  } else {
    lines.push('Object Changes: 0');
  }

  for (let i = 0; i < Math.min(objectChanges.length, maxObjectChanges); i++) {
    const change = objectChanges[i];
    switch (change.type) {
      case 'published':
        lines.push(
          `  ${i + 1}. published package=${shortId(change.packageId)} modules=${
            change.modules.length
          }`
        );
        break;
      case 'created':
        lines.push(
          `  ${i + 1}. created ${shortId(change.objectId)} type=${
            change.objectType
          } owner=${formatOwner(change.owner)}`
        );
        break;
      case 'mutated':
        lines.push(
          `  ${i + 1}. mutated ${shortId(change.objectId)} type=${
            change.objectType
          } owner=${formatOwner(change.owner)}`
        );
        break;
      case 'transferred':
        lines.push(
          `  ${i + 1}. transferred ${shortId(change.objectId)} type=${
            change.objectType
          } recipient=${formatOwner(change.recipient)}`
        );
        break;
      case 'deleted':
      case 'wrapped':
        lines.push(
          `  ${i + 1}. ${change.type} ${shortId(change.objectId)} type=${change.objectType}`
        );
        break;
    }
  }
  if (objectChanges.length > maxObjectChanges) {
    lines.push(`  ... ${objectChanges.length - maxObjectChanges} more object changes`);
  }

  const balanceChanges = response.balanceChanges ?? [];
  lines.push(`Balance Changes: ${balanceChanges.length}`);
  for (let i = 0; i < Math.min(balanceChanges.length, maxBalanceChanges); i++) {
    const change = balanceChanges[i];
    lines.push(
      `  ${i + 1}. ${formatSignedAmount(change.amount)} ${change.coinType} owner=${formatOwner(
        change.owner
      )}`
    );
  }
  if (balanceChanges.length > maxBalanceChanges) {
    lines.push(`  ... ${balanceChanges.length - maxBalanceChanges} more balance changes`);
  }

  return lines.join('\n');
}

export function formatDryRunOutput(
  response: DryRunTransactionBlockResponse,
  options: TraceFormatOptions = {}
): string {
  const txLike: SuiTransactionBlockResponse = {
    digest: response.effects.transactionDigest,
    effects: response.effects,
    events: response.events,
    objectChanges: response.objectChanges,
    balanceChanges: response.balanceChanges,
    transaction: {
      data: response.input,
      txSignatures: []
    }
  };

  const lines = [formatTraceOutput(txLike, options)];
  if (response.executionErrorSource) {
    lines.push(`Dry-run Error Source: ${response.executionErrorSource}`);
  }
  if (response.suggestedGasPrice) {
    lines.push(`Suggested Gas Price: ${response.suggestedGasPrice}`);
  }
  return lines.join('\n');
}
