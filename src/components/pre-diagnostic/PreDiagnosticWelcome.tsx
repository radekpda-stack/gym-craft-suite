import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
  clientName?: string;
}

export function PreDiagnosticWelcome({ onStart, clientName }: Props) {
  return (
    <div className="public-page flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="public-card max-w-md w-full overflow-hidden">
          <CardContent className="pt-0 pb-8">
            {/* Hero illustration area */}
            <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background py-8 px-6">
              <motion.div 
                className="text-6xl text-center mb-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                🏃‍♂️
              </motion.div>
              <motion.h1 
                className="text-2xl font-bold text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {clientName ? `Ahoj, ${clientName}! 👋` : 'Ahoj! 👋'}
              </motion.h1>
            </div>

            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-lg font-semibold text-center">
                Dotazník před tréninkem
              </h2>
              
              <p className="text-muted-foreground text-center">
                Abych tě mohl lépe poznat a připravit trénink šitý na míru, potřebuji od tebe pár informací.
              </p>

              {/* What we'll cover */}
              <div className="space-y-2 py-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <span className="text-xl">📋</span>
                  <span className="text-sm">Tvůj typický den a životní styl</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <span className="text-xl">💪</span>
                  <span className="text-sm">Aktuální pohyb a aktivity</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <span className="text-xl">🩺</span>
                  <span className="text-sm">Zdraví a případná omezení</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <span className="text-xl">🎯</span>
                  <span className="text-sm">Tvé cíle a očekávání</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>⏱️</span>
                <span>Zabere ti to asi 3–5 minut</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
            >
              <Button 
                onClick={onStart} 
                className="w-full"
                size="lg"
              >
                Jdeme na to! 🚀
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
