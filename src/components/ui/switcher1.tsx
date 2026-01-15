"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Switcher1Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Switcher1 = React.forwardRef<HTMLInputElement, Switcher1Props>(
  ({ checked, onCheckedChange, disabled = false, className, 'aria-label': ariaLabel }, ref) => {
    const handleChange = () => {
      if (!disabled) {
        onCheckedChange(!checked);
      }
    };

    return (
      <label className={cn('flex cursor-pointer select-none items-center', disabled && 'cursor-not-allowed opacity-50', className)}>
        <div className='relative'>
          <input
            ref={ref}
            type='checkbox'
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className='sr-only'
            aria-label={ariaLabel}
          />
          {/* Track: Uses Brand Blue (primary) when active, dark theme color when inactive */}
          <div className={cn(
            'block h-8 w-14 rounded-full transition-colors duration-300',
            checked ? 'bg-primary' : 'bg-slate-700/70 border border-slate-600/50'
          )}></div>
          
          {/* Thumb: Slides when active */}
          <div className={cn(
            'dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform duration-300',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}></div>
        </div>
      </label>
    );
  }
);

Switcher1.displayName = "Switcher1";
