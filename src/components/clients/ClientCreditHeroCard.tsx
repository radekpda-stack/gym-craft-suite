 /**
  * ClientCreditHeroCard Component
  * 
  * Dominant hero section for credit balance and recent transactions.
  * Designed as "Credit-First" approach - immediately visible without navigation.
  */
 import { useMemo } from 'react';
 import { useSearchParams } from 'react-router-dom';
 import { 
   Wallet, 
   Plus, 
   CreditCard, 
   Dumbbell, 
   Package, 
   Wrench, 
   Users, 
   ArrowRight,
   TrendingUp,
   TrendingDown,
   AlertTriangle,
   RefreshCw,
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 import { formatCurrency, formatDate } from '@/lib/formatters';
 import { motion } from 'framer-motion';
 
 interface Transaction {
   id: string;
   created_at: string;
   amount: number;
   type: string;
   description?: string | null;
   training_session_id?: string | null;
   product_id?: string | null;
 }
 
 interface ClientCreditHeroCardProps {
   creditBalance: number;
   isSharedBudget: boolean;
   budgetGroupName?: string | null;
   transactions: Transaction[];
   unpaidCount?: number;
   unpaidAmount?: number;
   paymentMode?: string | null;
   isLoading?: boolean;
   onAddCredit: () => void;
 }
 
 type TransactionType = 'payment' | 'training' | 'product' | 'refund' | 'manual';
 
 function getTransactionType(type: string): TransactionType {
   switch (type) {
     case 'payment':
     case 'topup':
     case 'cash':
     case 'transfer':
     case 'package':
       return 'payment';
     case 'training':
     case 'deduction':
       return 'training';
     case 'product':
       return 'product';
     case 'refund':
     case 'canceled_training':
       return 'refund';
     default:
       return 'manual';
   }
 }
 
 function getTypeIcon(type: TransactionType) {
   switch (type) {
     case 'payment':
       return <CreditCard className="w-3.5 h-3.5" />;
     case 'training':
       return <Dumbbell className="w-3.5 h-3.5" />;
     case 'product':
       return <Package className="w-3.5 h-3.5" />;
     case 'refund':
       return <RefreshCw className="w-3.5 h-3.5" />;
     default:
       return <Wrench className="w-3.5 h-3.5" />;
   }
 }
 
 function getTypeLabel(type: TransactionType, description?: string | null): string {
   if (description) return description;
   switch (type) {
     case 'payment':
       return 'Dobití kreditu';
     case 'training':
       return 'Trénink';
     case 'product':
       return 'Nákup produktu';
     case 'refund':
       return 'Refundace';
     default:
       return 'Korekce';
   }
 }
 
 export function ClientCreditHeroCard({
   creditBalance,
   isSharedBudget,
   budgetGroupName,
   transactions,
   unpaidCount = 0,
   unpaidAmount = 0,
   paymentMode,
   isLoading = false,
   onAddCredit,
 }: ClientCreditHeroCardProps) {
   const [, setSearchParams] = useSearchParams();
   
   const isCashOnly = paymentMode === 'cash_only';
   const hasDebt = unpaidCount > 0;
   
   // Get last 5 transactions
   const recentTransactions = useMemo(() => {
     return [...transactions]
       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 5);
   }, [transactions]);
   
   // Credit status colors
   const getBalanceStatus = () => {
     if (hasDebt || creditBalance < 0) return 'critical';
     if (creditBalance < 500) return 'warning';
     if (creditBalance < 2000) return 'ok';
     return 'excellent';
   };
   
   const status = getBalanceStatus();
   
   const statusStyles = {
     excellent: {
       border: 'border-success/40',
       text: 'text-success',
       bg: 'bg-success/5',
       glow: 'shadow-success/20',
     },
     ok: {
       border: 'border-success/30',
       text: 'text-success',
       bg: 'bg-success/5',
       glow: 'shadow-success/10',
     },
     warning: {
       border: 'border-warning/40',
       text: 'text-warning',
       bg: 'bg-warning/5',
       glow: 'shadow-warning/20',
     },
     critical: {
       border: 'border-destructive/40',
       text: 'text-destructive',
       bg: 'bg-destructive/5',
       glow: 'shadow-destructive/20',
     },
   };
   
   const currentStyle = statusStyles[status];
   
   const navigateToFinance = () => {
     setSearchParams({ tab: 'finance' });
   };
   
   if (isLoading) {
     return (
       <div className="rounded-2xl border-2 border-border/50 bg-card/80 backdrop-blur-lg p-4 sm:p-6">
         <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
           <div className="sm:w-1/3 space-y-3">
             <Skeleton className="h-4 w-20" />
             <Skeleton className="h-12 w-32" />
             <Skeleton className="h-9 w-full" />
           </div>
           <div className="sm:w-2/3 space-y-2">
             <Skeleton className="h-4 w-32" />
             {[1, 2, 3].map(i => (
               <Skeleton key={i} className="h-10 w-full" />
             ))}
           </div>
         </div>
       </div>
     );
   }
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.3 }}
       className={cn(
         'rounded-2xl border-2 bg-card/80 backdrop-blur-lg p-4 sm:p-6 transition-all duration-300',
         'shadow-lg hover:shadow-xl',
         currentStyle.border,
         currentStyle.bg,
         currentStyle.glow
       )}
     >
       <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
         {/* Left: Balance Section */}
         <div className="sm:w-1/3 flex flex-col">
           <div className="flex items-center gap-2 mb-2">
             <div className={cn(
               'p-2 rounded-xl',
               hasDebt ? 'bg-destructive/15' : 'bg-primary/10'
             )}>
               {hasDebt ? (
                 <AlertTriangle className="w-5 h-5 text-destructive" />
               ) : (
                 <Wallet className="w-5 h-5 text-primary" />
               )}
             </div>
             <div>
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                 {isCashOnly ? (hasDebt ? 'Dluh' : 'Stav') : 'Kredit'}
               </span>
               {isSharedBudget && (
                 <Badge variant="secondary" className="ml-2 h-5 text-[10px] gap-1">
                   <Users className="w-3 h-3" />
                   {budgetGroupName || 'Sdílený'}
                 </Badge>
               )}
             </div>
           </div>
           
           {/* Balance Display */}
           <div className={cn(
             'text-4xl sm:text-5xl font-bold tabular-nums tracking-tight mb-2',
             currentStyle.text
           )}>
             {isCashOnly && hasDebt ? (
               <>-{formatCurrency(unpaidAmount, false)}</>
             ) : (
               formatCurrency(creditBalance, false)
             )}
             <span className="text-lg font-normal text-muted-foreground ml-1">Kč</span>
           </div>
           
           {/* Debt indicator */}
           {hasDebt && (
             <div className="flex items-center gap-1.5 text-sm text-destructive mb-3 font-medium">
               <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
               {unpaidCount}× nezaplaceno ({formatCurrency(unpaidAmount)})
             </div>
           )}
           
           {/* CTA Button */}
           {!isCashOnly && (
             <Button 
               onClick={onAddCredit}
               className="w-full mt-auto gap-2 h-10 rounded-xl shadow-sm hover:shadow-md transition-all"
               variant="default"
             >
               <Plus className="w-4 h-4" />
               Dobít kredit
             </Button>
           )}
         </div>
         
         {/* Right: Recent Transactions */}
         <div className="sm:w-2/3 sm:border-l sm:border-border/30 sm:pl-6">
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
               Poslední pohyby
             </h3>
             <Button
               variant="ghost"
               size="sm"
               className="text-xs text-primary hover:text-primary gap-1 h-7 px-2"
               onClick={navigateToFinance}
             >
               Celá historie
               <ArrowRight className="w-3.5 h-3.5" />
             </Button>
           </div>
           
           {recentTransactions.length === 0 ? (
             <div className="text-center py-6 text-muted-foreground text-sm">
               Zatím žádné transakce
             </div>
           ) : (
             <div className="space-y-1.5">
               {recentTransactions.map((tx, index) => {
                 const type = getTransactionType(tx.type);
                 const isPositive = tx.amount > 0;
                 
                 return (
                   <motion.div
                     key={tx.id}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: index * 0.05 }}
                     className={cn(
                       'flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200',
                       'hover:bg-secondary/50 hover:-translate-y-0.5 cursor-pointer group'
                     )}
                     onClick={navigateToFinance}
                   >
                     {/* Icon */}
                     <div className={cn(
                       'p-2 rounded-lg shrink-0',
                       isPositive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                     )}>
                       {getTypeIcon(type)}
                     </div>
                     
                     {/* Description & Date */}
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-foreground truncate">
                         {getTypeLabel(type, tx.description)}
                       </p>
                       <p className="text-[11px] text-muted-foreground">
                         {formatDate(tx.created_at, 'short')}
                       </p>
                     </div>
                     
                     {/* Amount */}
                     <div className={cn(
                       'text-sm font-bold tabular-nums shrink-0',
                       isPositive ? 'text-success' : 'text-foreground'
                     )}>
                       <span className="flex items-center gap-1">
                         {isPositive ? (
                           <TrendingUp className="w-3.5 h-3.5 text-success" />
                         ) : (
                           <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
                         )}
                         {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                       </span>
                     </div>
                   </motion.div>
                 );
               })}
             </div>
           )}
         </div>
       </div>
     </motion.div>
   );
 }