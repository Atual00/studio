'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/context/NotificationContext';

interface NotificationBadgeProps {
  entityType?: 'documento' | 'licitacao' | 'debito';
  entityId?: string;
  className?: string;
}

export default function NotificationBadge({ entityType, entityId, className }: NotificationBadgeProps) {
  const { notifications } = useNotifications();

  const relevantNotifications = notifications.filter(n => {
    if (entityId && n.entityId === entityId) return true;
    if (entityType && n.entityType === entityType) return true;
    return false;
  });

  const unreadCount = relevantNotifications.filter(n => !n.isRead).length;
  const criticalCount = relevantNotifications.filter(n => !n.isRead && n.severity === 'critical').length;

  if (unreadCount === 0) return null;

  return (
    <Badge 
      variant={criticalCount > 0 ? 'destructive' : 'warning'} 
      className={className}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}