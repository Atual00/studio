
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import React from 'react'; 
import LayoutSelector from '@/components/layout-selector'; 
import { ChatWidgetProvider } from '@/context/ChatWidgetContext'; // Import ChatWidgetProvider
import { NotificationProvider } from '@/context/NotificationContext'; // Import NotificationProvider
import FloatingChatButton from '@/components/chat/FloatingChatButton'; // Import FloatingChatButton
import ChatWidget from '@/components/chat/ChatWidget'; // Import ChatWidget
import NotificationToast from '@/components/notifications/NotificationToast'; // Import NotificationToast

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
          <NotificationProvider> {/* Wrap with NotificationProvider */}
            <ChatWidgetProvider> {/* Wrap with ChatWidgetProvider */}
              <LayoutSelector>{children}</LayoutSelector>
              <FloatingChatButton /> {/* Add FloatingChatButton here */}
              <ChatWidget /> {/* Add ChatWidget here, its visibility is controlled by context */}
              <NotificationToast /> {/* Add NotificationToast for critical alerts */}
              <Toaster />
            </ChatWidgetProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
