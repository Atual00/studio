'use client';

import React, { useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/hooks/use-toast';
import { FileWarning, CalendarClock, DollarSign, AlertCircle } from 'lucide-react';

export default function NotificationToast() {
  const { notifications } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Mostrar toast apenas para notificações críticas não lidas
    const criticalUnreadNotifications = notifications.filter(
      n => !n.isRead && n.severity === 'critical'
    );

    // Evitar spam de toasts - mostrar apenas a mais recente
    if (criticalUnreadNotifications.length > 0) {
      const latestNotification = criticalUnreadNotifications
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      const getIcon = () => {
        switch (latestNotification.type) {
          case 'document_expiring':
          case 'document_expired':
            return '📄';
          case 'licitacao_deadline':
            return '📅';
          case 'debito_overdue':
            return '💰';
          default:
            return '⚠️';
        }
      };

      toast({
        title: `${getIcon()} ${latestNotification.title}`,
        description: latestNotification.message,
        variant: 'destructive',
      });
    }
  }, [notifications, toast]);

  return null; // Este componente não renderiza nada visualmente
}