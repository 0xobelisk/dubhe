import type { AppProps } from 'next/app';
import { FC, ReactNode } from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import 'tailwindcss/tailwind.css';
import '../css/font-awesome.css';
// import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = [new PetraWallet()];
  const autoConnect = true;
  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={autoConnect}
      onError={error => {
        console.log('Custom error handling', error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WalletContextProvider>
      <Component {...pageProps} />
    </WalletContextProvider>
  );
}

export default MyApp;
