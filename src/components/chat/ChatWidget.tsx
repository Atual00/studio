
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Keep for mention filter if needed
import { Textarea } from '@/components/ui/textarea'; // Use Textarea for chat input
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle, Users, ArrowLeft, X, Minus, AtSign } from 'lucide-react'; 
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { fetchMessages, sendMessage, formatMessageTimestamp, type ChatMessage } from '@/services/chatService';
import { fetchUsers, type User as AppUser } from '@/services/userService';
import { fetchActiveLicitacoes, type LicitacaoListItem } from '@/services/licitacaoService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useChatWidget } from '@/context/ChatWidgetContext';
import { Separator } from '../ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ChatMessageRenderer from '@/components/chat/ChatMessageRenderer'; // Import the new renderer

// Consistent Room ID generation
const generateRoomId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `chat_room_${ids[0]}_${ids[1]}`; 
};

export default function ChatWidget() {
  const { user: currentUser } = useAuth();
  const { 
    isPanelOpen, 
    setIsPanelOpen, 
    selectedUserForWidget, 
    setSelectedUserForWidget,
    setIsFloatingButtonMinimized,
    removeUnreadRoom, // Use removeUnreadRoom
  } = useChatWidget();

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRefWidget = useRef<HTMLTextAreaElement>(null);

  // For @mention functionality
  const [showLicitacaoMentionPopoverWidget, setShowLicitacaoMentionPopoverWidget] = useState(false);
  const [licitacaoMentionQueryWidget, setLicitacaoMentionQueryWidget] = useState('');
  const [activeLicitacoesForMentionWidget, setActiveLicitacoesForMentionWidget] = useState<LicitacaoListItem[]>([]);
  const [mentionPopoverTargetWidget, setMentionPopoverTargetWidget] = useState<HTMLTextAreaElement | null>(null);
  const [loadingMentionsWidget, setLoadingMentionsWidget] = useState(false);
  const [atPositionWidget, setAtPositionWidget] = useState<number | null>(null);


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isPanelOpen && currentUser && !selectedUserForWidget) { 
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
    } else if (!isPanelOpen) {
      setAllUsers([]); 
    }
  }, [isPanelOpen, currentUser, selectedUserForWidget]);

  useEffect(() => {
    if (selectedUserForWidget && currentUser && isPanelOpen) {
      const roomId = generateRoomId(currentUser.id, selectedUserForWidget.id);
      setCurrentRoomId(roomId);
      setIsLoadingMessages(true);
      setError(null);
      fetchMessages(roomId)
        .then(fetchedMessages => {
          setMessages(fetchedMessages);
          removeUnreadRoom(roomId); // Mark as read when chat is opened in widget
        })
        .catch(err => {
          console.error(`Error fetching messages for widget room ${roomId}:`, err);
          setError("Falha ao carregar mensagens.");
        })
        .finally(() => setIsLoadingMessages(false));
    } else {
      setMessages([]);
      setCurrentRoomId(null);
    }
  }, [selectedUserForWidget, currentUser, isPanelOpen, removeUnreadRoom]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSelectUserForWidget = (userToChatWith: AppUser) => {
    if (!currentUser) return;
    setSelectedUserForWidget(userToChatWith);
    setError(null); 
    // removeUnreadRoom will be called by the effect listening to selectedUserForWidget
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
    setError(null);
  };
  
  const handleClosePanel = () => {
    setIsPanelOpen(false);
  }

  const handleMinimizeButtonClick = () => {
    setIsFloatingButtonMinimized(true);
    setIsPanelOpen(false);
  };
  
  // --- @mention Licitacao Functions for Widget ---
  const handleChatInputChangeWidget = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      setAtPositionWidget(cursorPos - atMatch[0].length);
      const query = atMatch[1];
      setLicitacaoMentionQueryWidget(query);
      setShowLicitacaoMentionPopoverWidget(true);
      setMentionPopoverTargetWidget(e.target); // Anchor to textarea
      if (!loadingMentionsWidget && activeLicitacoesForMentionWidget.length === 0) {
        setLoadingMentionsWidget(true);
        try {
            const licitacoes = await fetchActiveLicitacoes();
            setActiveLicitacoesForMentionWidget(licitacoes);
        } catch (mentionError) {
            console.error("Error fetching licitacoes for mention (widget):", mentionError);
        } finally {
            setLoadingMentionsWidget(false);
        }
      }
    } else {
      setShowLicitacaoMentionPopoverWidget(false);
      setAtPositionWidget(null);
    }
  };

  const handleSelectLicitacaoMentionWidget = (licitacao: LicitacaoListItem) => {
    const mentionText = `@[${licitacao.numeroLicitacao} - ${licitacao.clienteNome}](/licitacoes/${licitacao.id}) `;
    
    if (chatInputRefWidget.current && atPositionWidget !== null) {
        const currentText = newMessage;
        let startReplaceIndex = -1;
        for(let i = atPositionWidget; i >= 0; i--) {
            if(currentText[i] === '@') {
                startReplaceIndex = i;
                break;
            }
        }

        if (startReplaceIndex !== -1) {
            const textBefore = currentText.substring(0, startReplaceIndex);
            const textAfter = currentText.substring(chatInputRefWidget.current.selectionStart);
            
            const finalMessage = textBefore + mentionText + textAfter;
            setNewMessage(finalMessage);

            const newCursorPos = (textBefore + mentionText).length;
            setTimeout(() => {
                chatInputRefWidget.current?.focus();
                chatInputRefWidget.current?.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    }
    setShowLicitacaoMentionPopoverWidget(false);
    setLicitacaoMentionQueryWidget('');
    setActiveLicitacoesForMentionWidget([]);
    setAtPositionWidget(null);
  };

  const filteredLicitacoesForPopoverWidget = activeLicitacoesForMentionWidget.filter(lic =>
    `${lic.numeroLicitacao} ${lic.clienteNome}`.toLowerCase().includes(licitacaoMentionQueryWidget.toLowerCase())
  );


  if (!isPanelOpen || !currentUser) {
    return null;
  }

  return (
    <Sheet open={isPanelOpen} onOpenChange={ (open) => {
        setIsPanelOpen(open);
        if(open && selectedUserForWidget && currentUser) {
           const roomId = `chat_room_${[currentUser.id, selectedUserForWidget.id].sort().join('_')}`;
           removeUnreadRoom(roomId);
        }
    }}>
      <SheetContent className="p-0 flex flex-col h-full w-full sm:max-w-md md:max-w-lg">
        {!selectedUserForWidget ? (
          <>
            <SheetHeader className="p-4 border-b">
              <div className="flex justify-between items-center">
                <SheetTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Iniciar Conversa</SheetTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleMinimizeButtonClick} title="Minimizar Ícone do Chat">
                      <Minus className="h-4 w-4"/>
                  </Button>
                  <SheetClose asChild><Button variant="ghost" size="icon" title="Fechar Painel"><X className="h-4 w-4"/></Button></SheetClose>
                </div>
              </div>
              <SheetDescription>Selecione um usuário para conversar.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 p-4">
              {isLoadingUsers ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
              <div className="flex items-center gap-1 sm:gap-3">
                <Button variant="ghost" size="icon" onClick={handleGoBackToUserListInWidget} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{selectedUserForWidget.fullName?.substring(0, 1).toUpperCase() || selectedUserForWidget.username.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg truncate">{selectedUserForWidget.fullName || selectedUserForWidget.username}</SheetTitle>
                </div>
                <div className="flex items-center gap-1 ml-auto shrink-0">
                     <Button variant="ghost" size="icon" onClick={handleMinimizeButtonClick} title="Minimizar Ícone do Chat">
                        <Minus className="h-4 w-4"/>
                    </Button>
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon" title="Fechar Painel"><X className="h-4 w-4"/></Button>
                    </SheetClose>
                </div>
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
            <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10">
              {error && !isLoadingMessages && ( 
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Popover open={showLicitacaoMentionPopoverWidget} onOpenChange={setShowLicitacaoMentionPopoverWidget}>
                <PopoverTrigger asChild>
                     {/* This is a dummy trigger for anchoring, popover is controlled programmatically */}
                    <span ref={setMentionPopoverTargetWidget as any} />
                </PopoverTrigger>
                <form onSubmit={handleSendMessageInWidget} className="flex w-full items-center space-x-2 relative">
                    <Textarea
                    ref={chatInputRefWidget}
                    placeholder="Digite ou use @ para mencionar..."
                    value={newMessage}
                    onChange={handleChatInputChangeWidget}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !showLicitacaoMentionPopoverWidget) { handleSendMessageInWidget(e as any); } }}
                    disabled={isSending || isLoadingMessages}
                    className="flex-1 min-h-[40px] max-h-[100px]"
                    />
                    <Button type="submit" disabled={isSending || isLoadingMessages || !newMessage.trim() || showLicitacaoMentionPopoverWidget}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar
                    </Button>
                     <PopoverContent 
                        className="w-[300px] p-0" 
                        side="top" 
                        align="start"
                         style={{ 
                            position: 'absolute', 
                            bottom: '100%', 
                            marginBottom: '8px',
                        }}
                        hidden={!showLicitacaoMentionPopoverWidget} // Controlled by state
                        onInteractOutside={() => setShowLicitacaoMentionPopoverWidget(false)} // Close on outside click
                    >
                        {loadingMentionsWidget ? (
                            <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                        ) : filteredLicitacoesForPopoverWidget.length > 0 ? (
                            <ScrollArea className="max-h-40"> {/* Max height for popover list */}
                                <div className="p-1">
                                {filteredLicitacoesForPopoverWidget.map(lic => (
                                    <Button
                                    key={lic.id}
                                    variant="ghost"
                                    className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm"
                                    onClick={() => handleSelectLicitacaoMentionWidget(lic)}
                                    >
                                    {lic.numeroLicitacao} - {lic.clienteNome}
                                    </Button>
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma licitação ativa encontrada {licitacaoMentionQueryWidget ? `para "@${licitacaoMentionQueryWidget}"`: ''}.</p>
                        )}
                    </PopoverContent>
                </form>
              </Popover>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
