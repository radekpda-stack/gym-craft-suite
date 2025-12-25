import { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  impact?: {
    type: 'info' | 'warning';
    message: string;
  };
  className?: string;
}

export function SettingsSection({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  impact,
  className 
}: SettingsSectionProps) {
  return (
    <div className={cn("glass rounded-xl p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      {/* Impact warning */}
      {impact && (
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg text-sm",
          impact.type === 'warning' 
            ? "bg-warning/10 text-warning border border-warning/20" 
            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
        )}>
          {impact.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{impact.message}</span>
        </div>
      )}

      {/* Content */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
