import { Wallet, Dumbbell, ShoppingBag, TrendingUp } from 'lucide-react';
import { KPIDetailModal } from './KPIDetailModal';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface IncomeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData;
}

export function IncomeDetailModal({ open, onOpenChange, stats }: IncomeDetailModalProps) {
  const { language } = useLanguage();

  const modalStats = [
    {
      label: language === 'cs' ? 'Z tréninků' : 'From trainings',
      value: formatCurrency(stats.trainingIncome),
    },
    {
      label: language === 'cs' ? 'Z produktů' : 'From products',
      value: formatCurrency(stats.productIncome),
    },
    {
      label: language === 'cs' ? 'Ø měsíčně' : 'Avg monthly',
      value: formatCurrency(stats.avgMonthlyIncome),
    },
    {
      label: language === 'cs' ? 'Prodejů produktů' : 'Product sales',
      value: stats.topProducts.reduce((sum, p) => sum + p.count, 0),
    },
  ];

  const pieData = [
    { name: language === 'cs' ? 'Tréninky' : 'Trainings', value: stats.trainingIncome, color: 'hsl(var(--primary))' },
    { name: language === 'cs' ? 'Produkty' : 'Products', value: stats.productIncome, color: 'hsl(142, 76%, 36%)' },
  ].filter(d => d.value > 0);

  return (
    <KPIDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={language === 'cs' ? 'Detail příjmů' : 'Income Detail'}
      icon={<Wallet className="w-5 h-5" />}
      mainValue={formatCurrency(stats.totalIncome)}
      mainLabel={language === 'cs' ? 'celkový příjem' : 'total income'}
      stats={modalStats}
    >
      {/* Pie chart */}
      {pieData.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">
            {language === 'cs' ? 'Rozdělení příjmů' : 'Income breakdown'}
          </p>
          <div className="h-32 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top products */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="w-4 h-4 text-purple-500" />
          <p className="text-sm font-medium">
            {language === 'cs' ? 'TOP 5 produktů' : 'TOP 5 products'}
          </p>
        </div>
        <div className="space-y-1.5">
          {stats.topProducts.slice(0, 5).map((product, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-500 text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <span className="truncate">{product.name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{product.count}×</span>
                <span className="text-xs">({formatCurrency(product.revenue)})</span>
              </div>
            </div>
          ))}
          {stats.topProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>
      </div>
    </KPIDetailModal>
  );
}
