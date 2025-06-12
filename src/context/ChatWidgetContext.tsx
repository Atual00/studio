
'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { User as AppUser } from '@/services/userService';

interface ChatWidgetContextType {
  isPanelOpen: boolean;
  setIsPanelOpen: (isOpen: boolean) => void;
  selectedUserForWidget: AppUser | null;
  setSelectedUserForWidget: (user: AppUser | null) => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextType | undefined>(undefined);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedUserForWidget, setSelectedUserForWidget] = useState<AppUser | null>(null);

  const value = {
    isPanelOpen,
    setIsPanelOpen,
    selectedUserForWidget,
    setSelectedUserForWidget,
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
