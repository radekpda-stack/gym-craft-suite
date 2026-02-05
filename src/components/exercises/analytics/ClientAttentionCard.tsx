 import { AnalyticsCard } from './AnalyticsCard';
 import { Users, AlertCircle, ChevronRight, TrendingDown, Trophy, Scale } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
 import { useNavigate } from 'react-router-dom';
 
 export type AttentionReason = 'no_pr' | 'declining_frequency' | 'high_asymmetry';
 
 export interface ClientNeedingAttention {
   clientId: string;
   clientName: string;
   reasons: AttentionReason[];
   priority: 'high' | 'medium' | 'low';
 }
 
 interface ClientAttentionCardProps {
   data: ClientNeedingAttention[];
   isLoading?: boolean;
 }
 
 const HELP_CONTENT = {
   title: 'Klienti vyžadující pozornost',
   description: 'Seznam klientů s indikátory, které vyžadují pozornost trenéra.',
   calculation: 'Kritéria: žádné PR za 30 dní, klesající frekvence, vysoká asymetrie (>20%)',
 };
 
 const REASON_CONFIG: Record<AttentionReason, { icon: typeof Trophy; label: string; color: string }> = {
   no_pr: { icon: Trophy, label: 'Žádné PR', color: 'text-warning' },
   declining_frequency: { icon: TrendingDown, label: 'Klesá frekvence', color: 'text-destructive' },
   high_asymmetry: { icon: Scale, label: 'Asymetrie', color: 'text-orange-500' },
 };
 
 const PRIORITY_CONFIG = {
   high: { badge: 'destructive' as const, label: 'Vysoká' },
   medium: { badge: 'warning' as const, label: 'Střední' },
   low: { badge: 'secondary' as const, label: 'Nízká' },
 };
 
 export function ClientAttentionCard({ data, isLoading }: ClientAttentionCardProps) {
   const navigate = useNavigate();
   const isEmpty = !data || data.length === 0;
 
   const handleClientClick = (clientId: string) => {
     navigate(`/clients/${clientId}`);
   };
 
   // Sort by priority
   const sortedData = [...data].sort((a, b) => {
     const priorityOrder = { high: 0, medium: 1, low: 2 };
     return priorityOrder[a.priority] - priorityOrder[b.priority];
   });
 
   const highPriorityCount = data.filter(d => d.priority === 'high').length;
 
   return (
     <AnalyticsCard
       title="Vyžadují pozornost"
       icon={Users}
       helpContent={HELP_CONTENT}
       isLoading={isLoading}
       isEmpty={isEmpty}
       emptyMessage="Všichni klienti jsou na dobré cestě! ✨"
       className="col-span-1 lg:col-span-2"
     >
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
         {sortedData.slice(0, 6).map((client) => (
           <button
             key={client.clientId}
             onClick={() => handleClientClick(client.clientId)}
             className={cn(
               "flex items-start gap-2 p-2.5 rounded-lg text-left",
               "bg-muted/30 hover:bg-muted/50 transition-colors",
               "group cursor-pointer",
               client.priority === 'high' && "border border-destructive/20 bg-destructive/5"
             )}
           >
             <div className={cn(
               "p-1.5 rounded-full shrink-0",
               client.priority === 'high' ? "bg-destructive/10" : "bg-muted"
             )}>
               <AlertCircle className={cn(
                 "w-3.5 h-3.5",
                 client.priority === 'high' ? "text-destructive" : "text-muted-foreground"
               )} />
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-1.5 mb-1">
                 <p className="text-xs font-medium truncate">{client.clientName}</p>
                 <Badge 
                   variant={PRIORITY_CONFIG[client.priority].badge} 
                   className="text-[8px] px-1 py-0"
                 >
                   {PRIORITY_CONFIG[client.priority].label}
                 </Badge>
               </div>
               <div className="flex flex-wrap gap-1">
                 {client.reasons.map((reason) => {
                   const config = REASON_CONFIG[reason];
                   const Icon = config.icon;
                   return (
                     <span 
                       key={reason} 
                       className={cn("inline-flex items-center gap-0.5 text-[9px]", config.color)}
                     >
                       <Icon className="w-2.5 h-2.5" />
                       {config.label}
                     </span>
                   );
                 })}
               </div>
             </div>
             <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
           </button>
         ))}
       </div>
       {data.length > 0 && (
         <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
           <span>{data.length} klientů vyžaduje pozornost</span>
           {highPriorityCount > 0 && (
             <Badge variant="destructive" className="text-[9px]">
               {highPriorityCount} vysoká priorita
             </Badge>
           )}
         </div>
       )}
     </AnalyticsCard>
   );
 }