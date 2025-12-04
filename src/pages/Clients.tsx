import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, ChevronRight, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { mockClients } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const allGoals = [...new Set(mockClients.flatMap(c => c.trainingGoals))];

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.notes.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGoal = !selectedGoal || client.trainingGoals.includes(selectedGoal);

    return matchesSearch && matchesGoal;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Klienti
          </h1>
          <p className="text-muted-foreground mt-1">
            {mockClients.length} aktivních klientů
          </p>
        </div>

        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nový klient
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat klienty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedGoal === null ? 'default' : 'outline'}
            onClick={() => setSelectedGoal(null)}
            className="rounded-xl"
          >
            Všichni
          </Button>
          {allGoals.slice(0, 3).map((goal) => (
            <Button
              key={goal}
              variant={selectedGoal === goal ? 'default' : 'outline'}
              onClick={() => setSelectedGoal(goal)}
              className="rounded-xl"
            >
              {goal}
            </Button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClients.map((client, index) => (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:glow group animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <ClientAvatar name={client.name} size="lg" />
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                  {client.name}
                </h3>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {client.trainingGoals.slice(0, 2).map((goal) => (
                    <span
                      key={goal}
                      className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                    >
                      {goal}
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                </div>

                {client.healthRestrictions && (
                  <p className="mt-3 text-sm text-warning/80 line-clamp-1">
                    ⚠️ {client.healthRestrictions}
                  </p>
                )}
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Žádní klienti nenalezeni
          </h3>
          <p className="text-muted-foreground mt-1">
            Zkuste upravit vyhledávání nebo filtry
          </p>
        </div>
      )}
    </div>
  );
}
