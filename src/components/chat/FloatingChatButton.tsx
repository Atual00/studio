
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, CornerDownLeft, Minus } from 'lucide-react';
import { useChatWidget } from '@/context/ChatWidgetContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function FloatingChatButton() {
  const {
    isPanelOpen,
    setIsPanelOpen,
    isFloatingButtonMinimized,
    setIsFloatingButtonMinimized,
    unreadRoomIds,
    removeUnreadRoom,
    selectedUserForWidget,
  } = useChatWidget();
  const { isAuthenticated, user: currentUser } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const unreadCount = unreadRoomIds.size;

  const handleButtonClick = () => {
    if (isFloatingButtonMinimized) {
      setIsFloatingButtonMinimized(false);
      setIsPanelOpen(true);
      if (selectedUserForWidget && currentUser) {
          const roomId = `chat_room_${[currentUser.id, selectedUserForWidget.id].sort().join('_')}`;
          removeUnreadRoom(roomId);
      }
    } else {
      setIsPanelOpen(!isPanelOpen);
      if (!isPanelOpen && selectedUserForWidget && currentUser) {
          const roomId = `chat_room_${[currentUser.id, selectedUserForWidget.id].sort().join('_')}`;
          removeUnreadRoom(roomId);
      }
    }
  };

  return (
    <Button
      variant="default"
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 rounded-full shadow-lg transition-all duration-300 ease-in-out group relative z-50 left-auto", // Ensure z-50 and left-auto are present
        isFloatingButtonMinimized
          ? "h-10 w-10 bg-secondary hover:bg-secondary/80"
          : "h-14 w-14",
        unreadCount > 0 && !isPanelOpen && "animate-pulse"
      )}
      onClick={handleButtonClick}
      aria-label={isFloatingButtonMinimized ? "Restore Chat Panel" : "Toggle Chat Panel"}
    >
      {isFloatingButtonMinimized ? (
        <CornerDownLeft className="h-5 w-5 text-secondary-foreground" />
      ) : (
        <MessageSquare className="h-6 w-6" />
      )}
      {unreadCount > 0 && !isPanelOpen && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}

    