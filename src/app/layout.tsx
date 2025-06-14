
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/app-header';
import { TemplateProvider } from '@/contexts/TemplateContext';
import { ProjectProvider } from '@/contexts/ProjectContext'; // Import ProjectProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CardForge',
  description: 'Create and manage your card game projects with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TemplateProvider>
          <ProjectProvider> {/* Wrap with ProjectProvider */}
            <div className="flex flex-col min-h-screen">
              <AppHeader />
              <main className="flex-grow">
                {children}
              </main>
              <Toaster />
            </div>
          </ProjectProvider>
        </TemplateProvider>
      </body>
    </html>
  );
}
