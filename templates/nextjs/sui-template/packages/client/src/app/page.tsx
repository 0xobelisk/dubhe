'use client';

import { Transaction, TransactionResult } from '@0xobelisk/sui-client';
import {
  ConnectButton,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useCurrentAccount
} from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { toast } from 'sonner';
import { Value } from '@/app/state';

import { useDubhe } from '@0xobelisk/react/sui';
import ProxyCard from '@/app/components/ProxyCard';

export default function Home() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { connectionStatus } = useCurrentWallet();
  const currentAddress = useCurrentAccount()?.address;

  const [value, setValue] = useAtom(Value);
  const [ecsValue, setEcsValue] = useState(0);
  const [graphqlValue, setGraphqlValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ecsLoading, setEcsLoading] = useState(false);
  const [graphqlLoading, setGraphqlLoading] = useState(false);
  const [ecsInitialized, setEcsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<'ecs' | 'graphql'>('ecs');
  const [balance, setBalance] = useState<string>('0');

  // UserStorage state
  const [userStorageId, setUserStorageId] = useState<string | null>(null);
  const [userStorageLoading, setUserStorageLoading] = useState(false);
  const [userStorageFields, setUserStorageFields] = useState<{
    write_count: bigint;
    settled_count: bigint;
    write_bytes: bigint;
    settled_bytes: bigint;
    unsettled_count: bigint;
    unsettled_bytes: bigint;
    session_key: string;
    session_expires_at: bigint;
  } | null>(null);
  const [dappStorageFields, setDappStorageFields] = useState<{
    name: string;
    credit_pool: bigint;
    free_credit: bigint;
    suspended: boolean;
    base_fee_per_write: bigint;
    bytes_fee_per_byte: bigint;
    total_settled: bigint;
  } | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);

  // General query state
  const [availableComponents, setAvailableComponents] = useState<string[]>([]);
  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [availableGraphqlTables, setAvailableGraphqlTables] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [componentData, setComponentData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [componentTotalCount, setComponentTotalCount] = useState<number>(0);
  const [resourceTotalCount, setResourceTotalCount] = useState<number>(0);
  const [tableTotalCount, setTableTotalCount] = useState<number>(0);
  const [componentQueryLoading, setComponentQueryLoading] = useState(false);
  const [resourceQueryLoading, setResourceQueryLoading] = useState(false);
  const [tableQueryLoading, setTableQueryLoading] = useState(false);

  const {
    contract,
    graphqlClient,
    ecsWorld,
    network,
    packageId,
    dappHubId,
    dappStorageId,
    frameworkPackageId
  } = useDubhe();

  /**
   * Fetches the current balance of the connected wallet
   */
  const getBalance = async (): Promise<void> => {
    if (!currentAddress) return;
    try {
      const balance = await contract.balanceOf(currentAddress);
      console.log('balance ', balance);
      setBalance((Number(balance.totalBalance) / 1_000_000_000).toFixed(4));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  /**
   * Look up the UserStorage object ID for the current address.
   */
  const fetchUserStorageId = async (address: string) => {
    if (!address) return;
    try {
      const id = await contract.getUserStorageId(address);
      setUserStorageId(id);
      if (id) {
        await refreshStorageFields(id);
      } else {
        setUserStorageFields(null);
      }
    } catch (error) {
      console.error('Failed to query UserStorage ID:', error);
      setUserStorageId(null);
      setUserStorageFields(null);
    }
  };

  /**
   * Refresh on-chain fields for the UserStorage and DappStorage objects.
   */
  const refreshStorageFields = async (storageId: string) => {
    try {
      const [usFields, dsFields] = await Promise.all([
        contract.getUserStorageFields(storageId),
        dappStorageId ? contract.getDappStorageFields(dappStorageId) : null
      ]);
      setUserStorageFields({
        write_count: usFields.write_count,
        settled_count: usFields.settled_count,
        write_bytes: usFields.write_bytes,
        settled_bytes: usFields.settled_bytes,
        unsettled_count: usFields.unsettled_count,
        unsettled_bytes: usFields.unsettled_bytes,
        session_key: usFields.session_key,
        session_expires_at: usFields.session_expires_at
      });
      if (dsFields) {
        setDappStorageFields({
          name: dsFields.name,
          credit_pool: dsFields.credit_pool,
          free_credit: dsFields.free_credit,
          suspended: dsFields.suspended,
          base_fee_per_write: dsFields.base_fee_per_write,
          bytes_fee_per_byte: dsFields.bytes_fee_per_byte,
          total_settled: dsFields.total_settled
        });
      }
    } catch (error) {
      console.error('Failed to refresh storage fields:', error);
    }
  };

  /**
   * Register a UserStorage for the current address by building the tx
   * manually and signing via the connected wallet.
   */
  const registerUserStorage = async () => {
    const hub = dappHubId;
    const storage = dappStorageId;
    if (!hub || !storage) {
      toast.error('dappHubId or dappStorageId is not configured.');
      return;
    }
    setUserStorageLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::user_storage_init::init_user_storage`,
        arguments: [tx.object(hub), tx.object(storage)]
      });
      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            toast.success('UserStorage registered');
            // Wait briefly for indexer, then look up the new ID.
            setTimeout(async () => {
              if (currentAddress) await fetchUserStorageId(currentAddress);
            }, 1500);
          },
          onError: (err) => {
            console.error('UserStorage registration failed:', err);
            toast.error('Registration failed. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('registerUserStorage error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setUserStorageLoading(false);
    }
  };

  /**
   * Settle accumulated write debt for the current user.
   * Builds the settle_writes tx and signs via the connected wallet.
   */
  const handleSettleWrites = async () => {
    const hub = dappHubId;
    const storage = dappStorageId;
    const fwPkg = frameworkPackageId;
    if (!hub || !storage || !userStorageId || !fwPkg) {
      toast.error('Missing required IDs for settlement.');
      return;
    }
    setSettleLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${fwPkg}::dapp_system::settle_writes`,
        typeArguments: [contract.getDappKey()],
        arguments: [tx.object(hub), tx.object(storage), tx.object(userStorageId)]
      });
      await signAndExecuteTransaction(
        { transaction: tx.serialize(), chain: `sui:${network}` },
        {
          onSuccess: async () => {
            await refreshStorageFields(userStorageId);
            toast.success('Settlement successful — write debt settled.');
          },
          onError: (err) => {
            console.error('Settlement failed:', err);
            toast.error('Settlement failed. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('handleSettleWrites error:', error);
      toast.error('Settlement failed. Please try again.');
    } finally {
      setSettleLoading(false);
    }
  };

  /**
   * Discover available tables and components
   */
  const discoverAvailableTables = async () => {
    try {
      console.log('🔍 Discovering available tables and components...');

      // Get ECS components and resources
      const components = ecsWorld.getAvailableComponents();
      const resources = ecsWorld.getAvailableResources();

      console.log('📋 Available components:', components);
      console.log('📦 Available resources:', resources);

      setAvailableComponents(components);
      setAvailableResources(resources);

      // Set default selection
      if (components.length > 0 && !selectedComponent) {
        setSelectedComponent(components[0]);
      }
      if (resources.length > 0 && !selectedResource) {
        setSelectedResource(resources[0]);
      }

      // Get GraphQL table information
      const graphqlTables = Array.from(graphqlClient.getAllTableInfo().keys());
      console.log('🗃️ Available GraphQL tables:', graphqlTables);
      setAvailableGraphqlTables(graphqlTables);

      if (graphqlTables.length > 0 && !selectedTable) {
        setSelectedTable(graphqlTables[0]);
      }
    } catch (error) {
      console.error('❌ Failed to discover tables:', error);
    }
  };

  /**
   * Initialize ECS World
   */
  const initializeECS = async () => {
    try {
      console.log('🎮 Initializing ECS World...');
      setEcsInitialized(true);

      // Discover available tables and components
      await discoverAvailableTables();

      console.log('✅ ECS World initialized successfully');
    } catch (error) {
      console.error('❌ ECS World initialization failed:', error);
    }
  };

  /**
   * General ECS component query
   */
  const queryComponentData = async (componentType: string) => {
    setComponentQueryLoading(true);
    try {
      console.log(`🎮 Querying ${componentType} component data...`);

      // Get all entities with this component
      const result = await ecsWorld.queryWith(componentType, { limit: 10 });
      console.log(`📋 Entities with ${componentType}:`, result);

      const data = [];
      for (const entityId of result.entityIds) {
        const componentData = await ecsWorld.getComponent(entityId, componentType);
        if (componentData) {
          data.push({
            entityId,
            data: componentData
          });
        }
      }

      setComponentData(data);
      setComponentTotalCount(result.totalCount || 0);
      console.log(`📊 ${componentType} component data:`, data);
      console.log(`📊 ${componentType} total count:`, result.totalCount);
    } catch (error) {
      console.error(`❌ Failed to query ${componentType}:`, error);
      setComponentData([]);
      setComponentTotalCount(0);
    } finally {
      setComponentQueryLoading(false);
    }
  };

  /**
   * General ECS resource query
   */
  const queryResourceData = async (resourceType: string) => {
    setResourceQueryLoading(true);
    try {
      console.log(`📦 Querying ${resourceType} resource data...`);

      const result = await ecsWorld.getResources(resourceType, {
        limit: 10,
        orderBy: [{ field: 'createdAtTimestampMs', direction: 'DESC' }]
      });
      setResourceData(result.items || []);
      setResourceTotalCount(result.totalCount || 0);
      console.log(`📊 ${resourceType} resource data:`, result);
      console.log(`📊 ${resourceType} total count:`, result.totalCount);
    } catch (error) {
      console.error(`❌ Failed to query ${resourceType}:`, error);
      setResourceData([]);
      setResourceTotalCount(0);
    } finally {
      setResourceQueryLoading(false);
    }
  };

  /**
   * General GraphQL table query
   */
  const queryTableData = async (tableName: string) => {
    setTableQueryLoading(true);
    try {
      console.log(`🗃️ Querying ${tableName} table data...`);

      const result = await graphqlClient.getAllTables(tableName, {
        first: 10,
        orderBy: [{ field: 'createdAtTimestampMs', direction: 'DESC' }]
      });
      console.log('result', result);

      const data = result.edges.map((edge) => edge.node);
      setTableData(data);
      setTableTotalCount(result.totalCount || 0);
      console.log(`📊 ${tableName} table data:`, data);
      console.log(`📊 ${tableName} total count:`, result.totalCount);
    } catch (error) {
      console.error(`❌ Failed to query ${tableName}:`, error);
      setTableData([]);
      setTableTotalCount(0);
    } finally {
      setTableQueryLoading(false);
    }
  };

  /**
   * Query counter value using GraphQL client
   */
  const queryCounterValueWithGraphQL = async () => {
    setGraphqlLoading(true);
    try {
      console.log(`🔍 Querying counter value with GraphQL for address: ${currentAddress}`);

      // Query counter1 component (contains value field)
      const result = await graphqlClient.getTableByCondition('counter1', {
        entityId: currentAddress
      });

      if (result) {
        console.log('📊 Counter data:', result);

        const counterValue = result.value || 0;
        setGraphqlValue(counterValue);
        setValue(counterValue);
        console.log(
          `✅ GraphQL counter value set to: ${counterValue} for address: ${currentAddress}`
        );
      } else {
        console.log('📊 No counter data found, setting default value 0');
        setGraphqlValue(0);
        setValue(0);
      }
    } catch (error) {
      console.error('❌ GraphQL query failed:', error);
      setGraphqlValue(0);
      setValue(0);
    } finally {
      setGraphqlLoading(false);
    }
  };

  /**
   * Query counter value using ECS World
   */
  const queryCounterValueWithECS = async () => {
    setEcsLoading(true);
    try {
      console.log(`🎮 Querying counter value with ECS World for address: ${currentAddress}`);

      if (currentAddress) {
        console.log('🔍 Querying address:', currentAddress);
        const counterResource = (await ecsWorld.getComponent(currentAddress, 'counter1')) as any;
        console.log('📊 Counter component data:', counterResource);

        const counterValue = counterResource?.value || 0;
        setEcsValue(counterValue);
        setValue(counterValue);

        console.log(`✅ ECS counter value set to: ${counterValue} for address: ${currentAddress}`);
      } else {
        console.log('⚠️ No wallet address available, setting default value 0');
        setEcsValue(0);
        setValue(0);
      }
    } catch (error) {
      console.error('❌ ECS query failed:', error);
      setEcsValue(0);
      setValue(0);
    } finally {
      setEcsLoading(false);
    }
  };

  /**
   * Increments the counter value
   */
  const incrementCounter = async () => {
    if (connectionStatus !== 'connected') {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!userStorageId) {
      toast.error('UserStorage not found. Please register first.');
      return;
    }

    setLoading(true);
    try {
      const tx = new Transaction();
      // counter_system::inc(user_storage: &mut UserStorage, number: u32, ctx)
      (await contract.tx.counter_system.inc({
        tx,
        params: [tx.object(userStorageId), tx.pure.u32(1)],
        isRaw: true
      })) as TransactionResult;

      await signAndExecuteTransaction(
        {
          transaction: tx.serialize(),
          chain: `sui:${network}`
        },
        {
          onSuccess: async (result) => {
            setTimeout(async () => {
              toast('Transaction Successful', {
                description: new Date().toUTCString(),
                action: {
                  label: 'Check in Explorer',
                  onClick: () => window.open(contract.getTxExplorerUrl(result.digest), '_blank')
                }
              });
            }, 200);
            // Refresh storage fields so write counters stay up to date.
            await refreshStorageFields(userStorageId);
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            toast.error('Transaction failed. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('❌ Contract call failed:', error);
      toast.error('Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Subscribe to counter changes using GraphQL
   */
  const subscribeToCounterWithGraphQL = () => {
    try {
      console.log(
        `📡 Starting GraphQL subscription for counter changes for address: ${currentAddress}`
      );

      if (!currentAddress) {
        console.warn('⚠️ No wallet address available, skipping GraphQL subscription');
        return null;
      }

      const observable = graphqlClient.subscribeToTableChanges('counter1', {
        filter: {
          entityId: { equalTo: currentAddress }
        },
        onData: (data: any) => {
          console.log('📢 GraphQL received counter update:', data);
          console.log(`📢 Current wallet: ${currentAddress}`);

          const nodes = data?.listen?.query?.counter1s?.nodes;
          console.log('nodes:', nodes);
          if (nodes && Array.isArray(nodes) && nodes.length > 0) {
            // Find data matching the current wallet address
            const currentWalletCounter = nodes.find(
              (node: any) => node.entityId === currentAddress
            );

            if (currentWalletCounter) {
              console.log(`📢 Found counter data for current wallet:`, currentWalletCounter);
              if (currentWalletCounter?.value !== undefined) {
                setGraphqlValue(currentWalletCounter.value);
                setValue(currentWalletCounter.value);
                toast('GraphQL Real-time Update', {
                  description: `New value: ${
                    currentWalletCounter.value
                  } (Address: ${currentAddress.slice(0, 6)}...)`
                });
              }
            } else {
              console.log(`📋 No counter data found for current wallet: ${currentAddress}`);
              // If no data found for current wallet, might be first time or data not synced yet
              // Can choose to use latest data as fallback
              const latestCounter = nodes[0];
              if (latestCounter?.value !== undefined) {
                console.log(`📢 Using latest counter data as fallback:`, latestCounter);
                setGraphqlValue(latestCounter.value);
                setValue(latestCounter.value);
                toast('GraphQL Real-time Update', {
                  description: `New value: ${latestCounter.value}`
                });
              }
            }
          }
        },
        onError: (error: any) => {
          console.error('❌ GraphQL subscription error:', error);
        },
        onComplete: () => {
          console.log('✅ GraphQL subscription completed');
        }
      });

      // Start subscription and return Subscription object
      const subscription = observable.subscribe({});

      return subscription; // Return Subscription object with unsubscribe method
    } catch (error) {
      console.error('❌ GraphQL subscription setup failed:', error);
      return null;
    }
  };

  /**
   * Subscribe to counter changes using ECS World.
   */
  const subscribeToCounterWithECS = () => {
    try {
      console.log(
        `🎮 Starting ECS subscription for counter1 component changes for address: ${currentAddress}`
      );

      if (!currentAddress) {
        console.warn('⚠️ No wallet address available, skipping ECS subscription');
        return null;
      }

      const subscription = ecsWorld.onEntityComponent<any>('counter1', currentAddress).subscribe({
        next: (result: any) => {
          if (result) {
            console.log(
              `📢 [${new Date().toLocaleTimeString()}] counter1 changed for entity ${
                result.entityId
              }:`
            );
            console.log(`  - Change type: ${result.changeType}`);
            console.log(`  - Component data:`, result.data);

            if (result.entityId === currentAddress) {
              const componentData = result.data as any;
              if (componentData?.value !== undefined) {
                setEcsValue(componentData.value);
                setValue(componentData.value);
                toast('ECS Real-time Update', {
                  description: `New value: ${componentData.value} (Address: ${currentAddress.slice(
                    0,
                    6
                  )}...)`
                });
              }
            } else {
              console.log(`📋 Ignoring update for different entity: ${result.entityId}`);
            }
          }
        },
        error: (error: any) => {
          console.error('❌ ECS subscription failed:', error);
        },
        complete: () => {
          console.log('✅ ECS subscription completed');
        }
      });

      return subscription;
    } catch (error) {
      console.error('❌ ECS subscription setup failed:', error);
      return null;
    }
  };

  // Handle state reset when wallet address changes
  useEffect(() => {
    if (currentAddress) {
      console.log(`💰 Wallet connected/changed: ${currentAddress}`);

      // Reset all state values
      console.log('🔄 Resetting states for new wallet...');
      setValue(0);
      setEcsValue(0);
      setGraphqlValue(0);
      setUserStorageId(null);
      setUserStorageFields(null);
      setDappStorageFields(null);

      // Get balance and UserStorage
      getBalance();
      fetchUserStorageId(currentAddress);
    } else {
      console.log('💰 Wallet disconnected');

      // Clear all states
      console.log('🧹 Clearing states for disconnected wallet...');
      setValue(0);
      setEcsValue(0);
      setGraphqlValue(0);
      setBalance('0');
      setUserStorageId(null);
      setUserStorageFields(null);
      setDappStorageFields(null);
    }
  }, [currentAddress]);

  // Initialize ECS useEffect
  useEffect(() => {
    const initializeAndLoadData = async () => {
      if (!ecsInitialized) {
        await initializeECS();
      }

      // Load data
      await queryCounterValueWithECS();
      await queryCounterValueWithGraphQL();

      // Preload some general data
      if (selectedComponent) {
        await queryComponentData(selectedComponent);
      }
      if (selectedTable) {
        await queryTableData(selectedTable);
      }
    };

    initializeAndLoadData();
  }, [ecsInitialized, currentAddress, selectedComponent, selectedTable]);

  // Manage subscriptions useEffect, separated for better control
  useEffect(() => {
    if (!ecsInitialized) return;

    console.log(`🔄 Setting up subscriptions for wallet: ${currentAddress}`);

    let graphqlSubscription: any = null;
    let ecsSubscription: any = null;

    // Create subscriptions
    const setupSubscriptions = () => {
      // Create ECS subscription
      ecsSubscription = subscribeToCounterWithECS();

      // Create GraphQL subscription
      graphqlSubscription = subscribeToCounterWithGraphQL();

      console.log('✅ Subscriptions created successfully');
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      console.log(`🧹 Cleaning up subscriptions for wallet: ${currentAddress}`);

      if (ecsSubscription) {
        console.log('🧹 Unsubscribing ECS subscription');
        ecsSubscription.unsubscribe();
        ecsSubscription = null;
      }

      if (graphqlSubscription) {
        console.log('🧹 Unsubscribing GraphQL subscription');
        graphqlSubscription.unsubscribe();
        graphqlSubscription = null;
      }

      console.log('✅ Subscriptions cleaned up');
    };
  }, [ecsInitialized, currentAddress]); // Important: add walletAddress as dependency

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Dubhe Client Demo</h1>
          <p className="text-lg text-gray-600">
            Network: {network} | ECS Status:{' '}
            {ecsInitialized ? '✅ Initialized' : '⏳ Initializing...'}
          </p>
          {ecsInitialized && (
            <div className="mt-4 flex justify-center gap-4 text-sm text-gray-500">
              <span>📋 Components: {availableComponents.length}</span>
              <span>📦 Resources: {availableResources.length}</span>
              <span>🗃️ Tables: {availableGraphqlTables.length}</span>
            </div>
          )}
        </div>

        {/* Wallet Connection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 text-center">
          {connectionStatus !== 'connected' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">
                Please connect your wallet to interact with the counter
              </p>
              <ConnectButton />
            </div>
          ) : (
            <div>
              <ConnectButton />
              <div className="mt-4">
                {Number(balance) === 0 ? (
                  <div className="text-base font-medium text-red-600">
                    Balance is 0. Please acquire some {network} tokens first.
                  </div>
                ) : (
                  <div className="inline-block px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <span className="text-base font-medium text-gray-700">
                      Balance: {balance} SUI
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {connectionStatus === 'connected' && (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-t-xl shadow-lg">
              <div className="flex border-b border-gray-200">
                <button
                  className={`flex-1 py-4 px-6 text-lg font-medium text-center transition-all duration-200 ${
                    activeTab === 'ecs'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('ecs')}
                >
                  <span className="flex items-center justify-center gap-2">
                    🎮 ECS Client
                    {activeTab === 'ecs' && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        Recommended
                      </span>
                    )}
                  </span>
                </button>
                <button
                  className={`flex-1 py-4 px-6 text-lg font-medium text-center transition-all duration-200 ${
                    activeTab === 'graphql'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('graphql')}
                >
                  📊 GraphQL Client
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-xl shadow-lg p-8">
              {activeTab === 'ecs' && (
                <div className="space-y-8">
                  {/* ECS Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                      <span className="text-2xl">🎮</span>
                    </div>
                    <h2 className="text-3xl font-bold text-indigo-600 mb-4">ECS Client</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Advanced client based on Entity Component System architecture, designed for
                      game development with component-based data management and real-time
                      subscription features
                    </p>
                  </div>

                  {/* UserStorage panel */}
                  <div
                    className={`rounded-xl p-4 text-sm font-medium flex flex-col sm:flex-row items-center justify-between gap-3 ${
                      userStorageId
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}
                  >
                    <span>
                      {userStorageId ? (
                        <>
                          ✅ UserStorage:{' '}
                          <span className="font-mono text-xs">
                            {userStorageId.slice(0, 10)}...{userStorageId.slice(-6)}
                          </span>
                        </>
                      ) : (
                        '⚠️ No UserStorage found. Register to start interacting.'
                      )}
                    </span>
                    {!userStorageId && dappStorageId && (
                      <button
                        type="button"
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium whitespace-nowrap"
                        onClick={registerUserStorage}
                        disabled={userStorageLoading}
                      >
                        {userStorageLoading ? 'Registering...' : '📝 Register UserStorage'}
                      </button>
                    )}
                    {!userStorageId && !dappStorageId && (
                      <span className="text-xs text-amber-600 font-normal">
                        Set DappStorageId in deployment.ts to enable UserStorage.
                      </span>
                    )}
                  </div>

                  {/* UserStorage & DappStorage field details */}
                  {userStorageId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userStorageFields && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-indigo-700 text-sm">
                              📦 UserStorage Fields
                            </h4>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
                              onClick={() => refreshStorageFields(userStorageId)}
                            >
                              ↻ Refresh
                            </button>
                          </div>
                          <dl className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">write_count</dt>
                              <dd className="text-gray-800">
                                {userStorageFields.write_count.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">settled_count</dt>
                              <dd className="text-gray-800">
                                {userStorageFields.settled_count.toString()}
                              </dd>
                            </div>
                            <div
                              className={`flex justify-between font-semibold ${
                                userStorageFields.unsettled_count > BigInt(0)
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                              }`}
                            >
                              <dt>unsettled_count</dt>
                              <dd>{userStorageFields.unsettled_count.toString()}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">write_bytes</dt>
                              <dd className="text-gray-800">
                                {userStorageFields.write_bytes.toString()}
                              </dd>
                            </div>
                            <div
                              className={`flex justify-between font-semibold ${
                                userStorageFields.unsettled_bytes > BigInt(0)
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                              }`}
                            >
                              <dt>unsettled_bytes</dt>
                              <dd>{userStorageFields.unsettled_bytes.toString()}</dd>
                            </div>
                            {userStorageFields.session_key && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500">session_key</dt>
                                <dd className="text-gray-800 truncate max-w-[120px]">
                                  {userStorageFields.session_key.slice(0, 8)}…
                                </dd>
                              </div>
                            )}
                          </dl>
                          {userStorageFields.unsettled_count > BigInt(0) && (
                            <button
                              type="button"
                              className="mt-3 w-full px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium"
                              onClick={handleSettleWrites}
                              disabled={settleLoading}
                            >
                              {settleLoading ? 'Settling...' : '💸 Settle Writes'}
                            </button>
                          )}
                        </div>
                      )}

                      {dappStorageFields && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <h4 className="font-semibold text-purple-700 text-sm mb-3">
                            🏗️ DappStorage Fields
                          </h4>
                          <dl className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">name</dt>
                              <dd className="text-gray-800 truncate max-w-[120px]">
                                {dappStorageFields.name || '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">credit_pool</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.credit_pool.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">free_credit</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.free_credit.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">total_settled</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.total_settled.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">base_fee_per_write</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.base_fee_per_write.toString()}
                              </dd>
                            </div>
                            <div
                              className={`flex justify-between font-semibold ${
                                dappStorageFields.suspended ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              <dt>suspended</dt>
                              <dd>{dappStorageFields.suspended ? 'YES' : 'NO'}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ECS Counter Display */}
                  <div className="text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
                    <div className="text-6xl font-bold text-indigo-600 mb-4">{ecsValue}</div>
                    <p className="text-lg text-gray-600 mb-6">ECS Counter Current Value</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        type="button"
                        className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-lg"
                        onClick={() => incrementCounter()}
                        disabled={loading || Number(balance) === 0 || !userStorageId}
                      >
                        {loading ? 'Processing...' : '🚀 Increment Counter'}
                      </button>
                      <button
                        type="button"
                        className="px-6 py-3 border-2 border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 font-medium"
                        onClick={() => queryCounterValueWithECS()}
                        disabled={ecsLoading}
                      >
                        {ecsLoading ? 'Querying...' : '🔄 Refresh Data'}
                      </button>
                    </div>
                  </div>

                  {/* Component Data Query */}
                  <div className="bg-white border border-indigo-200 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-indigo-700 mb-4">
                      🎮 Component Data Query
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Component Type (Total: {availableComponents.length})
                        </label>
                        <select
                          value={selectedComponent}
                          onChange={(e) => setSelectedComponent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                        >
                          {availableComponents.map((comp) => (
                            <option key={comp} value={comp}>
                              {comp}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                          onClick={() => queryComponentData(selectedComponent)}
                          disabled={componentQueryLoading}
                        >
                          {componentQueryLoading ? 'Querying...' : 'Query Component Data'}
                        </button>
                      </div>
                    </div>

                    {componentData.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          {selectedComponent} Component Data ({componentTotalCount} total records,
                          showing latest {componentData.length})
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                          <pre className="text-xs text-gray-600">
                            {JSON.stringify(componentData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resource Data Query */}
                  {availableResources.length > 0 && (
                    <div className="bg-white border border-indigo-200 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-indigo-700 mb-4">
                        📦 Resource Data Query
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Resource Type (Total: {availableResources.length})
                          </label>
                          <select
                            value={selectedResource}
                            onChange={(e) => setSelectedResource(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                          >
                            <option value="">Please select a resource</option>
                            {availableResources.map((res) => (
                              <option key={res} value={res}>
                                {res}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            onClick={() => queryResourceData(selectedResource)}
                            disabled={resourceQueryLoading || !selectedResource}
                          >
                            {resourceQueryLoading ? 'Querying...' : 'Query Resource Data'}
                          </button>
                        </div>
                      </div>

                      {resourceData.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            {selectedResource} Resource Data ({resourceTotalCount} total records,
                            showing latest {resourceData.length})
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                            <pre className="text-xs text-gray-600">
                              {JSON.stringify(resourceData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'graphql' && (
                <div className="space-y-8">
                  {/* GraphQL Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h2 className="text-3xl font-bold text-blue-600 mb-4">GraphQL Client</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Universal client based on standard GraphQL protocol, providing flexible query
                      and subscription features for general data interaction needs
                    </p>
                  </div>

                  {/* UserStorage panel (GraphQL tab) */}
                  <div
                    className={`rounded-xl p-4 text-sm font-medium flex flex-col sm:flex-row items-center justify-between gap-3 ${
                      userStorageId
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}
                  >
                    <span>
                      {userStorageId ? (
                        <>
                          ✅ UserStorage:{' '}
                          <span className="font-mono text-xs">
                            {userStorageId.slice(0, 10)}...{userStorageId.slice(-6)}
                          </span>
                        </>
                      ) : (
                        '⚠️ No UserStorage found. Register to start interacting.'
                      )}
                    </span>
                    {!userStorageId && dappStorageId && (
                      <button
                        type="button"
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium whitespace-nowrap"
                        onClick={registerUserStorage}
                        disabled={userStorageLoading}
                      >
                        {userStorageLoading ? 'Registering...' : '📝 Register UserStorage'}
                      </button>
                    )}
                  </div>

                  {/* UserStorage & DappStorage field details (GraphQL tab) */}
                  {userStorageId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userStorageFields && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-blue-700 text-sm">
                              📦 UserStorage Fields
                            </h4>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                              onClick={() => refreshStorageFields(userStorageId)}
                            >
                              ↻ Refresh
                            </button>
                          </div>
                          <dl className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">write_count</dt>
                              <dd className="text-gray-800">
                                {userStorageFields.write_count.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">settled_count</dt>
                              <dd className="text-gray-800">
                                {userStorageFields.settled_count.toString()}
                              </dd>
                            </div>
                            <div
                              className={`flex justify-between font-semibold ${
                                userStorageFields.unsettled_count > BigInt(0)
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                              }`}
                            >
                              <dt>unsettled_count</dt>
                              <dd>{userStorageFields.unsettled_count.toString()}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">write_bytes</dt>
                              <dd className="text-gray-800">
                                {userStorageFields.write_bytes.toString()}
                              </dd>
                            </div>
                            <div
                              className={`flex justify-between font-semibold ${
                                userStorageFields.unsettled_bytes > BigInt(0)
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                              }`}
                            >
                              <dt>unsettled_bytes</dt>
                              <dd>{userStorageFields.unsettled_bytes.toString()}</dd>
                            </div>
                          </dl>
                          {userStorageFields.unsettled_count > BigInt(0) && (
                            <button
                              type="button"
                              className="mt-3 w-full px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium"
                              onClick={handleSettleWrites}
                              disabled={settleLoading}
                            >
                              {settleLoading ? 'Settling...' : '💸 Settle Writes'}
                            </button>
                          )}
                        </div>
                      )}

                      {dappStorageFields && (
                        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                          <h4 className="font-semibold text-cyan-700 text-sm mb-3">
                            🏗️ DappStorage Fields
                          </h4>
                          <dl className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">name</dt>
                              <dd className="text-gray-800 truncate max-w-[120px]">
                                {dappStorageFields.name || '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">credit_pool</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.credit_pool.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">free_credit</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.free_credit.toString()}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">total_settled</dt>
                              <dd className="text-gray-800">
                                {dappStorageFields.total_settled.toString()}
                              </dd>
                            </div>
                            <div
                              className={`flex justify-between font-semibold ${
                                dappStorageFields.suspended ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              <dt>suspended</dt>
                              <dd>{dappStorageFields.suspended ? 'YES' : 'NO'}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GraphQL Counter Display */}
                  <div className="text-center bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-8">
                    <div className="text-6xl font-bold text-blue-600 mb-4">{graphqlValue}</div>
                    <p className="text-lg text-gray-600 mb-6">GraphQL Counter Current Value</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        type="button"
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
                        onClick={() => incrementCounter()}
                        disabled={loading || Number(balance) === 0 || !userStorageId}
                      >
                        {loading ? 'Processing...' : '🚀 Increment Counter'}
                      </button>
                      <button
                        type="button"
                        className="px-6 py-3 border-2 border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 font-medium"
                        onClick={() => queryCounterValueWithGraphQL()}
                        disabled={graphqlLoading}
                      >
                        {graphqlLoading ? 'Querying...' : '🔄 Refresh Data'}
                      </button>
                    </div>
                  </div>

                  {/* Table Data Query */}
                  <div className="bg-white border border-blue-200 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-blue-700 mb-4">
                      🗃️ Table Data Query
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Table (Total: {availableGraphqlTables.length})
                        </label>
                        <select
                          value={selectedTable}
                          onChange={(e) => setSelectedTable(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        >
                          {availableGraphqlTables.map((table) => (
                            <option key={table} value={table}>
                              {table}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          onClick={() => queryTableData(selectedTable)}
                          disabled={tableQueryLoading}
                        >
                          {tableQueryLoading ? 'Querying...' : 'Query Table Data'}
                        </button>
                      </div>
                    </div>

                    {tableData.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          {selectedTable} Table Data ({tableTotalCount} total records, showing
                          latest {tableData.length})
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                          <pre className="text-xs text-gray-600">
                            {JSON.stringify(tableData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Table Field Information */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">
                        {selectedTable} Table Information
                      </h4>
                      <div className="text-xs text-blue-600">
                        <p>
                          <strong>Table Fields:</strong>{' '}
                          {graphqlClient.getTableFields(selectedTable).join(', ')}
                        </p>
                        <p>
                          <strong>Primary Key Fields:</strong>{' '}
                          {graphqlClient.getTablePrimaryKeys(selectedTable).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Footer */}
            <div className="mt-8 bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-sm text-gray-600">
                💡 After executing transactions, both clients' real-time subscriptions will
                automatically update to display the latest data
              </p>
            </div>

            {/* Proxy Demo Card */}
            <ProxyCard
              userStorageId={userStorageId}
              onSessionChanged={async () => {
                if (userStorageId) await refreshStorageFields(userStorageId);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
