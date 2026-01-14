import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function PreDiagnosticComplete() {
  const handleClose = () => {
    // Try to close the window/tab
    window.close();
    // If that doesn't work (browsers block this), just show a message
  };

  return (
    <div className="public-page flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="public-card max-w-md w-full overflow-hidden">
          <CardContent className="pt-0 pb-8">
            {/* Hero area */}
            <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background py-8 px-6 text-center">
              <motion.div 
                className="text-6xl mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                🎉
              </motion.div>
              <motion.h1 
                className="text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Hotovo!
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4 text-center"
            >
              <p className="text-lg">
                Děkuju za vyplnění! 🙏
              </p>
              
              <p className="text-muted-foreground">
                Mám teď všechny potřebné informace a můžu ti připravit trénink na míru.
              </p>

              <div className="p-4 rounded-xl bg-secondary/50 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Co bude dál?</p>
                    <p>Trenér si projde tvé odpovědi a připraví diagnostiku. Brzy se ozve s dalšími kroky.</p>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={handleClose}
                className="gap-2 mt-4"
              >
                <X className="w-4 h-4" />
                Zavřít okno
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
