
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle, Users, ArrowLeft, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { fetchMessages, sendMessage, formatMessageTimestamp, type ChatMessage } from '@/services/chatService';
import { fetchUsers, type User as AppUser } from '@/services/userService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useChatWidget } from '@/context/ChatWidgetContext';
import { Separator } from '../ui/separator';

const generateRoomId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `chatwidget_${ids[0]}_${ids[1]}`; // Use a different prefix if needed
};

export default function ChatWidget() {
  const { user: currentUser } = useAuth();
  const { isPanelOpen, setIsPanelOpen, selectedUserForWidget, setSelectedUserForWidget } = useChatWidget();

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isPanelOpen && currentUser) {
      setIsLoadingUsers(true);
      fetchUsers()
        .then(fetchedUsers => {
          setAllUsers(fetchedUsers.filter(u => u.id !== currentUser.id));
        })
        .catch(err => {
          console.error("Error fetching users for widget:", err);
          setError("Falha ao carregar usuários.");
        })
        .finally(() => setIsLoadingUsers(false));
    } else {
      setAllUsers([]); // Clear users if panel is closed or no current user
    }
  }, [isPanelOpen, currentUser]);

  useEffect(() => {
    if (currentRoomId && selectedUserForWidget && isPanelOpen) {
      setIsLoadingMessages(true);
      setError(null);
      fetchMessages(currentRoomId)
        .then(fetchedMessages => {
          setMessages(fetchedMessages);
        })
        .catch(err => {
          console.error(`Error fetching messages for widget room ${currentRoomId}:`, err);
          setError("Falha ao carregar mensagens.");
        })
        .finally(() => setIsLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [currentRoomId, selectedUserForWidget, isPanelOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSelectUserForWidget = (userToChatWith: AppUser) => {
    if (!currentUser) return;
    setSelectedUserForWidget(userToChatWith);
    const roomId = generateRoomId(currentUser.id, userToChatWith.id);
    setCurrentRoomId(roomId);
    setError(null); // Clear previous errors
  };

  const handleSendMessageInWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !currentRoomId || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const sentMessage = await sendMessage(currentRoomId, newMessage, {
        id: currentUser.id,
        username: currentUser.username,
        fullName: currentUser.fullName,
      });
      if (sentMessage) {
        setMessages(prevMessages => [...prevMessages, sentMessage]);
        setNewMessage('');
      } else {
        throw new Error("Falha ao enviar mensagem no widget.");
      }
    } catch (err) {
      console.error("Error sending message in widget:", err);
      setError(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const handleGoBackToUserListInWidget = () => {
    setSelectedUserForWidget(null);
    setCurrentRoomId(null);
    setMessages([]);
    setError(null);
  };
  
  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Optionally reset selected user when panel closes
    // setSelectedUserForWidget(null); 
    // setCurrentRoomId(null);
    // setMessages([]);
  }

  if (!isPanelOpen || !currentUser) {
    return null;
  }

  return (
    <Sheet open={isPanelOpen} onOpenChange={handleClosePanel}>
      <SheetContent className="p-0 flex flex-col h-full w-full sm:max-w-md md:max-w-lg">
        {!selectedUserForWidget ? (
          <>
            <SheetHeader className="p-4 border-b">
              <div className="flex justify-between items-center">
                <SheetTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Iniciar Conversa</SheetTitle>
                <SheetClose asChild><Button variant="ghost" size="icon"><X className="h-4 w-4"/></Button></SheetClose>
              </div>
              <SheetDescription>Selecione um usuário para conversar.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 p-4">
              {isLoadingUsers ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : error && allUsers.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : allUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum outro usuário disponível.</p>
              ) : (
                <div className="space-y-2">
                  {allUsers.map(u => (
                    <Button
                      key={u.id}
                      variant="outline"
                      className="w-full justify-start p-3 h-auto text-left"
                      onClick={() => handleSelectUserForWidget(u)}
                    >
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback>{u.fullName?.substring(0, 1).toUpperCase() || u.username.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.fullName || u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.username} ({u.role})</p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleGoBackToUserListInWidget} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{selectedUserForWidget.fullName?.substring(0, 1).toUpperCase() || selectedUserForWidget.username.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-lg">{selectedUserForWidget.fullName || selectedUserForWidget.username}</SheetTitle>
                  {/* <SheetDescription>Online/Offline status later</SheetDescription> */}
                </div>
                 <SheetClose asChild className="ml-auto">
                    <Button variant="ghost" size="icon"><X className="h-4 w-4"/></Button>
                 </SheetClose>
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1 p-4 space-y-4 bg-muted/30">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error && messages.length === 0 ? (
                <Alert variant="destructive" className="mx-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : messages.length === 0 && !isLoadingMessages ? (
                <p className="text-center text-muted-foreground py-10">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map((msg) => {
                  const isCurrentUserMessage = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCurrentUserMessage && (
                        <Avatar className="h-8 w-8 shrink-0 self-start">
                          <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow ${
                          isCurrentUserMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border'
                        }`}
                      >
                        {!isCurrentUserMessage && (
                          <p className="text-xs font-semibold mb-0.5 opacity-80">{msg.senderName}</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 opacity-70 ${isCurrentUserMessage ? 'text-right' : 'text-left'}`}>
                          {formatMessageTimestamp(msg.timestamp)}
                        </p>
                      </div>
                      {isCurrentUserMessage && (
                        <Avatar className="h-8 w-8 shrink-0 self-start">
                           <AvatarFallback>{currentUser.fullName?.substring(0, 1).toUpperCase() || currentUser.username.substring(0,1).toUpperCase() || 'V'}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10">
              {error && !isLoadingMessages && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSendMessageInWidget} className="flex w-full items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending || isLoadingMessages}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSending || isLoadingMessages || !newMessage.trim()}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar
                </Button>
              </form>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
