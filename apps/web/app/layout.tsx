import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    template: '%s | DreamTask',
    default: 'DreamTask - แพลตฟอร์มจัดการงาน ทีม และโปรเจกต์',
  },
  description: 'แพลตฟอร์มจัดการงาน (Task Management Platform) ที่ช่วยให้ทีมของคุณทำงานร่วมกันได้อย่างไร้รอยต่อ พร้อมระบบ Kanban และ Real-time WebSocket',
  keywords: ['Task Management', 'Kanban', 'DreamTask', 'Team Collaboration', 'Real-time'],
  openGraph: {
    title: 'DreamTask - จัดการงานไร้ขีดจำกัด',
    description: 'แพลตฟอร์มจัดการงานที่รวมทุกอย่างที่คุณต้องการไว้ในที่เดียว พร้อมระบบ Kanban Board แบบ Real-time',
    url: 'https://dreamtask.app',
    siteName: 'DreamTask',
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DreamTask',
    description: 'แพลตฟอร์มจัดการงานที่รวมทุกอย่างที่คุณต้องการไว้ในที่เดียว',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader color="#2299dd" showSpinner={false} />
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
