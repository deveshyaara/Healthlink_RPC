import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import Chatbot from '@/components/Chatbot';

export const metadata: Metadata = {
  title: 'HealthLink Pro - Digital Health Data Exchange',
  description: 'A secure, patient-controlled health data exchange platform. Government of India Initiative.',
  keywords: 'health data, medical records, HIPAA, digital health, India',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider storageKey="healthlink-pro-theme">
          <AuthProvider>
            {/* Main Content with skip target */}
            <main id="main-content" className="min-h-screen">
              {children}
            </main>

            <Chatbot />
            <Toaster />
            <SonnerToaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
