 import { AnalyticsCard } from './AnalyticsCard';
 import { Archive, Clock, ChevronRight } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
 import { useNavigate } from 'react-router-dom';
 
 export interface UnusedExercise {
   id: string;
   name: string;
   lastUsedDate: string | null;
   daysSinceUse: number;
 }
 
 interface UnusedExercisesCardProps {
   data: UnusedExercise[];
   totalExercises?: number;
   isLoading?: boolean;
 }
 
 const HELP_CONTENT = {
   title: 'Nepoužívané cviky',
   description: 'Cviky z knihovny, které nebyly použity v posledních 30 dnech.',
   calculation: 'Porovnání knihovny cviků s aktivními záznamy za období',
 };
 
 function formatDaysAgo(days: number): string {
   if (days === 0) return 'dnes';
   if (days === 1) return 'včera';
   if (days < 7) return `před ${days} dny`;
   if (days < 30) return `před ${Math.floor(days / 7)} týdny`;
   if (days < 365) return `před ${Math.floor(days / 30)} měsíci`;
   return 'více než rok';
 }
 
 export function UnusedExercisesCard({ data, totalExercises, isLoading }: UnusedExercisesCardProps) {
   const navigate = useNavigate();
   const isEmpty = !data || data.length === 0;
 
   const handleExerciseClick = (exerciseId: string) => {
     navigate(`/performance/${exerciseId}`);
   };
 
   // Sort by days since use (longest unused first)
   const sortedData = [...data].sort((a, b) => b.daysSinceUse - a.daysSinceUse);
   
   const usageRate = totalExercises && totalExercises > 0 
     ? Math.round(((totalExercises - data.length) / totalExercises) * 100) 
     : null;
 
   return (
     <AnalyticsCard
       title="Nepoužívané cviky"
       icon={Archive}
       helpContent={HELP_CONTENT}
       isLoading={isLoading}
       isEmpty={isEmpty}
       emptyMessage="Všechny cviky jsou aktivně využívány! 💪"
     >
       <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
         {sortedData.slice(0, 5).map((item) => (
           <button
             key={item.id}
             onClick={() => handleExerciseClick(item.id)}
             className={cn(
               "w-full flex items-center gap-2 p-2 rounded-lg text-left",
               "bg-muted/30 hover:bg-muted/50 transition-colors",
               "group cursor-pointer"
             )}
           >
             <div className="p-1.5 rounded-full bg-muted shrink-0">
               <Clock className="w-3 h-3 text-muted-foreground" />
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-xs font-medium truncate">{item.name}</p>
               <p className="text-[10px] text-muted-foreground">
                 {item.lastUsedDate ? formatDaysAgo(item.daysSinceUse) : 'nikdy nepoužito'}
               </p>
             </div>
             <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
           </button>
         ))}
       </div>
       <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
         <span>
           {data.length} z {totalExercises || '?'} cviků nepoužito
         </span>
         {usageRate !== null && (
           <Badge variant={usageRate >= 70 ? 'success' : usageRate >= 40 ? 'warning' : 'destructive'} className="text-[9px]">
             {usageRate}% využití
           </Badge>
         )}
       </div>
     </AnalyticsCard>
   );
 }