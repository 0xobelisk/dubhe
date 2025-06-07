import type { ReactNode } from 'react';
import type { AppProps } from 'next/app';
import '../css/globals.css';

type NextraAppProps = AppProps & {
	Component: AppProps['Component'] & {
		getLayout: (page: ReactNode) => ReactNode;
	};
};
export default function Nextra({ Component, pageProps }: NextraAppProps) {
	return <Component {...pageProps} />;
}
