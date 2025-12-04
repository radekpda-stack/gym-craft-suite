import { useState } from 'react';
import { Search, Plus, Filter, Dumbbell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockExercises } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Exercises() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(mockExercises.map((e) => e.category))];

  const filteredExercises = mockExercises.filter((exercise) => {
    const matchesSearch =
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || exercise.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = [];
    }
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, typeof mockExercises>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Knihovna cviků
          </h1>
          <p className="text-muted-foreground mt-1">
            {mockExercises.length} cviků v knihovně
          </p>
        </div>

        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nový cvik
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat cviky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            className="rounded-xl"
          >
            Všechny
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className="rounded-xl"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="space-y-8">
        {Object.entries(groupedExercises).map(([category, exercises]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="glass rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:glow cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {exercise.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {exercise.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {exercise.muscleGroups.slice(0, 3).map((muscle) => (
                          <span
                            key={muscle}
                            className="px-2 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Žádné cviky nenalezeny
          </h3>
          <p className="text-muted-foreground mt-1">
            Zkuste upravit vyhledávání nebo filtry
          </p>
        </div>
      )}
    </div>
  );
}
