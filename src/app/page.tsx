
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Assuming useAuth exists
import { Loader2 } from 'lucide-react'; // For loading indicator

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
     if (isMounted && !isLoading) {
        if (isAuthenticated) {
            router.replace('/dashboard'); // Redirect to dashboard if authenticated
        } else {
            router.replace('/login'); // Redirect to login if not authenticated
        }
     }
  }, [isAuthenticated, isLoading, router, isMounted]);

  // Optional: Show a loading indicator while checking auth state
  return (
    <div className="flex items-center justify-center min-h-screen">
       <Loader2 className="h-8 w-8 animate-spin text-primary" />
       <p className="ml-2">Carregando...</p>
    </div>
   );
}
