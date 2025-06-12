
'use client';

import type { User } from './userService'; // Assuming User type includes id and username/fullName
import { parseISO, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ChatMessage {
  id: string;
  roomId: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string; // ISO string for storage, will be Date object in component
}

const getLocalStorageKey = (roomId: string) => `licitaxChatMessages_${roomId}`;

// --- Helper Functions ---

const getMessagesFromStorage = (roomId: string): ChatMessage[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(getLocalStorageKey(roomId));
  try {
    const items: ChatMessage[] = storedData ? JSON.parse(storedData) : [];
    // Ensure timestamps are valid ISO strings, sort by timestamp
    return items
      .map(msg => ({
        ...msg,
        timestamp: msg.timestamp, // Keep as string for storage
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (e) {
    console.error(`Error parsing messages for room ${roomId} from localStorage:`, e);
    localStorage.removeItem(getLocalStorageKey(roomId)); // Clear corrupted data
    return [];
  }
};

const saveMessagesToStorage = (roomId: string, messages: ChatMessage[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const sortedMessages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    localStorage.setItem(getLocalStorageKey(roomId), JSON.stringify(sortedMessages));
  } catch (e) {
    console.error(`Error saving messages for room ${roomId} to localStorage:`, e);
  }
};

// --- Service Functions ---

/**
 * Fetches messages for a specific chat room.
 * In a real app with Firestore, this would set up a real-time listener.
 * For this prototype, it fetches from localStorage.
 * @param roomId The ID of the chat room.
 * @returns A promise that resolves to an array of ChatMessage objects.
 */
export const fetchMessages = async (roomId: string): Promise<ChatMessage[]> => {
  console.log(`Fetching messages for room: ${roomId}`);
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
  return getMessagesFromStorage(roomId);
};

/**
 * Sends a new message to a chat room.
 * @param roomId The ID of the chat room.
 * @param text The message text.
 * @param sender The user object of the sender.
 * @returns A promise that resolves to the newly created ChatMessage or null on failure.
 */
export const sendMessage = async (
  roomId: string,
  text: string,
  sender: Pick<User, 'id' | 'username' | 'fullName'> // Use Pick from User type
): Promise<ChatMessage | null> => {
  console.log(`Sending message to room ${roomId}: "${text}" by ${sender.username}`);
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay

  if (!text.trim() || !sender || !sender.id) {
    console.error("Message send failed: Missing text or sender info.");
    return null;
  }

  const messages = getMessagesFromStorage(roomId);
  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    roomId,
    text: text.trim(),
    senderId: sender.id,
    senderName: sender.fullName || sender.username,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [...messages, newMessage];
  saveMessagesToStorage(roomId, updatedMessages);
  return newMessage;
};

/**
 * Formats a timestamp string or Date object for display.
 * @param timestamp The timestamp (ISO string or Date object).
 * @returns A formatted date string (e.g., "10/07/2024 14:30") or "Data inválida".
 */
export const formatMessageTimestamp = (timestamp: string | Date): string => {
  try {
    const dateObj = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    if (isValid(dateObj)) {
      return format(dateObj, "dd/MM/yyyy HH:mm", { locale: ptBR });
    }
    return "Data inválida";
  } catch {
    return "Data inválida";
  }
};
