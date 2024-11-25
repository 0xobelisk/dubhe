import { loadMetadata, Dubhe, Transaction } from '@0xobelisk/rooch-client';
import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { Value } from '../../jotai';
import { useRouter } from 'next/router';
import { NETWORK, PACKAGE_ID } from '../../chain/config';
import { PRIVATEKEY } from '../../chain/key';

const Home = () => {
  const router = useRouter();
  const [value, setValue] = useAtom(Value);
  const [loading, setLoading] = useState(false);

  const query_counter_value = async () => {
    const metadata = await loadMetadata(NETWORK, PACKAGE_ID, ['counter']);
    const dubhe = new Dubhe({
      networkType: NETWORK,
      packageId: PACKAGE_ID,
      metadata: metadata,
    });
    const query_value = await dubhe.query.counter.value();

    if (query_value.return_values) {
      console.log(query_value.return_values[0].decoded_value);
      setValue(query_value.return_values[0].decoded_value.toString());
    }
  };

  const counter = async () => {
    setLoading(true);
    try {
      const metadata = await loadMetadata(NETWORK, PACKAGE_ID, ['counter']);
      const dubhe = new Dubhe({
        networkType: NETWORK,
        packageId: PACKAGE_ID,
        metadata: metadata,
        secretKey: PRIVATEKEY,
      });

      const tx = new Transaction();
      const response = await dubhe.tx.counter.increase(tx);
      console.log(response.execution_info.tx_hash, response.execution_info.status.type);
      if (response.execution_info.status.type == 'executed') {
        setTimeout(async () => {
          await query_counter_value();
          setLoading(false);
        }, 200);
      }
    } catch (error) {
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
          You account already have some rooch gas from {NETWORK}
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
