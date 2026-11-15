import { cn } from '@/lib/utils';

interface MealTypeButtonOption {
  value: string;
  label: string;
}

interface MealTypeButtonsProps {
  options: MealTypeButtonOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the group for screen readers, e.g. through a visible label's id. */
  labelledBy?: string;
  className?: string;
}

/**
 * One button per meal type, so choosing the meal is a single click instead of
 * opening a dropdown. Used when logging a food and when copying foods.
 */
export function MealTypeButtons({
  options,
  value,
  onChange,
  labelledBy,
  className,
}: MealTypeButtonsProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary bg-primary font-medium text-primary-foreground'
                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
