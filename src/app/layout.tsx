
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import AppSidebar from '@/components/app-sidebar';
import { AuthProvider, useAuth } from '@/context/AuthContext'; // Import AuthProvider and useAuth
import { Button } from '@/components/ui/button'; // Import Button for SidebarTrigger
import { LogOut } from 'lucide-react'; // Import LogOut icon
// Removed usePathname import from here
import React from 'react'; // Ensure React is imported
import LayoutSelector from '@/components/layout-selector'; // Import LayoutSelector

export const metadata: Metadata = {
  title: 'Licitax Advisor',
  description: 'Sistema de Assessoria de Licitação',
};

// Inner component to access auth context
function AppLayout({ children }: { children: React.ReactNode }) {
  'use client'; // <-- Marked as client component
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Show loading or nothing if not authenticated and not on login page (handled by AuthProvider redirect)
  if (isLoading || !isAuthenticated) {
    // You might want a global loading spinner here instead of blank
     // or rely on the AuthProvider's loading indicator
     return null; // AuthProvider handles redirects
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <div className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center">
             <SidebarTrigger className="md:hidden mr-4" /> {/* Only show trigger on mobile */}
             <h1 className="text-xl font-semibold">Licitax Advisor</h1>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm text-muted-foreground hidden sm:inline">
                 Olá, {user?.username} ({user?.role})
             </span>
             <Button variant="ghost" size="sm" onClick={logout} title="Sair">
                <LogOut className="h-4 w-4 sm:mr-1" />
                 <span className="hidden sm:inline">Sair</span>
            </Button>
           </div>
          {/* Add User Menu / Notifications here later */}
        </div>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}


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
           <LayoutSelector AppLayout={AppLayout}>{children}</LayoutSelector> {/* Pass AppLayout */}
           <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

// Component to select layout based on route moved to its own file
// function LayoutSelector({ children }: { children: React.ReactNode }) { ... }

