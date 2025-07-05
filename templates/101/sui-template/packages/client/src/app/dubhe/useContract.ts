import { NETWORK, PACKAGE_ID } from 'contracts/deployment';
import dubheMetadata from 'contracts/dubhe.config.json';
import metadata from 'contracts/metadata.json';
import { Dubhe, SuiMoveNormalizedModules } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld } from '@0xobelisk/ecs';
import { useMemo } from 'react';
import dotenv from 'dotenv';

dotenv.config();

export function useContract() {
  // Cache Dubhe contract instance
  const contract = useMemo(() => {
    console.log('🔧 Creating Dubhe contract instance...');
    return new Dubhe({
      networkType: NETWORK,
      packageId: PACKAGE_ID,
      metadata: metadata as SuiMoveNormalizedModules,
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    });
  }, []);

  // Cache GraphQL client instance
  const graphqlClient = useMemo(() => {
    console.log('🔧 Creating GraphQL client...');
    return createDubheGraphqlClient({
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      subscriptionEndpoint:
        process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql',
      dubheMetadata
    });
  }, []);

  // Cache ECS World instance
  const ecsWorld = useMemo(() => {
    console.log('🔧 Creating ECS World...');
    return createECSWorld(graphqlClient, {
      queryConfig: {
        enableBatchOptimization: true, // Enable batch query optimization
        defaultCacheTimeout: 5000 // 5 second cache timeout
      },
      subscriptionConfig: {
        defaultDebounceMs: 100, // 100ms debounce
        reconnectOnError: true // Auto-reconnect on error
      }
    });
  }, [graphqlClient]);

  // Cache address (avoid recalculating each time)
  const address = useMemo(() => {
    return contract.getAddress();
  }, [contract]);

  return useMemo(
    () => ({
      contract,
      graphqlClient,
      ecsWorld,
      metadata,
      network: NETWORK,
      packageId: PACKAGE_ID,
      address
    }),
    [contract, graphqlClient, ecsWorld, address]
  );
}
