'use client';

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@0xobelisk/sui-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import contractMetadata from 'contracts/metadata.json';
import dubheMetadata from 'contracts/dubhe.config.json';
import { DUBHE_SCHEMA_ID, PACKAGE_ID, NETWORK } from 'contracts/deployment';

import { SuiMoveNormalizedModules } from '@0xobelisk/sui-client';
import { DubheProvider, DubheConfig } from '@0xobelisk/react/sui';

import { Toaster } from 'sonner';

const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') }
});

const queryClient = new QueryClient();

const DUBHE_CONFIG: DubheConfig = {
  network: NETWORK,
  packageId: PACKAGE_ID,
  dubheSchemaId: DUBHE_SCHEMA_ID,
  metadata: contractMetadata as SuiMoveNormalizedModules,
  dubheMetadata,
  endpoints: {
    graphql: 'http://localhost:4000/graphql',
    websocket: 'ws://localhost:4000/graphql'
  },
  options: {
    enableBatchOptimization: true,
    cacheTimeout: 3000,
    debounceMs: 100,
    reconnectOnError: true
  }
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DubheProvider config={DUBHE_CONFIG}>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork={NETWORK}>
          <WalletProvider>
            {children}
            <Toaster />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </DubheProvider>
  );
}
