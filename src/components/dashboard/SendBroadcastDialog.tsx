import { useState } from 'react';
import { Send, Users, User, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useClients, Client } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SendBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RecipientMode = 'all' | 'active' | 'selected';

export function SendBroadcastDialog({ open, onOpenChange }: SendBroadcastDialogProps) {
  const { user } = useAuth();
  const { data: allClients = [] } = useClients();
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('active');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  
  // Filter clients that have portal accounts (not archived)
  const clientsWithPortal = allClients.filter(c => !c.is_archived);
  const activeClients = clientsWithPortal.filter(c => !c.is_archived);
  
  const getRecipientClients = (): Client[] => {
    switch (recipientMode) {
      case 'all':
        return clientsWithPortal;
      case 'active':
        return activeClients;
      case 'selected':
        return clientsWithPortal.filter(c => selectedClientIds.has(c.id));
      default:
        return [];
    }
  };
  
  const recipientCount = getRecipientClients().length;
  
  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };
  
  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Zadej titulek zprávy');
      return;
    }
    
    const recipients = getRecipientClients();
    if (recipients.length === 0) {
      toast.error('Vyber alespoň jednoho příjemce');
      return;
    }
    
    setIsSending(true);
    
    try {
      // Create notifications for each recipient
      const notifications = recipients.map(client => ({
        client_id: client.id,
        type: 'broadcast',
        title: title.trim(),
        message: message.trim() || null,
        action_url: actionUrl.trim() || null,
        is_read: false,
        action_completed: false,
        metadata: {
          sent_by: user?.id,
          sent_at: new Date().toISOString(),
        },
      }));
      
      const { error } = await supabase
        .from('client_portal_notifications')
        .insert(notifications);
      
      if (error) throw error;
      
      toast.success(`Zpráva odeslána ${recipients.length} klientům`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setActionUrl('');
      setSelectedClientIds(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Nepodařilo se odeslat zprávu');
    } finally {
      setIsSending(false);
    }
  };
  
  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Poslat zprávu klientům
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titulek *</Label>
            <Input
              id="title"
              placeholder="Např. Nový ceník od ledna"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSending}
            />
          </div>
          
          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Zpráva</Label>
            <Textarea
              id="message"
              placeholder="Podrobnosti zprávy..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={isSending}
            />
          </div>
          
          {/* Action URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="actionUrl">Odkaz (volitelné)</Label>
            <Input
              id="actionUrl"
              type="url"
              placeholder="https://..."
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Např. odkaz na nový ceník nebo dokument
            </p>
          </div>
          
          {/* Recipients */}
          <div className="space-y-3">
            <Label>Příjemci</Label>
            <RadioGroup
              value={recipientMode}
              onValueChange={(v) => setRecipientMode(v as RecipientMode)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>Aktivní klienti</span>
                    <Badge variant="secondary" className="ml-auto">
                      {activeClients.length}
                    </Badge>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Všichni klienti</span>
                    <Badge variant="secondary" className="ml-auto">
                      {clientsWithPortal.length}
                    </Badge>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Vybrat konkrétní</span>
                    {selectedClientIds.size > 0 && (
                      <Badge variant="default" className="ml-auto">
                        {selectedClientIds.size}
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>
            </RadioGroup>
            
            {/* Client selection list */}
            {recipientMode === 'selected' && (
              <ScrollArea className="h-48 rounded-lg border p-2">
                <div className="space-y-1">
                  {clientsWithPortal.map(client => (
                    <div
                      key={client.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        selectedClientIds.has(client.id) 
                          ? "bg-primary/10" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleClient(client.id)}
                    >
                      <Checkbox
                        checked={selectedClientIds.has(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <span className="text-sm">{client.name}</span>
                    </div>
                  ))}
                  {clientsWithPortal.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Žádní klienti
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Zrušit
          </Button>
          <Button onClick={handleSend} disabled={isSending || recipientCount === 0}>
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Odesílám...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Odeslat ({recipientCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
