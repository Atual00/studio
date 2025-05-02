import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans';
// Removed GeistMono import as it's not found and not explicitly used
import './globals.css';
import {cn} from '@/lib/utils';
import {SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarInset} from '@/components/ui/sidebar';
import {Toaster} from '@/components/ui/toaster';
import AppSidebar from '@/components/app-sidebar'; // Assuming sidebar content will be in this component

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
        <SidebarProvider>
          <Sidebar>
            <AppSidebar />
          </Sidebar>
          <SidebarInset>
            <div className="flex h-14 items-center border-b bg-card px-4 lg:px-6">
              <SidebarTrigger className="md:hidden" /> {/* Only show trigger on mobile */}
              <h1 className="text-xl font-semibold ml-4 md:ml-0">Licitax Advisor</h1>
              {/* Add User Menu / Notifications here later */}
            </div>
            <main className="flex-1 p-4 lg:p-6">{children}</main>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
      </body>
    </html>
  );
}
