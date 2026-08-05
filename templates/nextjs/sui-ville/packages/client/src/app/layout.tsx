import type { Metadata } from 'next';
import { Press_Start_2P } from 'next/font/google';
import './globals.css';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel'
});

export const metadata: Metadata = {
  title: 'Dubhe Ville — on-chain AI town',
  description:
    'A fully on-chain autonomous town: AI residents live, work, gossip and vote on Sui, powered by the Dubhe framework.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${pixelFont.variable} font-pixel bg-night text-cream antialiased`}>
        {children}
      </body>
    </html>
  );
}
