
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchUsers } from '@/services/userService'; // Import fetchUsers

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; role: 'admin' | 'user' } | null; // Add role
  login: (username: string, password?: string) => Promise<boolean>; // Make password optional for direct login
  logout: () => void;
  isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'licitaxAuthUser';

// Remove the global MOCK_USERS definition here. We will fetch users.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string; role: 'admin' | 'user' } | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const router = useRouter();
  const pathname = usePathname();

  // Check login status on initial load
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Basic validation of stored user data
        if (parsedUser?.username && parsedUser?.role) {
           setUser(parsedUser);
        } else {
            // Invalid data, clear storage
             localStorage.removeItem(AUTH_STORAGE_KEY);
             setUser(null);
        }
      } else {
         setUser(null);
      }
    } catch (error) {
      console.error("Error reading auth status from localStorage:", error);
      localStorage.removeItem(AUTH_STORAGE_KEY); // Clear potentially corrupted data
      setUser(null);
    } finally {
        setIsLoading(false);
    }
  }, []);


   // Redirect logic based on auth state
  useEffect(() => {
      if (isLoading) return; // Don't redirect while loading

      const isPublicPage = pathname === '/login'; // Define public pages

      if (!user && !isPublicPage) {
          router.push('/login'); // Redirect to login if not authenticated and not on a public page
      } else if (user && isPublicPage) {
          router.push('/'); // Redirect to dashboard if authenticated and trying to access login page
      }

      // Add role-based redirection if needed later
      // Example: if (user && user.role !== 'admin' && pathname.startsWith('/admin')) { router.push('/'); }

  }, [user, isLoading, pathname, router]);


  const login = async (username: string, password?: string): Promise<boolean> => {
    // Simulate API call & password check (using mock passwords for demo)
    await new Promise(resolve => setTimeout(resolve, 500));

    // *** MOCK PASSWORD CHECK - Replace with real authentication ***
    // This is highly insecure and only for demonstration.
    let foundUser: { username: string; role: 'admin' | 'user' } | null = null;
    if (username === 'admin' && password === 'password') {
        foundUser = { username: 'admin', role: 'admin' };
    } else if (username === 'user' && password === 'password') {
        foundUser = { username: 'user', role: 'user' };
    } else if (username === 'joao' && password === '150306') {
        foundUser = { username: 'joao', role: 'user' }; // Assuming 'user' role for joao
    }
    // *** END MOCK PASSWORD CHECK ***

    if (foundUser) {
        const userData = { username: foundUser.username, role: foundUser.role };
        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login'); // Redirect to login on logout
  };

  const value = {
    isAuthenticated: !!user,
    user,
    login,
    logout,
    isLoading, // Provide loading state
  };

  // Render children only after loading is complete and redirection logic has potentially run
  // Or, show a loading indicator while isLoading is true
   if (isLoading && pathname !== '/login') {
     return (
         // Optional: Global loading indicator while checking auth
         <div className="flex items-center justify-center min-h-screen">
            {/* You can replace this with a proper spinner component */}
            <p>Verificando autenticação...</p>
         </div>
      );
   }

   // Do not render children on the login page if already authenticated (redirect is happening)
   if (user && pathname === '/login') {
     return null; // Or a minimal loading indicator
   }

   // Do not render children on protected pages if not authenticated (redirect is happening)
   if (!user && pathname !== '/login') {
       return null; // Or a minimal loading indicator
   }


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
