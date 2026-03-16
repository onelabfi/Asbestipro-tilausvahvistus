import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tilausvahvistus | Suomen Asbestipro Oy',
  description: 'Asbesti- ja haitta-ainekartoitus tilausvahvistus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <body className="min-h-screen" style={{ backgroundColor: '#101921' }}>{children}</body>
    </html>
  );
}
