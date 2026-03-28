import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'Dubhe Session Flow Web',
  description: 'End-to-end session registration and delegate execution flow tester.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  );
}
