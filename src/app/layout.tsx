import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/query-provider';
import { AuthProvider } from '@/context/auth-context';
import { VerticalProvider } from '@/context/vertical-context';
import { CrmDataProvider } from '@/context/crm-data-context';
import { ProjectProvider } from '@/context/project-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Multi-Vertical Company CRM',
  description: 'Production-quality internal CRM with multi-vertical data isolation and pipeline management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <AuthProvider>
              <VerticalProvider>
                <CrmDataProvider>
                  <ProjectProvider>
                    {children}
                  </ProjectProvider>
                </CrmDataProvider>
              </VerticalProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
