
'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Gavel,
  DollarSign,
  FileText,
  KeyRound,
  CalendarDays,
  Settings, // Added Settings icon
  Briefcase,
} from 'lucide-react';

import {cn} from '@/lib/utils';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';

const menuItems = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/clientes', label: 'Clientes', icon: Users},
  {href: '/licitacoes', label: 'Licitações', icon: Gavel},
  {href: '/financeiro', label: 'Financeiro', icon: DollarSign},
  {href: '/documentos', label: 'Documentos', icon: FileText},
  {href: '/senhas', label: 'Senhas', icon: KeyRound},
  {href: '/calendario/metas', label: 'Calendário Metas', icon: CalendarDays},
  {href: '/calendario/disputas', label: 'Calendário Disputas', icon: CalendarDays},
  {href: '/configuracoes', label: 'Configurações', icon: Settings}, // Added Settings item
  // { href: '/crm', label: 'CRM', icon: Briefcase }, // Placeholder for CRM
];

export default function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    // Check if the current pathname starts with the link's href,
    // but only if the href is longer than just "/"
    return pathname.startsWith(href);
  };

  return (
    <>
      <SidebarHeader>
        {/* Can add Logo or Title here if needed */}
        {/* <h2 className="text-lg font-semibold text-sidebar-foreground">Licitax</h2> */}
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
        {/* Add User profile / Logout button here */}
        {/* Example:
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button> */}
      </SidebarFooter>
    </>
  );
}

