 import { AnalyticsCard } from './AnalyticsCard';
 import { Layers, TrendingDown } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Badge } from '@/components/ui/badge';
 
 export interface MovementGap {
   pattern: string;
   label: string;
   usageCount: number;
   isUnderworked: boolean;
   totalCount: number;
 }
 
 interface MovementGapsCardProps {
   data: MovementGap[];
   isLoading?: boolean;
 }
 
 const HELP_CONTENT = {
   title: 'Pohybové vzorce',
   description: 'Vizualizace zastoupení pohybových vzorců v tréninku. Podtrénované vzorce jsou označeny.',
   calculation: 'Podtrénovaný = méně než 5% celkového objemu',
 };
 
 export function MovementGapsCard({ data, isLoading }: MovementGapsCardProps) {
   const isEmpty = !data || data.length === 0;
   
   // Find max for relative bar widths
   const maxCount = Math.max(...data.map(d => d.usageCount), 1);
   const totalCount = data[0]?.totalCount || 1;
   
   // Sort by usage count to show gaps at bottom
   const sortedData = [...data].sort((a, b) => b.usageCount - a.usageCount);
   const underworkedCount = data.filter(d => d.isUnderworked).length;
 
   return (
     <AnalyticsCard
       title="Pohybové vzorce"
       icon={Layers}
       helpContent={HELP_CONTENT}
       isLoading={isLoading}
       isEmpty={isEmpty}
       emptyMessage="Žádná data o pohybových vzorcích"
     >
       <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
         {sortedData.slice(0, 7).map((item) => {
           const percentage = Math.round((item.usageCount / totalCount) * 100);
           const barWidth = Math.max((item.usageCount / maxCount) * 100, 2);
           
           return (
             <div
               key={item.pattern}
               className={cn(
                 "flex items-center gap-2 p-1.5 rounded-md",
                 item.isUnderworked && "bg-destructive/5"
               )}
             >
               <span className={cn(
                 "text-[10px] w-20 truncate",
                 item.isUnderworked ? "text-destructive font-medium" : "text-muted-foreground"
               )}>
                 {item.label}
               </span>
               <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                 <div
                   className={cn(
                     "h-full rounded-full transition-all",
                     item.isUnderworked ? "bg-destructive/60" : "bg-primary/60"
                   )}
                   style={{ width: `${barWidth}%` }}
                 />
               </div>
               <span className={cn(
                 "text-[10px] tabular-nums w-8 text-right",
                 item.isUnderworked ? "text-destructive" : "text-muted-foreground"
               )}>
                 {item.usageCount}×
               </span>
               {item.isUnderworked && (
                 <TrendingDown className="w-3 h-3 text-destructive shrink-0" />
               )}
             </div>
           );
         })}
       </div>
       {underworkedCount > 0 && (
         <div className="flex items-center gap-1.5 mt-2">
           <Badge variant="destructive" className="text-[9px]">
             {underworkedCount} podtrénovaných
           </Badge>
           <span className="text-[10px] text-muted-foreground">vzorců</span>
         </div>
       )}
     </AnalyticsCard>
   );
 }