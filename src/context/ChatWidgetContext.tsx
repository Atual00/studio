
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import type { User as AppUser } from '@/services/userService';
import { useAuth } from './AuthContext'; // Import useAuth to get currentUser

interface ChatWidgetContextType {
  isPanelOpen: boolean;
  setIsPanelOpen: (isOpen: boolean) => void;
  selectedUserForWidget: AppUser | null;
  setSelectedUserForWidget: (user: AppUser | null) => void;
  isFloatingButtonMinimized: boolean;
  setIsFloatingButtonMinimized: (minimized: boolean) => void;
  unreadRoomIds: Set<string>;
  addUnreadRoom: (roomId: string) => void;
  removeUnreadRoom: (roomId: string) => void;
  clearAllUnreadRooms: () => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextType | undefined>(undefined);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedUserForWidget, setSelectedUserForWidgetInternal] = useState<AppUser | null>(null);
  const [isFloatingButtonMinimized, setIsFloatingButtonMinimized] = useState(false);
  const [unreadRoomIds, setUnreadRoomIds] = useState<Set<string>>(new Set());
  const { user: currentUser } = useAuth(); // Get the current authenticated user

  const addUnreadRoom = useCallback((roomId: string) => {
    setUnreadRoomIds(prev => {
      const newSet = new Set(prev);
      newSet.add(roomId);
      return newSet;
    });
  }, []);

  const removeUnreadRoom = useCallback((roomId: string) => {
    setUnreadRoomIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(roomId);
      return newSet;
    });
  }, []);

  const clearAllUnreadRooms = useCallback(() => {
    setUnreadRoomIds(new Set());
  }, []);
  
  const setSelectedUserForWidget = (user: AppUser | null) => {
    setSelectedUserForWidgetInternal(user);
    if (user && currentUser) { // If a user is selected for chat
        const roomId = `chat_room_${[currentUser.id, user.id].sort().join('_')}`;
        removeUnreadRoom(roomId); // Mark this room as read
    }
  };


  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (currentUser && event.key && event.key.startsWith('licitaxChatMessages_') && event.newValue) {
        const changedRoomId = event.key.substring('licitaxChatMessages_'.length);
        
        // Try to parse the messages to find the last sender
        try {
            const messages: {senderId: string}[] = JSON.parse(event.newValue);
            if (messages.length > 0) {
                const lastMessage = messages[messages.length -1];
                // Only mark as unread if the last message is NOT from the current user
                if (lastMessage.senderId === currentUser.id) {
                    return; 
                }
            }
        } catch (e) {
            console.error("Error parsing messages for notification check:", e);
        }


        let isActiveChatInWidget = false;
        if (isPanelOpen && selectedUserForWidget) {
          const activeWidgetRoomId = `chat_room_${[currentUser.id, selectedUserForWidget.id].sort().join('_')}`;
          if (activeWidgetRoomId === changedRoomId) {
            isActiveChatInWidget = true;
          }
        }
        
        // Also consider if the main /chat page is open and viewing this room (more complex to check here directly)
        // For simplicity, we'll primarily rely on the widget's state.
        // A more robust solution would involve checking the current browser path if main chat page is active.

        if (!isActiveChatInWidget) {
          addUnreadRoom(changedRoomId);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isPanelOpen, selectedUserForWidget, currentUser, addUnreadRoom]);


  const value = {
    isPanelOpen,
    setIsPanelOpen: (isOpen: boolean) => {
        setIsPanelOpen(isOpen);
        if (isOpen && selectedUserForWidget && currentUser) { // If panel is opened to a specific chat
             const roomId = `chat_room_${[currentUser.id, selectedUserForWidget.id].sort().join('_')}`;
             removeUnreadRoom(roomId);
        } else if (isOpen && !selectedUserForWidget) {
            // If panel is opened to the user list, no specific room is "read" yet
        }
    },
    selectedUserForWidget,
    setSelectedUserForWidget, // Use the wrapped setter
    isFloatingButtonMinimized,
    setIsFloatingButtonMinimized,
    unreadRoomIds,
    addUnreadRoom,
    removeUnreadRoom,
    clearAllUnreadRooms,
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
