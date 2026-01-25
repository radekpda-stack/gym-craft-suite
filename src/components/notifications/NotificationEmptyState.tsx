import { Bell, Sparkles, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fadeInUp } from '@/lib/animations';

interface NotificationEmptyStateProps {
  onOpenSettings?: () => void;
}

export function NotificationEmptyState({ onOpenSettings }: NotificationEmptyStateProps) {
  const tips = [
    {
      icon: '🎂',
      title: 'Narozeniny klientů',
      description: 'Zapni upozornění na narozeniny a nikdy nezapomeň popřát!',
    },
    {
      icon: '💰',
      title: 'Nízký kredit',
      description: 'Buď informován, když klient potřebuje dobít kredit.',
    },
    {
      icon: '🏆',
      title: 'Osobní rekordy',
      description: 'Sleduj pokroky klientů a oslavuj jejich úspěchy.',
    },
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <motion.div 
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
          <Bell className="w-10 h-10 text-success opacity-60" />
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center"
        >
          <Sparkles className="w-4 h-4 text-success-foreground" />
        </motion.div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">
        Vše je vyřízeno! 🎉
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[250px]">
        Žádné nové notifikace. Super práce!
      </p>

      <Card className="mt-6 p-4 bg-muted/30 border-dashed w-full max-w-xs">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{randomTip.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{randomTip.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {randomTip.description}
            </p>
          </div>
        </div>
        {onOpenSettings && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3 text-xs"
            onClick={onOpenSettings}
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Nastavit notifikace
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
