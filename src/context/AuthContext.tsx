
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchUsers, type User as AppUser } from '@/services/userService'; // Import fetchUsers and User type

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null; // Use AppUser type from userService
  login: (username: string, password?: string) => Promise<boolean>; // Make password optional for direct login
  logout: () => void;
  isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'licitaxAuthUser';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null); // Use AppUser type
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const router = useRouter();
  const pathname = usePathname();

  // Check login status on initial load
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        const parsedUser: AppUser = JSON.parse(storedUser);
        // Basic validation of stored user data (ensure required fields exist)
        if (parsedUser?.id && parsedUser?.username && parsedUser?.role) {
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
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const users = await fetchUsers(); // Fetch users from storage/service
        const lowerCaseUsername = username.toLowerCase();

        // Find the user by username (case-insensitive)
        const foundUser = users.find(u => u.username.toLowerCase() === lowerCaseUsername);

        // *** SIMPLIFIED PASSWORD CHECK FOR PROTOTYPE ***
        // In a real app, you would compare the provided password with a stored hash.
        // For this prototype, we'll assume the password is correct if the user exists.
        // We'll specifically check the hardcoded password for 'joao' as requested.
        let passwordMatches = !!foundUser; // Assume true if user found

        if (foundUser && foundUser.username.toLowerCase() === 'joao' && password !== '305533') {
             passwordMatches = false; // Specific check for Joao's password
        }
        // You might add similar specific checks for 'admin' or 'user' if needed,
        // or remove this logic entirely if any existing username should log in without password check.

        if (foundUser && passwordMatches) {
            // Use the complete user data fetched from the service
            setUser(foundUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
            return true;
        }

    } catch (error) {
        console.error("Error during user fetch or login validation:", error);
        return false; // Indicate login failure on error
    }

    // If user not found or password doesn't match (in real app)
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
