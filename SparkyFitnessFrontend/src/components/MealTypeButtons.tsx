import { useRef, type KeyboardEvent } from 'react';
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
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  // One tab stop for the group, as a radio group has: the picked meal, or the
  // first one when none is picked.
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  // Arrow keys move the choice, as with native radio buttons.
  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0 || options.length === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
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
