import { cn } from '@/lib/utils';
import type { ExecutionStatus, StepStatus } from '@/lib/types';
import { CheckCircle2, Clock, Loader2, XCircle, Ban } from 'lucide-react';

type Status = ExecutionStatus | StepStatus;

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<Status, { label: string; className: string; icon: React.ElementType }> = {
  pending: {
    label: 'Pending',
    className: 'bg-muted text-muted-foreground',
    icon: Clock,
  },
  running: {
    label: 'Running',
    className: 'bg-info/10 text-info border-info/20',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground',
    icon: Ban,
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-muted text-muted-foreground',
    icon: Ban,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconSizes[size],
            status === 'running' && 'animate-spin'
          )}
        />
      )}
      {config.label}
    </span>
  );
}
