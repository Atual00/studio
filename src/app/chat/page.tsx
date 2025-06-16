
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Changed from Input to Textarea
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle, ArrowLeft, Users, User as UserIcon, AtSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMessages, sendMessage, formatMessageTimestamp, type ChatMessage } from '@/services/chatService';
import { fetchUsers, type User as AppUser } from '@/services/userService';
import { fetchActiveLicitacoes, type LicitacaoListItem } from '@/services/licitacaoService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useChatWidget } from '@/context/ChatWidgetContext'; 
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ChatMessageRenderer from '@/components/chat/ChatMessageRenderer'; // Import the new renderer


// Consistent Room ID generation
const generateRoomId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `chat_room_${ids[0]}_${ids[1]}`;
};

export default function ChatPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    selectedUserForWidget, 
    setSelectedUserForWidget, 
    setIsFloatingButtonMinimized,
    setHasNewChatActivity, // For clearing general notification
    removeUnreadRoom // If implementing per-room unread
  } = useChatWidget();

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);


  // For @mention functionality
  const [showLicitacaoMentionPopover, setShowLicitacaoMentionPopover] = useState(false);
  const [licitacaoMentionQuery, setLicitacaoMentionQuery] = useState('');
  const [activeLicitacoesForMention, setActiveLicitacoesForMention] = useState<LicitacaoListItem[]>([]);
  const [mentionPopoverTarget, setMentionPopoverTarget] = useState<HTMLTextAreaElement | null>(null);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [atPosition, setAtPosition] = useState<number | null>(null);


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
        
      setIsFloatingButtonMinimized(false);
      setHasNewChatActivity(false); // Clear general notification when main chat page is active
    }
  }, [isAuthenticated, currentUser, setIsFloatingButtonMinimized, setHasNewChatActivity]);

  useEffect(() => {
    if (selectedUserForWidget && currentUser) {
      const roomId = generateRoomId(currentUser.id, selectedUserForWidget.id);
      setCurrentRoomId(roomId);
      setIsLoadingMessages(true);
      setError(null);
      fetchMessages(roomId)
        .then(fetchedMessages => {
          setMessages(fetchedMessages);
           if (typeof removeUnreadRoom === 'function') removeUnreadRoom(roomId); // Clear per-room unread
        })
        .catch(err => {
          console.error(`Error fetching messages for room ${roomId}:`, err);
          setError("Falha ao carregar mensagens.");
        })
        .finally(() => setIsLoadingMessages(false));
    } else {
      setMessages([]); 
      setCurrentRoomId(null);
    }
  }, [selectedUserForWidget, currentUser, removeUnreadRoom]);

  useEffect(() => {
    if (messages.length > 0) {
        scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSelectUser = (userToChatWith: AppUser) => {
    if (!currentUser) return;
    setSelectedUserForWidget(userToChatWith); 
    setError(null); 
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
    setSelectedUserForWidget(null); 
    setError(null);
  };

  // --- @mention Licitacao Functions ---
  const handleChatInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/); // Match @ followed by non-space chars

    if (atMatch) {
      setAtPosition(cursorPos - atMatch[0].length); // Store position of @
      const query = atMatch[1]; // Text after @
      setLicitacaoMentionQuery(query);
      setShowLicitacaoMentionPopover(true);
      setMentionPopoverTarget(e.target);
      if (!loadingMentions && activeLicitacoesForMention.length === 0) { // Fetch only if not already loading or populated
        setLoadingMentions(true);
        try {
            const licitacoes = await fetchActiveLicitacoes();
            setActiveLicitacoesForMention(licitacoes);
        } catch (mentionError) {
            console.error("Error fetching licitacoes for mention:", mentionError);
            // Optionally set an error state for the popover
        } finally {
            setLoadingMentions(false);
        }
      }
    } else {
      setShowLicitacaoMentionPopover(false);
      setAtPosition(null);
    }
  };

  const handleSelectLicitacaoMention = (licitacao: LicitacaoListItem) => {
    const mentionText = `@[${licitacao.numeroLicitacao} - ${licitacao.clienteNome}](/licitacoes/${licitacao.id}) `; // Added space
    
    if (chatInputRef.current && atPosition !== null) {
        const currentText = newMessage;
        // Replace the typed @query with the full mention
        // Find where the @ started
        let startReplaceIndex = -1;
        for(let i = atPosition; i >= 0; i--) {
            if(currentText[i] === '@') {
                startReplaceIndex = i;
                break;
            }
        }

        if (startReplaceIndex !== -1) {
            const textBefore = currentText.substring(0, startReplaceIndex);
            const textAfter = currentText.substring(chatInputRef.current.selectionStart); // Text after current cursor or @query
            
            const finalMessage = textBefore + mentionText + textAfter;
            setNewMessage(finalMessage);

            // Set cursor position after the inserted mention
            const newCursorPos = (textBefore + mentionText).length;
            setTimeout(() => { // Timeout to allow state to update before setting cursor
                chatInputRef.current?.focus();
                chatInputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    }
    setShowLicitacaoMentionPopover(false);
    setLicitacaoMentionQuery('');
    setActiveLicitacoesForMention([]); // Clear to re-fetch next time if needed
    setAtPosition(null);
  };

  const filteredLicitacoesForPopover = activeLicitacoesForMention.filter(lic =>
    `${lic.numeroLicitacao} ${lic.clienteNome}`.toLowerCase().includes(licitacaoMentionQuery.toLowerCase())
  );


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
  if (!selectedUserForWidget) {
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
            ) : error && allUsers.length === 0 ? ( 
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
                <AvatarFallback>{selectedUserForWidget.fullName?.substring(0, 1).toUpperCase() || selectedUserForWidget.username.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="text-lg">Chat com {selectedUserForWidget.fullName || selectedUserForWidget.username}</CardTitle>
                <CardDescription>Conversa privada.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4 space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : error && messages.length === 0 ? (
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
                        <Avatar className="h-8 w-8 shrink-0 self-start">
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
                        <ChatMessageRenderer text={msg.text} />
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
        </CardContent>

        <CardFooter className="p-4 border-t">
          {error && !isLoadingMessages && ( 
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
           <Popover open={showLicitacaoMentionPopover} onOpenChange={setShowLicitacaoMentionPopover}>
            <PopoverTrigger asChild>
                {/* This is a dummy trigger, the popover is controlled programmatically */}
                <span ref={setMentionPopoverTarget as any} />
            </PopoverTrigger>
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2 relative">
                <Textarea
                ref={chatInputRef}
                placeholder="Digite sua mensagem ou @ para mencionar uma licitação..."
                value={newMessage}
                onChange={handleChatInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !showLicitacaoMentionPopover) { handleSendMessage(e as any); } }}
                disabled={isSending || isLoadingMessages}
                className="flex-1 min-h-[40px] max-h-[120px]"
                />
                <Button type="submit" disabled={isSending || isLoadingMessages || !newMessage.trim() || showLicitacaoMentionPopover}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar
                </Button>
                 <PopoverContent 
                    className="w-[300px] p-0" 
                    side="top" 
                    align="start"
                    style={{ 
                        position: 'absolute', 
                        bottom: '100%', /* Position above the textarea */
                        marginBottom: '8px', /* Small gap */
                        // The actual popover positioning will be managed by Radix, 
                        // this is more for conceptual placement within the form
                    }}
                    hidden={!showLicitacaoMentionPopover}
                    onInteractOutside={() => setShowLicitacaoMentionPopover(false)}
                 >
                    {loadingMentions ? (
                        <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                    ) : filteredLicitacoesForPopover.length > 0 ? (
                        <ScrollArea className="max-h-48">
                            <div className="p-1">
                            {filteredLicitacoesForPopover.map(lic => (
                                <Button
                                key={lic.id}
                                variant="ghost"
                                className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm"
                                onClick={() => handleSelectLicitacaoMention(lic)}
                                >
                                {lic.numeroLicitacao} - {lic.clienteNome}
                                </Button>
                            ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma licitação ativa encontrada{licitacaoMentionQuery ? ` para "@${licitacaoMentionQuery}"` : ''}.</p>
                    )}
                </PopoverContent>
            </form>
            </Popover>
        </CardFooter>
      </Card>
    </div>
  );
}
