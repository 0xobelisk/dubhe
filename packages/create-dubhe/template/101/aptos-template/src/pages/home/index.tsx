import { loadMetadata, Dubhe, PendingTransactionResponse } from '@0xobelisk/aptos-client';
import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { Value } from '../../jotai';
import { useRouter } from 'next/router';
import { NETWORK, PACKAGE_ID } from '../../chain/config';
import { dubheConfig } from '../../../dubhe.config';
import { PRIVATEKEY } from '../../chain/key';
import { toast } from 'sonner';

const Home = () => {
  const router = useRouter();
  const [value, setValue] = useAtom(Value);
  const [loading, setLoading] = useState(false);

  const query_counter_value = async () => {
    const metadata = await loadMetadata(NETWORK, PACKAGE_ID);
    const dubhe = new Dubhe({
      networkType: NETWORK,
      packageId: PACKAGE_ID,
      metadata: metadata,
    });

    let query_value = await dubhe.query.counter_schema.get();
    console.log(query_value);
    if (query_value) {
      console.log(query_value);
      setValue(query_value[0].toString());
    }
  };

  const counter = async () => {
    setLoading(true);
    try {
      const metadata = await loadMetadata(NETWORK, PACKAGE_ID);
      const dubhe = new Dubhe({
        networkType: NETWORK,
        packageId: PACKAGE_ID,
        metadata: metadata,
        secretKey: PRIVATEKEY,
      });

      const response = (await dubhe.tx.counter_system.increase()) as PendingTransactionResponse;
      await dubhe.waitForTransaction(response.hash);
      if (response) {
        setTimeout(async () => {
          await query_counter_value();
          toast('Transfer Successful', {
            description: new Date().toUTCString(),
            action: {
              label: 'Check in Explorer',
              onClick: () =>
                window.open(`https://explorer.aptoslabs.com/txn/${response.hash}?network=${NETWORK}`, '_blank'),
            },
          });
          setLoading(false);
        }, 200);
      }
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
      setLoading(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (router.isReady) {
      query_counter_value();
    }
  }, [router.isReady]);
  return (
    <div className="max-w-7xl mx-auto text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8 flex-6">
      <div className="flex flex-col gap-6 mt-12">
        <div className="flex flex-col gap-4">
          You account already have some aptos gas from {NETWORK}
          <div className="flex flex-col gap-6 text-2xl text-green-600 mt-6 ">Counter: {value}</div>
          <div className="flex flex-col gap-6">
            <button
              type="button"
              className="mx-auto px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              onClick={() => counter()}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Increment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
