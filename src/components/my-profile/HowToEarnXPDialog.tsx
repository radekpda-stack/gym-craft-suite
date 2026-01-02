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
  Zap
} from 'lucide-react';

interface HowToEarnXPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const XP_RULES = [
  {
    icon: Dumbbell,
    label: 'Dokončený trénink',
    xp: '20 XP',
    description: 'Za každý potvrzený trénink',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Flame,
    label: 'HIIT bonus',
    xp: '+10 XP',
    description: 'Za HIIT nebo kruhový trénink',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Sun,
    label: 'Ranní bonus',
    xp: '+5 XP',
    description: 'Za trénink před 9:00',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Calendar,
    label: 'Víkendový bonus',
    xp: '+5 XP',
    description: 'Za trénink o víkendu',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Link,
    label: 'Týdenní série',
    xp: '10-50 XP',
    description: '2+ tréninky = 10 XP, 4+ = 25 XP, 6+ = 50 XP',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Trophy,
    label: 'Osobní rekord',
    xp: '+15 XP',
    description: 'Za překonání osobního rekordu (max 3×/den)',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Award,
    label: 'Badge bonus',
    xp: '+5-50 XP',
    description: 'Za získání nového odznaku',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
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
