
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, CornerDownLeft, Minus } from 'lucide-react'; // Added CornerDownLeft, Minus
import { useChatWidget } from '@/context/ChatWidgetContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function FloatingChatButton() {
  const { 
    isPanelOpen, 
    setIsPanelOpen, 
    isFloatingButtonMinimized, 
    setIsFloatingButtonMinimized 
  } = useChatWidget();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleButtonClick = () => {
    if (isFloatingButtonMinimized) {
      setIsFloatingButtonMinimized(false); // Restore button
      setIsPanelOpen(true); // Open panel
    } else {
      setIsPanelOpen(!isPanelOpen); // Toggle panel
    }
  };

  return (
    <Button
      variant="default"
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 rounded-full shadow-lg z-50 transition-all duration-300 ease-in-out",
        isFloatingButtonMinimized 
          ? "h-10 w-10 bg-secondary hover:bg-secondary/80" 
          : "h-14 w-14"
      )}
      onClick={handleButtonClick}
      aria-label={isFloatingButtonMinimized ? "Restore Chat Panel" : "Toggle Chat Panel"}
    >
      {isFloatingButtonMinimized ? (
        <CornerDownLeft className="h-5 w-5 text-secondary-foreground" />
      ) : (
        <MessageSquare className="h-6 w-6" />
      )}
    </Button>
  );
}
