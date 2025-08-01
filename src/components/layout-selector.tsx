
'use client'; // Mark this component as a Client Component

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell'; // Import NotificationBell

// Define AppLayout component here or import from its own file if preferred
function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Show loading or nothing if not authenticated and not on login page (handled by AuthProvider redirect)
  if (isLoading || !isAuthenticated) {
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
             <NotificationBell /> {/* Add NotificationBell here */}
             <span className="text-sm text-muted-foreground hidden sm:inline">
                 Olá, {user?.username} ({user?.role})
             </span>
             <Button variant="ghost" size="sm" onClick={logout} title="Sair">
                <LogOut className="h-4 w-4 sm:mr-1" />
                 <span className="hidden sm:inline">Sair</span>
            </Button>
           </div>
        </div>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}


// Updated LayoutSelector component
interface LayoutSelectorProps {
    children: React.ReactNode;
    // Removed AppLayout prop
}

export default function LayoutSelector({ children }: LayoutSelectorProps) {
    const pathname = usePathname();

    if (pathname === '/login') {
        // Render children directly for the login page (no sidebar/header)
        return <>{children}</>;
    }

    // Render the main app layout for all other pages
    // Import and render AppLayout directly
    return <AppLayout>{children}</AppLayout>;
}
