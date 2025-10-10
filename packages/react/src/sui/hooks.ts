/**
 * Modern Dubhe React Hooks - Provider Pattern
 *
 * Features:
 * - 🎯 Simple API design with Provider pattern
 * - ⚡ Single client initialization with useRef
 * - 🔧 Configuration-driven setup (developers handle environment variables themselves)
 * - 🛡️ Complete type safety with strict TypeScript
 * - 📦 Context-based client sharing across components
 */
import { Dubhe } from '@0xobelisk/sui-client';

import {
  useDubheFromProvider,
  useDubheContractFromProvider,
  useDubheGraphQLFromProvider,
  useDubheECSFromProvider
} from './provider';
import type { DubheReturn } from './types';

/**
 * Primary Hook: useDubhe
 *
 * Uses Provider pattern to access shared Dubhe clients with guaranteed single initialization.
 * Must be used within a DubheProvider.
 *
 * @returns Complete Dubhe ecosystem with contract, GraphQL, ECS, and metadata
 *
 * @example
 * ```typescript
 * // App setup with Provider
 * function App() {
 *   const config = {
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     credentials: {
 *       secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
 *     }
 *   };
 *
 *   return (
 *     <DubheProvider config={config}>
 *       <MyDApp />
 *     </DubheProvider>
 *   );
 * }
 *
 * // Component usage
 * function MyDApp() {
 *   const { contract, address } = useDubhe();
 *   return <div>Connected as {address}</div>;
 * }
 * ```
 */
export function useDubhe(): DubheReturn {
  return useDubheFromProvider();
}

/**
 * Individual Instance Hook: useDubheContract
 *
 * Returns only the Dubhe contract instance from Provider context.
 * More efficient than useDubhe() when only contract access is needed.
 *
 * @returns Dubhe contract instance
 *
 * @example
 * ```typescript
 * function TransactionComponent() {
 *   const contract = useDubheContract();
 *
 *   const handleTransaction = async () => {
 *     const tx = new Transaction();
 *     await contract.tx.my_system.my_method({ tx });
 *   };
 *
 *   return <button onClick={handleTransaction}>Execute</button>;
 * }
 * ```
 */
export function useDubheContract(): Dubhe {
  return useDubheContractFromProvider();
}

/**
 * Individual Instance Hook: useDubheGraphQL
 *
 * Returns only the GraphQL client from Provider context.
 * More efficient than useDubhe() when only GraphQL access is needed.
 *
 * @returns GraphQL client instance (null if dubheMetadata not provided)
 *
 * @example
 * ```typescript
 * function DataComponent() {
 *   const graphqlClient = useDubheGraphQL();
 *
 *   useEffect(() => {
 *     if (graphqlClient) {
 *       graphqlClient.query({ ... }).then(setData);
 *     }
 *   }, [graphqlClient]);
 *
 *   return <div>{data && JSON.stringify(data)}</div>;
 * }
 * ```
 */
export function useDubheGraphQL(): any | null {
  return useDubheGraphQLFromProvider();
}

/**
 * Individual Instance Hook: useDubheECS
 *
 * Returns only the ECS World instance from Provider context.
 * More efficient than useDubhe() when only ECS access is needed.
 *
 * @returns ECS World instance (null if GraphQL client not available)
 *
 * @example
 * ```typescript
 * function ECSComponent() {
 *   const ecsWorld = useDubheECS();
 *
 *   useEffect(() => {
 *     if (ecsWorld) {
 *       ecsWorld.getComponent('MyComponent').then(setComponent);
 *     }
 *   }, [ecsWorld]);
 *
 *   return <div>ECS Component Data</div>;
 * }
 * ```
 */
export function useDubheECS(): any | null {
  return useDubheECSFromProvider();
}

/**
 * Compatibility alias for useDubhe
 */
export const useContract = useDubhe;
