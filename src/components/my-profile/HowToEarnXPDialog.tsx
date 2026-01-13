import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Dumbbell, 
  Flame, 
  Sun, 
  Calendar, 
  Link, 
  Trophy, 
  Award,
  Zap,
  Apple,
  Droplets,
  Coffee
} from 'lucide-react';

interface HowToEarnXPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const XP_RULES = [
  // Tréninky
  {
    icon: Dumbbell,
    label: 'Dokončený trénink',
    xp: '30 XP',
    description: 'Za každý potvrzený trénink',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: Flame,
    label: 'Bonus za typ tréninku',
    xp: '+6–15 XP',
    description: 'HIIT +15, Silový/Kondiční +12, Cardio +10',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    icon: Sun,
    label: 'Ranní bonus',
    xp: '+8 XP',
    description: 'Za trénink před 9:00',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    icon: Calendar,
    label: 'Víkendový bonus',
    xp: '+8 XP',
    description: 'Za trénink v sobotu nebo neděli',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Link,
    label: 'Týdenní série',
    xp: '20–70 XP',
    description: '3 tréninky = 20 XP, 5 = 40 XP, 8 = 70 XP',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    icon: Trophy,
    label: 'Osobní rekord',
    xp: '+25 XP',
    description: 'Za překonání osobního rekordu (max 2×/den)',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    icon: Award,
    label: 'Nový odznak',
    xp: '+10–150 XP',
    description: 'Bonus závisí na vzácnosti odznaku',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  // Nutriční deník
  {
    icon: Apple,
    label: 'Nutriční záznam',
    xp: '2 XP',
    description: 'Za každý záznam jídla, pití nebo kávy',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    icon: Droplets,
    label: 'Kompletní nutriční den',
    xp: '+10 XP',
    description: '3+ jídla a 500ml vody za den',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: Coffee,
    label: 'Nutriční streak',
    xp: '+3–20 XP',
    description: 'Bonus za pravidelné záznamy více dní v řadě',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

export function HowToEarnXPDialog({ open, onOpenChange }: HowToEarnXPDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Jak získávám XP?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {XP_RULES.map((rule) => (
            <div
              key={rule.label}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className={`w-10 h-10 rounded-lg ${rule.bgColor} flex items-center justify-center flex-shrink-0`}>
                <rule.icon className={`w-5 h-5 ${rule.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{rule.label}</p>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">
                    {rule.xp}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> Denní limit je 100 XP. 
            Kombinuj ranní a víkendové tréninky pro maximální zisk!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
