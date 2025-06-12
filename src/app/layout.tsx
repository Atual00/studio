
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import React from 'react'; 
import LayoutSelector from '@/components/layout-selector'; 
import { ChatWidgetProvider } from '@/context/ChatWidgetContext'; // Import ChatWidgetProvider
import FloatingChatButton from '@/components/chat/FloatingChatButton'; // Import FloatingChatButton
import ChatWidget from '@/components/chat/ChatWidget'; // Import ChatWidget

export const metadata: Metadata = {
  title: 'Licitax Advisor',
  description: 'Sistema de Assessoria de Licitação',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', GeistSans.variable)}>
        <AuthProvider>
          <ChatWidgetProvider> {/* Wrap with ChatWidgetProvider */}
            <LayoutSelector>{children}</LayoutSelector>
            <FloatingChatButton /> {/* Add FloatingChatButton here */}
            <ChatWidget /> {/* Add ChatWidget here, its visibility is controlled by context */}
            <Toaster />
          </ChatWidgetProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
