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
  let colorClass = stepColors[name];

  if (!colorClass) {
    // Fallback for dynamic names: hash to a set of colors
    const dynamicColors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500',
      'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];

    // Simple hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % dynamicColors.length;
    colorClass = dynamicColors[index];
  }

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
