import { Link } from "react-router-dom";
import { Trophy, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TopClient } from "@/hooks/useTopClients";

interface TopClientsTableProps {
  clients: TopClient[];
  isLoading?: boolean;
}

export function TopClientsTable({ clients, isLoading }: TopClientsTableProps) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 md:p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-warning/10">
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Nejčastější klienti
          </h3>
        </div>
        <p className="text-center text-muted-foreground py-6 text-sm">
          Zatím nemáte žádné dokončené tréninky
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-warning/10">
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Nejčastější klienti
          </h3>
        </div>
        <Link to="/clients" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
          Vše
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-2">
        {clients.map((client, index) => (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-bold text-muted-foreground w-5">
                {index + 1}.
              </span>
              <ClientAvatar name={client.name} size="sm" />
              <span className="font-medium text-foreground text-sm md:text-base truncate">
                {client.name}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <p className="font-bold text-foreground text-sm md:text-base">
                  {client.trainingCount}
                </p>
                <p className="text-xs text-muted-foreground hidden md:block">
                  tréninků
                </p>
              </div>
              {client.lastTraining && (
                <div className="text-right hidden lg:block">
                  <p className="text-xs text-muted-foreground">Poslední</p>
                  <p className="text-sm text-foreground">
                    {format(new Date(client.lastTraining), "d. M. yyyy", { locale: cs })}
                  </p>
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
