import { cn } from '@/lib/utils';

interface StepBadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const stepColors: Record<string, string> = {
  A: 'bg-step-a',
  B: 'bg-step-b',
  C: 'bg-step-c',
  D: 'bg-step-d',
  E: 'bg-step-e',
};

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function StepBadge({ name, size = 'md', className }: StepBadgeProps) {
  const colorClass = stepColors[name] || 'bg-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shadow-md',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      {name}
    </div>
  );
}
