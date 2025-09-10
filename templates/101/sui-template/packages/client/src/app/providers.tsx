'use client';

import contractMetadata from 'contracts/metadata.json';
import dubheMetadata from 'contracts/dubhe.config.json';
import { DUBHE_SCHEMA_ID, PACKAGE_ID } from 'contracts/deployment';

import { SuiMoveNormalizedModules } from '@0xobelisk/sui-client';
import { DubheProvider, DubheConfig } from '@0xobelisk/react/sui';

import { Toaster } from 'sonner';

// Mock configuration for testing - memoized to prevent re-creation
const DUBHE_CONFIG: DubheConfig = {
  network: 'localnet',
  packageId: PACKAGE_ID,
  dubheSchemaId: DUBHE_SCHEMA_ID,
  credentials: {
    secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
  },
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
      {children}
      <Toaster />
    </DubheProvider>
  );
}
