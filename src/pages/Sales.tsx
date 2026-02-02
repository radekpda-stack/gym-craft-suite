import { useState } from 'react';
import { CreditCard, Package, BarChart3, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesRegister } from '@/components/sales/SalesRegister';
import { StockManagement } from '@/components/sales/StockManagement';
import { SalesStatistics } from '@/components/sales/SalesStatistics';
import { SalesHistory } from '@/components/sales/SalesHistory';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';

const TABS = [
  { value: 'register', label: 'Pokladna', icon: CreditCard },
  { value: 'history', label: 'Historie', icon: History },
  { value: 'stock', label: 'Sklad', icon: Package },
  { value: 'stats', label: 'Statistiky', icon: BarChart3 },
];

export default function Sales() {
  usePageTracking('sales');
  const [activeTab, setActiveTab] = useState('register');

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-24 sm:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Prodej</h1>
        <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
          Pokladna, správa skladu a statistiky
        </p>
      </div>

      {/* Premium Floating Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto p-1.5 card-floating rounded-2xl mb-4 sm:mb-6 backdrop-blur-md">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative flex-1 gap-2 py-3 px-3 sm:px-4 rounded-xl transition-all",
                  "text-muted-foreground hover:text-foreground/80",
                  isActive && "text-primary-foreground bg-primary shadow-md"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-primary-foreground/20" : "bg-transparent"
                )}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="hidden xs:inline text-sm font-medium">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="register" className="mt-0">
          <SalesRegister />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <SalesHistory />
        </TabsContent>

        <TabsContent value="stock" className="mt-0">
          <StockManagement />
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <SalesStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
