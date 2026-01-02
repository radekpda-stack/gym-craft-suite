import { FileText, Send, Stethoscope, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreateClientMode = 'select' | 'basic' | 'send_invite' | 'trainer_fill';

interface CreateClientModeSelectorProps {
  onSelect: (mode: CreateClientMode) => void;
}

const modes = [
  {
    id: 'basic' as const,
    icon: FileText,
    title: 'Rychle',
    description: 'Základní údaje',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    hoverColor: 'hover:bg-blue-500/20',
  },
  {
    id: 'send_invite' as const,
    icon: Send,
    title: 'Poslat odkaz',
    description: 'Klient vyplní sám',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    hoverColor: 'hover:bg-emerald-500/20',
  },
  {
    id: 'trainer_fill' as const,
    icon: Stethoscope,
    title: 'Vyplnit sám',
    description: 'Trenér vyplní vše',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    hoverColor: 'hover:bg-purple-500/20',
  },
];

export function CreateClientModeSelector({ onSelect }: CreateClientModeSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Jak chcete založit nového klienta?
      </p>
      
      <div className="grid grid-cols-3 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border border-border transition-all duration-200",
                "hover:border-primary/50 hover:shadow-md",
                mode.bgColor,
                mode.hoverColor,
                "group"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                "bg-background/50 group-hover:scale-110 transition-transform"
              )}>
                <Icon className={cn("w-6 h-6", mode.color)} />
              </div>
              <span className="font-medium text-sm text-foreground">{mode.title}</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">
                {mode.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ModeSelectorHeaderProps {
  mode: CreateClientMode;
  onBack: () => void;
}

export function ModeSelectorHeader({ mode, onBack }: ModeSelectorHeaderProps) {
  const modeLabels: Record<CreateClientMode, string> = {
    select: 'Nový klient',
    basic: 'Rychlé vytvoření',
    send_invite: 'Poslat pre-diagnostiku',
    trainer_fill: 'Trenérská pre-diagnostika',
  };

  if (mode === 'select') {
    return null;
  }

  return (
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{modeLabels[mode]}</span>
    </button>
  );
}
