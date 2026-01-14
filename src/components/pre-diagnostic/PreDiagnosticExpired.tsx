import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function PreDiagnosticExpired() {
  return (
    <div className="public-page flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="public-card max-w-md w-full overflow-hidden">
          <CardContent className="pt-0 pb-8">
            {/* Hero area */}
            <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-br from-warning/10 via-warning/5 to-background py-8 px-6 text-center">
              <motion.div 
                className="text-6xl mb-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                ⏰
              </motion.div>
              <motion.h1 
                className="text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Platnost vypršela
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-4"
            >
              <p className="text-muted-foreground">
                Tento odkaz již bohužel není platný.
              </p>
              
              <div className="p-4 rounded-xl bg-secondary/50 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📱</span>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Co teď?</p>
                    <p className="text-muted-foreground">
                      Kontaktuj svého trenéra a požádej ho o nový odkaz na dotazník.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
