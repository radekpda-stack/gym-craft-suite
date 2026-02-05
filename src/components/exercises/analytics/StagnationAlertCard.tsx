 import { AnalyticsCard } from './AnalyticsCard';
 import { AlertTriangle, ChevronRight, User } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
 import { useNavigate } from 'react-router-dom';
 
 export interface StagnatingClient {
   clientId: string;
   clientName: string;
   exerciseName: string;
   weeksStagnant: number;
   lastValue: number;
 }
 
 interface StagnationAlertCardProps {
   data: StagnatingClient[];
   isLoading?: boolean;
 }
 
 const HELP_CONTENT = {
   title: 'Stagnace klientů',
   description: 'Seznam klientů a cviků, kde nedošlo k progresu (zvýšení váhy nebo opakování) po 3+ týdny.',
   calculation: 'Detekce stagnace na základě porovnání max hodnot za posledních 8 týdnů',
 };
 
 export function StagnationAlertCard({ data, isLoading }: StagnationAlertCardProps) {
   const navigate = useNavigate();
   const isEmpty = !data || data.length === 0;
 
   const handleClientClick = (clientId: string) => {
     navigate(`/clients/${clientId}?tab=progress`);
   };
 
   return (
     <AnalyticsCard
       title="Stagnace"
       icon={AlertTriangle}
       helpContent={HELP_CONTENT}
       isLoading={isLoading}
       isEmpty={isEmpty}
       emptyMessage="Žádná stagnace – všichni progresují! 🎉"
     >
       <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
         {data.slice(0, 5).map((item, idx) => (
           <button
             key={`${item.clientId}-${item.exerciseName}-${idx}`}
             onClick={() => handleClientClick(item.clientId)}
             className={cn(
               "w-full flex items-center gap-2 p-2 rounded-lg text-left",
               "bg-muted/30 hover:bg-muted/50 transition-colors",
               "group cursor-pointer"
             )}
           >
             <div className="p-1.5 rounded-full bg-warning/10 shrink-0">
               <User className="w-3 h-3 text-warning" />
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-xs font-medium truncate">{item.clientName}</p>
               <p className="text-[10px] text-muted-foreground truncate">{item.exerciseName}</p>
             </div>
             <Badge variant="warning" className="shrink-0 text-[9px]">
               {item.weeksStagnant}+ týdnů
             </Badge>
             <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
           </button>
         ))}
       </div>
       {data.length > 0 && (
         <p className="text-[10px] text-muted-foreground mt-2 text-center">
           {data.length} {data.length === 1 ? 'klient stagnuje' : data.length < 5 ? 'klienti stagnují' : 'klientů stagnuje'}
         </p>
       )}
     </AnalyticsCard>
   );
 }