import { loadMetadata, Dubhe, Types } from '@0xobelisk/aptos-client';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { Value } from '../../jotai';
import { useRouter } from 'next/router';
import { NETWORK, PACKAGE_ID } from '../../chain/config';
import { dubheConfig } from '../../../dubhe.config';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletConnector } from '@aptos-labs/wallet-adapter-mui-design';
type data = {
  type: string;
  fields: Record<string, any>;
  hasPublicTransfer: boolean;
  dataType: 'moveObject';
};

const Home = () => {
  const router = useRouter();
  const { account, connected, network, wallet, signAndSubmitTransaction } = useWallet();
  console.log(account, connected, network, wallet);
  const [value, setValue] = useAtom(Value);

  const counter = async (wallet: any) => {
    const metadata = await loadMetadata(NETWORK, PACKAGE_ID);
    const dubhe = new Dubhe({
      networkType: NETWORK,
      packageId: PACKAGE_ID,
      metadata: metadata,
    });

    const f_payload = (await dubhe.tx.counter_system.increase(
      account?.address,
      undefined,
      undefined,
      true,
    )) as Types.EntryFunctionPayload;

    const payload: Types.TransactionPayload = {
      type: 'entry_function_payload',
      function: f_payload.function,
      type_arguments: f_payload.type_arguments,
      arguments: f_payload.arguments,
    };

    await signAndSubmitTransaction(payload);
    setTimeout(async () => {
      const component_name = Object.keys(dubheConfig.schemas)[0];
      const component_value = await dubhe.getEntity(component_name);
      setValue(component_value[0]);
    }, 1000);
  };

  useEffect(() => {
    if (router.isReady) {
      const query_counter = async () => {
        const metadata = await loadMetadata(NETWORK, PACKAGE_ID);
        const dubhe = new Dubhe({
          networkType: NETWORK,
          packageId: PACKAGE_ID,
          metadata: metadata,
        });
        // counter component name
        const component_name = Object.keys(dubheConfig.schemas)[0];
        const component_value = await dubhe.getEntity(component_name);
        setValue(component_value[0]);
      };
      query_counter();
    }
  }, [router.isReady, value]);

  useEffect(() => {
    if (!connected) return;
    console.log('connected wallet name: ', wallet?.name);
    console.log('account address: ', account?.address);
    console.log('account publicKey: ', account?.publicKey);
  }, [connected]);

  return (
    <div className="flex justify-between items-start">
      <div className="max-w-7xl mx-auto text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8 flex-6 ">
        {!connected ? (
          <WalletConnector />
        ) : (
          <>
            <div>
              <WalletConnector />
            </div>
            <div className="flex flex-col gap-6 mt-12">
              <div className="flex flex-col gap-4">
                First, fund this wallet from the APT faucet:
                <div className="flex flex-col gap-6 text-2xl text-green-600 mt-6 ">Counter: {value}</div>
                <div className="flex flex-col gap-6">
                  <button
                    type="button"
                    className="mx-auto px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      counter(wallet);
                    }}
                  >
                    Increment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
