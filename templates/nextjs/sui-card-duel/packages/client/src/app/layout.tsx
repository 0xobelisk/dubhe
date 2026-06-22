import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import '@mysten/dapp-kit/dist/index.css';

export const metadata: Metadata = {
  title: 'Card Duel — Full-Chain PvP Card Battles',
  description:
    'A full-chain PvP card battle game (1v1 duels + multiplayer brawls) built on Sui with Dubhe'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
