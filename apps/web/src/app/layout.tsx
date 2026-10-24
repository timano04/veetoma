import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veetoma | AI Music Stem Studio',
  description: 'Isolate Vocals, Drums, Bass, and Instruments from any track using state-of-the-art AI separation.',
};

import { StudioProvider } from '@/context/studio-context';
import { AppLayout } from '@/components/app-layout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <StudioProvider>
          <AppLayout>{children}</AppLayout>
        </StudioProvider>
      </body>
    </html>
  );
}
