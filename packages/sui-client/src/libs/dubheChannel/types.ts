export type SubscribeTableParams = {
  dapp_key: string;
  account?: string;
  table?: string;
  key?: any[];
};

export type GetTableParams = {
  dapp_key: string;
  account: string;
  table: string;
  key: any[];
};

export type SubmitTransactionParams = {
  chain: string;
  sender: string;
  nonce: number;
  ptb: any; // TODO: add type
  signature: string;
};

export type GetNonceParams = {
  sender: string;
};

export type GetNonceResponse = {
  nonce: number;
};

export type TableEventData = {
  dapp_key: string;
  account: string;
  table: string;
  key: any[];
  value: any;
  timestamp?: number;
};

// Server response format from SSE
export type ServerEventData = {
  data_key: {
    dapp_key: string;
    account: string;
    table: string;
    key: any[];
  };
  value: any;
};

export type SubscriptionOptions = {
  onMessage?: (data: TableEventData) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export type DubheChannelConfig = {
  baseUrl: string;
  timeout?: number;
};
