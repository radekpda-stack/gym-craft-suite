import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Mail, LogOut } from 'lucide-react';

export default function WaitingForApproval() {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2 border-border shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-xl">Účet čeká na schválení</CardTitle>
          <CardDescription className="text-base mt-2">
            Vaše registrace byla přijata a čeká na schválení administrátorem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              <strong>E-mail účtu:</strong> {user?.email}
            </p>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Mail className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Potřebujete pomoc?</p>
              <p className="text-muted-foreground mt-1">
                Kontaktujte nás na{' '}
                <a 
                  href="mailto:support@justmove.cz" 
                  className="text-primary hover:underline"
                >
                  support@justmove.cz
                </a>
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Odhlásit se
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
