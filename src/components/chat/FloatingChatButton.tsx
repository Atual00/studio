
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useChatWidget } from '@/context/ChatWidgetContext';
import { useAuth } from '@/context/AuthContext';

export default function FloatingChatButton() {
  const { setIsPanelOpen, isPanelOpen } = useChatWidget();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      variant="default"
      size="icon"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
      onClick={() => setIsPanelOpen(!isPanelOpen)}
      aria-label="Toggle Chat Panel"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
}
