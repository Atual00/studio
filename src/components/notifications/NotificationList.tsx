'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileWarning, 
  AlertCircle, 
  CalendarClock, 
  DollarSign, 
  CheckCheck,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useNotifications, type Notification } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'document_expiring':
    case 'document_expired':
      return FileWarning;
    case 'licitacao_deadline':
      return CalendarClock;
    case 'debito_overdue':
      return DollarSign;
    default:
      return AlertCircle;
  }
};

const getSeverityColor = (severity: Notification['severity']) => {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export default function NotificationList() {
  const router = useRouter();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications,
    isLoading 
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const sortedNotifications = [...notifications]
    .sort((a, b) => {
      // Não lidas primeiro, depois por severidade, depois por data
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshNotifications}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount} notificação{unreadCount > 1 ? 'ões' : ''} não lida{unreadCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Lista de notificações */}
      <ScrollArea className="h-96">
        {sortedNotifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="p-2">
            {sortedNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const severityColor = getSeverityColor(notification.severity);
              
              return (
                <div key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full p-3 text-left rounded-lg transition-colors hover:bg-muted/50",
                      !notification.isRead && "bg-primary/5 border-l-4 border-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        severityColor
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-medium text-sm",
                            !notification.isRead && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(notification.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </button>
                  {index < sortedNotifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {sortedNotifications.length > 0 && (
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => router.push('/notificacoes')}
          >
            Ver todas as notificações
          </Button>
        </div>
      )}
    </div>
  );
}