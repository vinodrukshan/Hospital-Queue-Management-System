import React from 'react';
import { QueueStatus, PriorityLevel, AppointmentStatus } from '../../types/database';
import { cn, getQueueStatusColor, getPriorityBadgeColor } from '../../lib/utils';

interface StatusBadgeProps {
  status: QueueStatus | AppointmentStatus | string;
  type?: 'queue' | 'priority' | 'appointment' | 'device';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'queue', className }) => {
  if (type === 'priority') {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
          getPriorityBadgeColor(status),
          className
        )}
      >
        {status}
      </span>
    );
  }

  if (type === 'device') {
    const isOnline = status === 'online';
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', isOnline ? 'bg-emerald-500' : 'bg-rose-500')} />
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border',
        getQueueStatusColor(status),
        className
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
