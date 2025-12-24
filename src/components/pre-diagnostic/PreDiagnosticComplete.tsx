import { CheckCircle2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PreDiagnosticComplete() {
  const handleClose = () => {
    // Try to close the window/tab
    window.close();
    // If that doesn't work (browsers block this), just show a message
  };

  return (
    <div className="public-page flex items-center justify-center p-4">
      <Card className="public-card max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-xl font-bold mb-4">Hotovo</h1>
          
          <p className="text-muted-foreground mb-2">
            Děkujeme.
          </p>
          
          <p className="text-muted-foreground mb-8">
            Trenér má nyní všechny potřebné informace pro provedení diagnostiky.
          </p>

          <Button 
            variant="outline" 
            onClick={handleClose}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Zavřít
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
