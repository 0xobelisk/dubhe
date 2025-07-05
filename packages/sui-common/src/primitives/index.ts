export enum SubscriptionKind {
  Event = 'event',
  Schema = 'schema'
}

export type SubscribableType =
  | { kind: SubscriptionKind.Event; name?: string; sender?: string }
  | { kind: SubscriptionKind.Schema; name?: string };
