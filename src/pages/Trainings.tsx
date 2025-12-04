import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Search, Plus, Filter, Dumbbell, Calendar, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockSessions, mockClients } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Trainings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredSessions = mockSessions.filter((session) => {
    const client = mockClients.find((c) => c.id === session.clientId);
    const matchesSearch =
      client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.notes.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    scheduled: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-success/10 text-success border-success/20',
    canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const statusLabels = {
    scheduled: 'Naplánováno',
    completed: 'Dokončeno',
    canceled: 'Zrušeno',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Tréninky
          </h1>
          <p className="text-muted-foreground mt-1">
            {mockSessions.length} tréninků celkem
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Šablony
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nový trénink
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat tréninky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
            className="rounded-xl"
          >
            Všechny
          </Button>
          {(['scheduled', 'completed', 'canceled'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className="rounded-xl"
            >
              {statusLabels[status]}
            </Button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.map((session, index) => {
          const client = mockClients.find((c) => c.id === session.clientId);

          return (
            <div
              key={session.id}
              className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] hover:glow cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {client?.name || 'Klient'}
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {session.notes}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(session.date, 'd. MMMM yyyy', { locale: cs })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(session.date, 'HH:mm', { locale: cs })}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{session.duration} min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="font-medium text-foreground">
                      {session.subjectiveRating}/10
                    </span>
                  </div>
                  <span
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border',
                      statusColors[session.status]
                    )}
                  >
                    {statusLabels[session.status]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Žádné tréninky nenalezeny
          </h3>
          <p className="text-muted-foreground mt-1">
            Zkuste upravit vyhledávání nebo filtry
          </p>
        </div>
      )}
    </div>
  );
}
