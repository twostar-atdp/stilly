import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { Outfit as FontDisplay } from 'next/font/google';
import './globals.css';
 
const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontDisplay = FontDisplay({
  subsets: ['latin'],
  variable: '--font-display',
});
 
export const metadata: Metadata = {
  title: 'Stilly - Daily Film Frame Challenge',
  description: 'A daily movie guessing game that tests your film knowledge.',
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}