
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMessages, sendMessage, formatMessageTimestamp, type ChatMessage } from '@/services/chatService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const GENERAL_ROOM_ID = 'general_licitax_chat'; // Define a constant for the general room

export default function ChatPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial messages
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      setIsLoadingMessages(true);
      setError(null);
      fetchMessages(GENERAL_ROOM_ID)
        .then(fetchedMessages => {
          setMessages(fetchedMessages);
        })
        .catch(err => {
          console.error("Error fetching messages:", err);
          setError("Falha ao carregar mensagens.");
        })
        .finally(() => setIsLoadingMessages(false));
    } else if (!authLoading && !isAuthenticated) {
        setError("Você precisa estar logado para acessar o chat.");
        setIsLoadingMessages(false);
    }
  }, [isAuthenticated, authLoading]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const sentMessage = await sendMessage(GENERAL_ROOM_ID, newMessage, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
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

  if (authLoading || isLoadingMessages) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando chat...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
     return (
        <div className="flex justify-center items-center h-full">
            <Alert variant="destructive" className="w-full max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>
                    Você precisa estar logado para usar o chat interno.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]"> {/* Adjust height for header */}
      <Card className="flex-1 flex flex-col shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Chat Interno - Geral</CardTitle>
          <CardDescription>Converse com outros usuários do sistema.</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4 space-y-4">
            {messages.length === 0 && !isLoadingMessages && !error && (
              <p className="text-center text-muted-foreground py-10">
                Nenhuma mensagem ainda. Seja o primeiro a enviar!
              </p>
            )}
            {messages.map((msg) => {
              const isCurrentUser = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow ${
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {!isCurrentUser && (
                        <p className="text-xs font-semibold mb-0.5 opacity-80">{msg.senderName}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 opacity-70 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {formatMessageTimestamp(msg.timestamp)}
                    </p>
                  </div>
                   {isCurrentUser && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'V'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t">
          {error && (
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
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
