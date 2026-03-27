import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dubhe Debug Workbench v4',
  description: 'Realtime local debugging workbench for Dubhe Move projects'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
