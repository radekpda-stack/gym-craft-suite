/**
 * Shared UI components for Client Portal
 */

import { TrendingUp, TrendingDown, Minus, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { type PeriodDays } from '@/hooks/useClientPortalStats';

/**
 * Period filter chip options
 */
export const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 7, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
  { value: 'all', label: 'Vše' },
];

interface PeriodChipsProps {
  value: PeriodDays;
  onChange: (v: PeriodDays) => void;
  options?: { value: PeriodDays; label: string }[];
  className?: string;
}

/**
 * Period filter chips for selecting time ranges
 */
export function PeriodChips({ 
  value, 
  onChange, 
  options = periodOptions,
  className 
}: PeriodChipsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface TrendIconProps {
  value: number;
  className?: string;
}

/**
 * Trend icon showing up/down/neutral based on value
 */
export function TrendIcon({ value, className }: TrendIconProps) {
  if (value > 0) {
    return <TrendingUp className={cn("w-4 h-4 text-success", className)} />;
  }
  if (value < 0) {
    return <TrendingDown className={cn("w-4 h-4 text-destructive", className)} />;
  }
  return <Minus className={cn("w-4 h-4 text-muted-foreground", className)} />;
}

interface TrendBadgeProps {
  value: number;
  suffix?: string;
  className?: string;
}

/**
 * Trend badge with icon and formatted value
 */
export function TrendBadge({ value, suffix = '', className }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Minus className="w-3 h-3" />
        beze změny
      </span>
    );
  }
  
  const isPositive = value > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium",
      isPositive ? "text-success" : "text-destructive",
      className
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  );
}

export type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeSwitcherProps {
  value: ThemeOption;
  onChange: (theme: ThemeOption) => void;
  className?: string;
}

/**
 * Theme switcher with light/dark/system options
 */
export function ThemeSwitcher({ value, onChange, className }: ThemeSwitcherProps) {
  const options: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Světlý' },
    { value: 'dark', icon: Moon, label: 'Tmavý' },
    { value: 'system', icon: Monitor, label: 'Systém' },
  ];

  return (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-lg", className)}>
      {options.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              isActive 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <opt.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Helper to convert ThemePreference to ThemeOption for ThemeSwitcher
 */
export function themePreferenceToOption(pref: string, currentTheme: string): ThemeOption {
  if (pref === 'system') return 'system';
  if (currentTheme === 'light-minimal' || currentTheme === 'frost-minimal') return 'light';
  return 'dark';
}
