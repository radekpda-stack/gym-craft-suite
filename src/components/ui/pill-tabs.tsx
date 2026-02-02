/**
 * PillTabs - Apple Music-style segmented control
 * 
 * Premium pill-shaped tabs with animated indicator slider.
 * Uses Framer Motion for smooth background slide animation.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PillTab {
  value: string;
  label: string;
  count?: number;
}

interface PillTabsProps {
  tabs: PillTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function PillTabs({ tabs, value, onChange, className, size = 'md' }: PillTabsProps) {
  const activeIndex = tabs.findIndex(tab => tab.value === value);

  return (
    <div 
      className={cn(
        "relative inline-flex items-center p-1 rounded-xl bg-secondary/40 backdrop-blur-sm border border-border/30",
        className
      )}
    >
      {/* Animated background slider */}
      <motion.div
        className="absolute inset-y-1 bg-card shadow-sm rounded-lg border border-border/50"
        initial={false}
        animate={{
          left: `calc(${activeIndex * (100 / tabs.length)}% + 4px)`,
          width: `calc(${100 / tabs.length}% - 8px)`,
        }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 30,
        }}
      />

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center gap-1.5 font-medium transition-colors",
              size === 'sm' ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              isActive 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                isActive 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * SimplePillTab - Single pill button for view mode switching
 */
interface SimplePillTabProps {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function SimplePillTab({ children, isActive, onClick, className }: SimplePillTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-3 py-1.5 text-xs font-medium rounded-full transition-all",
        isActive 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId="pill-tab-bg"
          className="absolute inset-0 bg-primary rounded-full -z-10"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      {children}
    </button>
  );
}
