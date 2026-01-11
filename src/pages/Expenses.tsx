import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Wallet, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useExpenseStats } from '@/hooks/useExpenseStats';
import { useBusinessExpenses } from '@/hooks/useBusinessExpenses';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExpenseCategoryChart } from '@/components/expenses/ExpenseCategoryChart';
import { ExpenseTrendChart } from '@/components/expenses/ExpenseTrendChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
}

export default function Expenses() {
  usePageTracking('expenses');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useExpenseStats();
  const { data: expenses, isLoading: expensesLoading } = useBusinessExpenses();

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/statistics">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Náklady a provoz</h1>
              <p className="text-sm text-muted-foreground">
                Sleduj své provozní náklady
              </p>
            </div>
          </div>
          
          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Přidat náklad
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Nový náklad</SheetTitle>
              </SheetHeader>
              <ExpenseForm onSuccess={() => setIsFormOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Tento měsíc</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-bold">
                  {formatCurrency(stats?.totalThisMonth || 0)}
                </div>
              )}
              {stats && stats.monthlyChange !== 0 && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${stats.monthlyChange > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {stats.monthlyChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(stats.monthlyChange)}% vs minulý měsíc
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Receipt className="h-4 w-4" />
                <span className="text-xs">Minulý měsíc</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-bold">
                  {formatCurrency(stats?.totalLastMonth || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Letos celkem</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-bold">
                  {formatCurrency(stats?.totalThisYear || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Měsíční průměr</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-bold">
                  {formatCurrency(stats?.yearlyAverage || 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Seznam</TabsTrigger>
            <TabsTrigger value="category">Kategorie</TabsTrigger>
            <TabsTrigger value="trend">Trend</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ExpenseList 
              expenses={expenses || []} 
              isLoading={expensesLoading} 
            />
          </TabsContent>

          <TabsContent value="category">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Náklady podle kategorií</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ExpenseCategoryChart data={stats?.byCategory || []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vývoj nákladů</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ExpenseTrendChart data={stats?.monthlyTrend || []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
