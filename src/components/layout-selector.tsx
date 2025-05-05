
'use client'; // Mark this component as a Client Component

import React from 'react';
import { usePathname } from 'next/navigation';

// Receive AppLayout as a prop
interface LayoutSelectorProps {
    children: React.ReactNode;
    AppLayout: React.ComponentType<{ children: React.ReactNode }>;
}

export default function LayoutSelector({ children, AppLayout }: LayoutSelectorProps) {
    const pathname = usePathname();

    if (pathname === '/login') {
        // Render children directly for the login page (no sidebar/header)
        return <>{children}</>;
    }

    // Render the main app layout for all other pages
    return <AppLayout>{children}</AppLayout>;
}
