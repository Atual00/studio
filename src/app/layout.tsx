
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import React from 'react'; // Ensure React is imported
import LayoutSelector from '@/components/layout-selector'; // Import LayoutSelector

export const metadata: Metadata = {
  title: 'Licitax Advisor',
  description: 'Sistema de Assessoria de Licitação',
};

// AppLayout component is defined in layout-selector.tsx now

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', GeistSans.variable)}>
        <AuthProvider>
          {/* Conditionally render layout based on route */}
           <LayoutSelector>{children}</LayoutSelector> {/* Remove AppLayout prop */}
           <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
