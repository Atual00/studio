
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle, ArrowLeft, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMessages, sendMessage, formatMessageTimestamp, type ChatMessage } from '@/services/chatService';
import { fetchUsers, type User as AppUser } from '@/services/userService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const generateRoomId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `chat_${ids[0]}_${ids[1]}`;
};

export default function ChatPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
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

  // Fetch all users (excluding current user)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setIsLoadingUsers(true);
      fetchUsers()
        .then(fetchedUsers => {
          setAllUsers(fetchedUsers.filter(u => u.id !== currentUser.id));
        })
        .catch(err => {
          console.error("Error fetching users:", err);
          setError("Falha ao carregar lista de usuários.");
        })
        .finally(() => setIsLoadingUsers(false));
    }
  }, [isAuthenticated, currentUser]);

  // Fetch messages when a user is selected (room ID changes)
  useEffect(() => {
    if (currentRoomId && selectedUser) {
      setIsLoadingMessages(true);
      setError(null);
      fetchMessages(currentRoomId)
        .then(fetchedMessages => {
          setMessages(fetchedMessages);
        })
        .catch(err => {
          console.error(`Error fetching messages for room ${currentRoomId}:`, err);
          setError("Falha ao carregar mensagens.");
        })
        .finally(() => setIsLoadingMessages(false));
    } else {
      setMessages([]); // Clear messages if no room is selected
    }
  }, [currentRoomId, selectedUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
        scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSelectUser = (userToChatWith: AppUser) => {
    if (!currentUser) return;
    setSelectedUser(userToChatWith);
    const roomId = generateRoomId(currentUser.id, userToChatWith.id);
    setCurrentRoomId(roomId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
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
        throw new Error("Falha ao enviar mensagem.");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const handleGoBackToUserList = () => {
    setSelectedUser(null);
    setCurrentRoomId(null);
    setMessages([]);
    setError(null);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando autenticação...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
     return (
        <div className="flex justify-center items-center h-full">
            <Alert variant="destructive" className="w-full max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>
                    Você precisa estar logado para usar o chat.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // User List View
  if (!selectedUser) {
    return (
      <Card className="shadow-lg rounded-lg overflow-hidden h-full flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Selecionar Usuário para Chat</CardTitle>
          <CardDescription>Escolha um usuário para iniciar uma conversa privada.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {isLoadingUsers ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : error ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro ao Carregar Usuários</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : allUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">
                Nenhum outro usuário encontrado no sistema.
              </p>
            ) : (
              <div className="space-y-2">
                {allUsers.map(u => (
                  <Button
                    key={u.id}
                    variant="outline"
                    className="w-full justify-start p-3 h-auto text-left"
                    onClick={() => handleSelectUser(u)}
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
        </CardContent>
      </Card>
    );
  }

  // Chat View with Selected User
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <Card className="flex-1 flex flex-col shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" onClick={handleGoBackToUserList} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9">
                <AvatarFallback>{selectedUser.fullName?.substring(0, 1).toUpperCase() || selectedUser.username.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="text-lg">Chat com {selectedUser.fullName || selectedUser.username}</CardTitle>
                <CardDescription>Conversa privada.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4 space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Carregando mensagens...</p>
                </div>
            ) : error && messages.length === 0 ? ( // Show error only if no messages could be loaded
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro ao Carregar Mensagens</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : messages.length === 0 && !isLoadingMessages && !error ? (
              <p className="text-center text-muted-foreground py-10">
                Nenhuma mensagem ainda. Seja o primeiro a enviar!
              </p>
            ) : (
                messages.map((msg) => {
                const isCurrentUserMessage = msg.senderId === currentUser.id;
                return (
                    <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                    >
                    {!isCurrentUserMessage && (
                        <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                    )}
                    <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow ${
                        isCurrentUserMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
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
                        <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback>{currentUser.fullName?.substring(0, 1).toUpperCase() || currentUser.username.substring(0,1).toUpperCase() || 'V'}</AvatarFallback>
                        </Avatar>
                    )}
                    </div>
                );
                })
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t">
          {error && !isLoadingMessages && ( // Show error here if it occurred during send or a general message load error persists
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
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
        </CardFooter>
      </Card>
    </div>
  );
}
