import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { GameAudioProvider } from '@/components/GameAudioProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AstroColony: Mission Survival | NASA Space Apps',
  description:
    'Construye tu base. Protege a tu tripulación. Sobrevive en otro mundo. Videojuego educativo sobre decisiones reales de ingeniería espacial.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#070B19] text-slate-100">
        <GameAudioProvider>{children}</GameAudioProvider>
      </body>
    </html>
  );
}
