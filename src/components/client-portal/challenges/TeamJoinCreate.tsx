import { useState } from 'react';
import { Users, UserPlus, Copy, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface TeamJoinCreateProps {
  challengeId: string;
  minSize: number;
  maxSize: number;
  onCreateTeam: (teamName: string) => Promise<{ invite_code: string }>;
  onJoinTeam: (inviteCode: string) => Promise<void>;
  isLoading?: boolean;
}

export function TeamJoinCreate({
  challengeId,
  minSize,
  maxSize,
  onCreateTeam,
  onJoinTeam,
  isLoading,
}: TeamJoinCreateProps) {
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim()) {
      toast.error('Zadejte název týmu');
      return;
    }
    
    setCreating(true);
    try {
      const result = await onCreateTeam(teamName.trim());
      setCreatedCode(result.invite_code);
      toast.success('Tým vytvořen!');
    } catch (error) {
      toast.error('Nepodařilo se vytvořit tým');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Zadejte kód pozvánky');
      return;
    }
    
    setJoining(true);
    try {
      await onJoinTeam(inviteCode.trim().toUpperCase());
      toast.success('Připojil(a) jsi se k týmu!');
    } catch (error) {
      toast.error('Nepodařilo se připojit k týmu');
    } finally {
      setJoining(false);
    }
  };

  const copyInviteCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setCopied(true);
      toast.success('Kód zkopírován!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-48" />
      </Card>
    );
  }

  if (createdCode) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tým vytvořen!
          </CardTitle>
          <CardDescription>
            Sdílej tento kód se spoluhráči, aby se mohli připojit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 p-4 bg-background rounded-lg border-2 border-dashed text-center">
              <span className="text-2xl font-mono font-bold tracking-widest">
                {createdCode}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyInviteCode}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Tým potřebuje {minSize}-{maxSize} členů pro účast ve výzvě
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Týmová výzva
        </CardTitle>
        <CardDescription>
          Tato výzva je týmová! Vytvoř si tým nebo se připoj k existujícímu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              <UserPlus className="h-4 w-4 mr-2" />
              Vytvořit tým
            </TabsTrigger>
            <TabsTrigger value="join">
              <Users className="h-4 w-4 mr-2" />
              Připojit se
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Název týmu</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="např. Fitness Warriors"
                maxLength={30}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Velikost týmu: {minSize}-{maxSize} členů
            </p>
            <Button 
              onClick={handleCreate} 
              disabled={creating || !teamName.trim()}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vytvářím...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Vytvořit tým
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="join" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Kód pozvánky</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="např. ABC123XY"
                maxLength={8}
                className="font-mono tracking-widest"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Požádej kapitána týmu o kód pozvánky
            </p>
            <Button 
              onClick={handleJoin} 
              disabled={joining || !inviteCode.trim()}
              className="w-full"
            >
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Připojuji...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Připojit se k týmu
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
