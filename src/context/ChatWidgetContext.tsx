
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { User as AppUser } from '@/services/userService';

interface ChatWidgetContextType {
  isPanelOpen: boolean;
  setIsPanelOpen: (isOpen: boolean) => void;
  selectedUserForWidget: AppUser | null;
  setSelectedUserForWidget: (user: AppUser | null) => void;
  isFloatingButtonMinimized: boolean; 
  setIsFloatingButtonMinimized: (minimized: boolean) => void; 
  hasNewChatActivity: boolean; // For general new activity visual cue
  setHasNewChatActivity: (hasActivity: boolean) => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextType | undefined>(undefined);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedUserForWidget, setSelectedUserForWidget] = useState<AppUser | null>(null);
  const [isFloatingButtonMinimized, setIsFloatingButtonMinimized] = useState(false);
  const [hasNewChatActivity, setHasNewChatActivity] = useState(false);

  // Listen for localStorage changes to update chat activity
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('licitaxChatMessages_') && event.newValue) {
        // A chat message was added or updated in some room
        // Check if the panel for this specific room is NOT currently open
        // For simplicity, we'll just set a general flag.
        // More advanced: check if event.key corresponds to a room *not* currently viewed by selectedUserForWidget
        const activeRoomId = selectedUserForWidget && (window as any).currentUserForChatWidgetContext // Quick way to get current user for room ID; improve this
          ? `chat_room_${[selectedUserForWidget.id, (window as any).currentUserForChatWidgetContext.id].sort().join('_')}`
          : null;
        
        const changedRoomKey = event.key.substring('licitaxChatMessages_'.length);

        if (!isPanelOpen || (isPanelOpen && activeRoomId !== changedRoomKey)) {
            setHasNewChatActivity(true);
        }
      }
    };
  
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isPanelOpen, selectedUserForWidget]); // Re-run if panel or selected user changes to correctly assess active room


  const value = {
    isPanelOpen,
    setIsPanelOpen: (isOpen: boolean) => {
        setIsPanelOpen(isOpen);
        if(isOpen) setHasNewChatActivity(false); // Clear general notification when panel is opened
    },
    selectedUserForWidget,
    setSelectedUserForWidget,
    isFloatingButtonMinimized,
    setIsFloatingButtonMinimized,
    hasNewChatActivity,
    setHasNewChatActivity,
  };

  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>;
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext);
  if (context === undefined) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider');
  }
  return context;
}
