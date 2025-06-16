
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, CornerDownLeft, Minus, Dot } from 'lucide-react'; // Added Dot
import { useChatWidget } from '@/context/ChatWidgetContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function FloatingChatButton() {
  const { 
    isPanelOpen, 
    setIsPanelOpen, 
    isFloatingButtonMinimized, 
    setIsFloatingButtonMinimized,
    hasNewChatActivity, // Get new activity state
    setHasNewChatActivity // To clear it when panel opens
  } = useChatWidget();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleButtonClick = () => {
    if (isFloatingButtonMinimized) {
      setIsFloatingButtonMinimized(false); 
      setIsPanelOpen(true); 
      setHasNewChatActivity(false); // Clear notification when panel is opened
    } else {
      setIsPanelOpen(!isPanelOpen); 
      if (!isPanelOpen) { // If panel is being opened
          setHasNewChatActivity(false); // Clear notification
      }
    }
  };

  return (
    <Button
      variant="default"
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 rounded-full shadow-lg z-50 transition-all duration-300 ease-in-out group", // Added group for relative positioning of dot
        isFloatingButtonMinimized 
          ? "h-10 w-10 bg-secondary hover:bg-secondary/80" 
          : "h-14 w-14",
        hasNewChatActivity && !isPanelOpen && "animate-pulse" // Pulse if new activity and panel is closed
      )}
      onClick={handleButtonClick}
      aria-label={isFloatingButtonMinimized ? "Restore Chat Panel" : "Toggle Chat Panel"}
    >
      {isFloatingButtonMinimized ? (
        <CornerDownLeft className="h-5 w-5 text-secondary-foreground" />
      ) : (
        <MessageSquare className="h-6 w-6" />
      )}
      {hasNewChatActivity && !isPanelOpen && !isFloatingButtonMinimized && ( // Show dot only if not minimized and panel closed
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
        </span>
      )}
    </Button>
  );
}
