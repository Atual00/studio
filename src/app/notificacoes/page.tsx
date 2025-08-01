'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Bell, 
  FileWarning, 
  CalendarClock, 
  DollarSign, 
  CheckCheck, 
  RefreshCw,
  Loader2,
  AlertCircle,
  Filter,
  X
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
      return 'destructive';
    case 'high':
      return 'warning';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
};

const getSeverityLabel = (severity: Notification['severity']) => {
  switch (severity) {
    case 'critical':
      return 'Crítico';
    case 'high':
      return 'Alto';
    case 'medium':
      return 'Médio';
    case 'low':
      return 'Baixo';
    default:
      return 'Normal';
  }
};

export default function NotificacoesPage() {
  const router = useRouter();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications,
    isLoading 
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'todas' | 'nao-lidas' | 'documentos' | 'licitacoes' | 'financeiro'>('todas');

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const filterNotifications = (notifications: Notification[]) => {
    switch (activeTab) {
      case 'nao-lidas':
        return notifications.filter(n => !n.isRead);
      case 'documentos':
        return notifications.filter(n => n.entityType === 'documento');
      case 'licitacoes':
        return notifications.filter(n => n.entityType === 'licitacao');
      case 'financeiro':
        return notifications.filter(n => n.entityType === 'debito');
      default:
        return notifications;
    }
  };

  const sortedNotifications = [...notifications]
    .sort((a, b) => {
      // Não lidas primeiro
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      
      // Por severidade
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Por data (mais recente primeiro)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const filteredNotifications = filterNotifications(sortedNotifications);

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'nao-lidas':
        return unreadCount;
      case 'documentos':
        return notifications.filter(n => n.entityType === 'documento').length;
      case 'licitacoes':
        return notifications.filter(n => n.entityType === 'licitacao').length;
      case 'financeiro':
        return notifications.filter(n => n.entityType === 'debito').length;
      default:
        return notifications.length;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Central de Notificações
          </h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe prazos importantes e alertas do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshNotifications}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Ativas</CardTitle>
          <CardDescription>
            {unreadCount > 0 
              ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''} de ${notifications.length} total`
              : `${notifications.length} notificação${notifications.length !== 1 ? 'ões' : ''} - todas lidas`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="todas" className="relative">
                Todas
                {getTabCount('todas') > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getTabCount('todas')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="nao-lidas" className="relative">
                Não Lidas
                {getTabCount('nao-lidas') > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getTabCount('nao-lidas')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documentos">
                <FileWarning className="h-4 w-4 mr-1" />
                Documentos
                {getTabCount('documentos') > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getTabCount('documentos')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="licitacoes">
                <CalendarClock className="h-4 w-4 mr-1" />
                Licitações
                {getTabCount('licitacoes') > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getTabCount('licitacoes')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="financeiro">
                <DollarSign className="h-4 w-4 mr-1" />
                Financeiro
                {getTabCount('financeiro') > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getTabCount('financeiro')}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma notificação</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'nao-lidas' 
                      ? 'Todas as notificações foram lidas'
                      : `Não há notificações para ${activeTab === 'todas' ? 'exibir' : activeTab}`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const severityBadgeVariant = getSeverityColor(notification.severity);
                    
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                          !notification.isRead && "bg-primary/5 border-primary/20"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            notification.severity === 'critical' && "bg-red-100 text-red-600",
                            notification.severity === 'high' && "bg-orange-100 text-orange-600",
                            notification.severity === 'medium' && "bg-yellow-100 text-yellow-600",
                            notification.severity === 'low' && "bg-blue-100 text-blue-600"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={cn(
                                "font-medium",
                                !notification.isRead && "font-semibold"
                              )}>
                                {notification.title}
                              </h4>
                              <Badge variant={severityBadgeVariant as any} className="text-xs">
                                {getSeverityLabel(notification.severity)}
                              </Badge>
                              {!notification.isRead && (
                                <div className="h-2 w-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {format(notification.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {notification.daysUntilDeadline !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.daysUntilDeadline === 0 
                                    ? 'Hoje'
                                    : notification.daysUntilDeadline > 0 
                                      ? `${notification.daysUntilDeadline} dia(s)`
                                      : `${Math.abs(notification.daysUntilDeadline)} dia(s) atrás`
                                  }
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}