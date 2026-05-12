'use client';

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@0xobelisk/sui-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { SuiMoveNormalizedModules } from '@0xobelisk/sui-client';
import { DubheProvider } from '@0xobelisk/react/sui';
import type { DubheConfig } from '@0xobelisk/react/sui';
import { Toaster } from 'sonner';

import contractMetadata from 'contracts/metadata.json';
import dubheMetadata from 'contracts/dubhe.config.json';
import {
  DappHubId,
  DappStorageId,
  PackageId,
  DappKey,
  Network,
  FrameworkPackageId
} from 'contracts/deployment';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

const { networkConfig } = createNetworkConfig({
  localnet: { url: Network === 'localnet' && rpcUrl ? rpcUrl : getFullnodeUrl('localnet') },
  devnet: { url: Network === 'devnet' && rpcUrl ? rpcUrl : getFullnodeUrl('devnet') },
  testnet: { url: Network === 'testnet' && rpcUrl ? rpcUrl : getFullnodeUrl('testnet') },
  mainnet: { url: Network === 'mainnet' && rpcUrl ? rpcUrl : getFullnodeUrl('mainnet') }
});

const DUBHE_CONFIG: DubheConfig = {
  network: Network,
  packageId: PackageId,
  dappKey: DappKey,
  dappHubId: DappHubId,
  dappStorageId: DappStorageId,
  frameworkPackageId: FrameworkPackageId,
  metadata: contractMetadata as unknown as SuiMoveNormalizedModules,
  dubheMetadata,
  endpoints: {
    ...(rpcUrl ? { fullnodeUrls: [rpcUrl] } : {}),
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
  // Create QueryClient inside useState to ensure a single instance per client
  // and avoid sharing state across requests in SSR.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <DubheProvider config={DUBHE_CONFIG}>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork={Network}>
          {/* autoConnect=false prevents SSR wallet-channel noise */}
          <WalletProvider autoConnect={false}>
            {children}
            <Toaster position="bottom-right" richColors />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </DubheProvider>
  );
}
