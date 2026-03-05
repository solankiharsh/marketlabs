import type { Metadata } from 'next';
import { Orbitron, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthGuard } from '@/components/AuthGuard';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MarketLabs - Market Intelligence Platform',
  description: 'Proactive market intelligence. Ranked setups, technical indicators, and trading signals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`dark ${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-void-black text-white min-h-screen font-sans">
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

