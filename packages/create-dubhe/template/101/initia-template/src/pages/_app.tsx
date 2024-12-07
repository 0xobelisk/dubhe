import 'tailwindcss/tailwind.css';
import '../css/font-awesome.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'sonner';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Toaster />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
