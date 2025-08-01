'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { differenceInDays, isBefore, startOfDay, parseISO, isValid } from 'date-fns';
import { fetchDocumentos, type Documento } from '@/services/documentoService';
import { fetchLicitacoes, type LicitacaoListItem } from '@/services/licitacaoService';
import { fetchDebitos, type Debito } from '@/services/licitacaoService';

export interface Notification {
  id: string;
  type: 'document_expiring' | 'document_expired' | 'licitacao_deadline' | 'debito_overdue';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityId: string; // ID do documento, licitação ou débito
  entityType: 'documento' | 'licitacao' | 'debito';
  daysUntilDeadline?: number; // Positivo = dias restantes, negativo = dias em atraso
  createdAt: Date;
  isRead: boolean;
  actionUrl?: string; // URL para navegar quando clicado
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_STORAGE_KEY = 'licitaxNotifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar notificações do localStorage
  const loadNotificationsFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        const parsed: Notification[] = JSON.parse(stored);
        return parsed.map(n => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
      }
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
    }
    return [];
  }, []);

  // Salvar notificações no localStorage
  const saveNotificationsToStorage = useCallback((notifs: Notification[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifs));
    } catch (e) {
      console.error('Erro ao salvar notificações:', e);
    }
  }, []);

  // Gerar notificações baseadas nos dados atuais
  const generateNotifications = useCallback(async (): Promise<Notification[]> => {
    const newNotifications: Notification[] = [];
    const today = startOfDay(new Date());

    try {
      // Buscar dados
      const [documentos, licitacoes, debitos] = await Promise.all([
        fetchDocumentos(),
        fetchLicitacoes(),
        fetchDebitos()
      ]);

      // Notificações de documentos
      documentos.forEach(doc => {
        if (!doc.dataVencimento) return;
        
        const vencDate = doc.dataVencimento instanceof Date 
          ? doc.dataVencimento 
          : parseISO(doc.dataVencimento as string);
        
        if (!isValid(vencDate)) return;

        const vencDateStart = startOfDay(vencDate);
        const daysDiff = differenceInDays(vencDateStart, today);

        let notification: Notification | null = null;

        if (daysDiff < 0) {
          // Documento vencido
          notification = {
            id: `doc_expired_${doc.id}`,
            type: 'document_expired',
            title: 'Documento Vencido',
            message: `${doc.tipoDocumento} de ${doc.clienteNome} venceu há ${Math.abs(daysDiff)} dia(s)`,
            severity: 'critical',
            entityId: doc.id,
            entityType: 'documento',
            daysUntilDeadline: daysDiff,
            createdAt: new Date(),
            isRead: false,
            actionUrl: '/documentos'
          };
        } else if (daysDiff === 0) {
          // Vence hoje
          notification = {
            id: `doc_today_${doc.id}`,
            type: 'document_expiring',
            title: 'Documento Vence Hoje',
            message: `${doc.tipoDocumento} de ${doc.clienteNome} vence hoje`,
            severity: 'critical',
            entityId: doc.id,
            entityType: 'documento',
            daysUntilDeadline: daysDiff,
            createdAt: new Date(),
            isRead: false,
            actionUrl: '/documentos'
          };
        } else if (daysDiff <= 7) {
          // Vence em até 7 dias
          notification = {
            id: `doc_week_${doc.id}`,
            type: 'document_expiring',
            title: 'Documento Vencendo',
            message: `${doc.tipoDocumento} de ${doc.clienteNome} vence em ${daysDiff} dia(s)`,
            severity: 'high',
            entityId: doc.id,
            entityType: 'documento',
            daysUntilDeadline: daysDiff,
            createdAt: new Date(),
            isRead: false,
            actionUrl: '/documentos'
          };
        } else if (daysDiff <= 30) {
          // Vence em até 30 dias
          notification = {
            id: `doc_month_${doc.id}`,
            type: 'document_expiring',
            title: 'Documento Vencendo',
            message: `${doc.tipoDocumento} de ${doc.clienteNome} vence em ${daysDiff} dia(s)`,
            severity: 'medium',
            entityId: doc.id,
            entityType: 'documento',
            daysUntilDeadline: daysDiff,
            createdAt: new Date(),
            isRead: false,
            actionUrl: '/documentos'
          };
        }

        if (notification) {
          newNotifications.push(notification);
        }
      });

      // Notificações de licitações
      licitacoes.forEach(lic => {
        const checkDate = (date: Date | string | undefined, label: string, urlPath: string) => {
          if (!date) return;
          
          const dateObj = date instanceof Date ? date : parseISO(date as string);
          if (!isValid(dateObj)) return;

          const dateStart = startOfDay(dateObj);
          const daysDiff = differenceInDays(dateStart, today);

          if (daysDiff >= 0 && daysDiff <= 3) {
            const severity = daysDiff === 0 ? 'critical' : daysDiff <= 1 ? 'high' : 'medium';
            const timeLabel = daysDiff === 0 ? 'hoje' : `em ${daysDiff} dia(s)`;
            
            newNotifications.push({
              id: `lic_${label.toLowerCase()}_${lic.id}`,
              type: 'licitacao_deadline',
              title: `${label} Próximo`,
              message: `${lic.numeroLicitacao} (${lic.clienteNome}) - ${label.toLowerCase()} ${timeLabel}`,
              severity,
              entityId: lic.id,
              entityType: 'licitacao',
              daysUntilDeadline: daysDiff,
              createdAt: new Date(),
              isRead: false,
              actionUrl: urlPath
            });
          }
        };

        checkDate(lic.dataInicio, 'Início da Disputa', `/licitacoes/${lic.id}`);
        checkDate(lic.dataMetaAnalise, 'Meta de Análise', `/licitacoes/${lic.id}`);
      });

      // Notificações de débitos em atraso
      debitos.forEach(debito => {
        if (debito.status !== 'PENDENTE') return;

        const vencDate = debito.dataVencimento instanceof Date 
          ? debito.dataVencimento 
          : parseISO(debito.dataVencimento as string);
        
        if (!isValid(vencDate)) return;

        const vencDateStart = startOfDay(vencDate);
        const daysDiff = differenceInDays(vencDateStart, today);

        if (daysDiff < 0) {
          // Débito em atraso
          newNotifications.push({
            id: `debito_overdue_${debito.id}`,
            type: 'debito_overdue',
            title: 'Pagamento em Atraso',
            message: `${debito.descricao} de ${debito.clienteNome} está ${Math.abs(daysDiff)} dia(s) em atraso`,
            severity: 'critical',
            entityId: debito.id,
            entityType: 'debito',
            daysUntilDeadline: daysDiff,
            createdAt: new Date(),
            isRead: false,
            actionUrl: '/financeiro'
          });
        } else if (daysDiff <= 3) {
          // Débito vence em breve
          const timeLabel = daysDiff === 0 ? 'hoje' : `em ${daysDiff} dia(s)`;
          newNotifications.push({
            id: `debito_due_${debito.id}`,
            type: 'debito_overdue',
            title: 'Pagamento Vencendo',
            message: `${debito.descricao} de ${debito.clienteNome} vence ${timeLabel}`,
            severity: daysDiff === 0 ? 'critical' : 'high',
            entityId: debito.id,
            entityType: 'debito',
            daysUntilDeadline: daysDiff,
            createdAt: new Date(),
            isRead: false,
            actionUrl: '/financeiro'
          });
        }
      });

    } catch (error) {
      console.error('Erro ao gerar notificações:', error);
    }

    return newNotifications;
  }, []);

  // Atualizar notificações
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingNotifications = loadNotificationsFromStorage();
      const newNotifications = await generateNotifications();
      
      // Manter o status de leitura das notificações existentes
      const updatedNotifications = newNotifications.map(newNotif => {
        const existing = existingNotifications.find(n => n.id === newNotif.id);
        return existing ? { ...newNotif, isRead: existing.isRead } : newNotif;
      });

      // Remover notificações antigas (mais de 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredNotifications = updatedNotifications.filter(n => 
        n.createdAt > thirtyDaysAgo
      );

      setNotifications(filteredNotifications);
      saveNotificationsToStorage(filteredNotifications);
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadNotificationsFromStorage, generateNotifications, saveNotificationsToStorage]);

  // Marcar como lida
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, [saveNotificationsToStorage]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, [saveNotificationsToStorage]);

  // Carregar notificações iniciais
  useEffect(() => {
    const stored = loadNotificationsFromStorage();
    setNotifications(stored);
    refreshNotifications();
  }, [loadNotificationsFromStorage, refreshNotifications]);

  // Atualizar notificações periodicamente (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isLoading
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}