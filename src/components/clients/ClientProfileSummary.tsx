import { useState } from 'react';
import { 
  Phone, 
  Mail, 
  Target, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { ClientTagsManager } from '@/components/clients/ClientTagsManager';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface ClientProfileSummaryProps {
  client: Client;
  onEditClick: () => void;
}

export function ClientProfileSummary({ client, onEditClick }: ClientProfileSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasGoals = client.training_goals && client.training_goals.length > 0;
  const hasRestrictions = client.health_restrictions && client.health_restrictions.trim().length > 0;
  const hasContact = client.email || client.phone;

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Always visible section */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <ClientAvatar name={client.name} size="md" className="shrink-0" />
          
          {/* Main info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Contact icons */}
            {hasContact && (
              <div className="flex items-center gap-3 flex-wrap">
                {client.email && (
                  <a 
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="truncate max-w-[150px] sm:max-w-none">{client.email}</span>
                  </a>
                )}
                {client.phone && (
                  <a 
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </a>
                )}
              </div>
            )}

            {/* Training Goals */}
            {hasGoals && (
              <div className="flex items-center gap-2 flex-wrap">
                <Target className="w-4 h-4 text-primary shrink-0" />
                <div className="flex gap-1.5 flex-wrap">
                  {client.training_goals!.slice(0, 3).map((goal, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {goal}
                    </Badge>
                  ))}
                  {client.training_goals!.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{client.training_goals!.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Health Restrictions Warning */}
            {hasRestrictions && (
              <div className="flex items-start gap-2 text-warning">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-sm line-clamp-1">{client.health_restrictions}</p>
              </div>
            )}

            {/* Tags */}
            <ClientTagsManager clientId={client.id} />
          </div>

          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={onEditClick}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expandable section toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors border-t border-border/50"
      >
        <span>{isExpanded ? 'Skrýt detaily' : 'Zobrazit více'}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-border/50">
          {/* Notes preview */}
          {client.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Poznámky</p>
              <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">
                {client.notes}
              </p>
            </div>
          )}

          {/* Full health restrictions */}
          {hasRestrictions && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Zdravotní omezení</p>
              <p className="text-sm text-warning whitespace-pre-wrap">
                {client.health_restrictions}
              </p>
            </div>
          )}

          {/* All training goals */}
          {hasGoals && client.training_goals!.length > 3 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Všechny cíle</p>
              <div className="flex gap-1.5 flex-wrap">
                {client.training_goals!.map((goal, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
