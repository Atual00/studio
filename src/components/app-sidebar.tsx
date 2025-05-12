
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Gavel,
  DollarSign,
  FileText,
  KeyRound,
  CalendarDays,
  Settings,
  Briefcase,
  Flame, // Icon for Sala de Disputa
  DatabaseZap, // Icon for Consulta Legado
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const baseMenuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/licitacoes', label: 'Licitações', icon: Gavel },
  { href: '/sala-disputa', label: 'Sala de Disputa', icon: Flame },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/senhas', label: 'Senhas', icon: KeyRound },
  { href: '/calendario/metas', label: 'Calendário Metas', icon: CalendarDays },
  { href: '/calendario/disputas', label: 'Calendário Disputas', icon: CalendarDays },
  { href: '/consulta-pncp', label: 'Consulta Licitações', icon: DatabaseZap }, // Updated
];

const adminMenuItems = [
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth(); // Get user info

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    // For nested calendar routes, ensure base calendar link isn't active if a sub-route is.
    if (href === '/calendario/metas' && pathname.startsWith('/calendario/disputas')) return false;
    if (href === '/calendario/disputas' && pathname.startsWith('/calendario/metas')) return false;

    // For consulta-pncp and its sub-routes
    if (href === '/consulta-pncp' && pathname.startsWith('/consulta-pncp/')) {
        return pathname === '/consulta-pncp' || pathname.startsWith('/consulta-pncp');
    }
    if (pathname.startsWith('/consulta-pncp/') && href === '/consulta-pncp') {
        return true; // Keep main link active for sub-routes
    }


    return pathname.startsWith(href);
  };

  const menuItems = user?.role === 'admin'
    ? [...baseMenuItems, ...adminMenuItems] // Admins see all + admin items
    : baseMenuItems; // Regular users see base items


  return (
    <>
      <SidebarHeader>
        {/* Can add Logo or Title here if needed */}
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {menuItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  variant="default"
                  isActive={isActive(item.href)}
                  tooltip={item.label}
                  className={cn(
                    'justify-start',
                    isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* User info and Logout button moved to top bar in layout.tsx */}
      </SidebarFooter>
    </>
  );
}
