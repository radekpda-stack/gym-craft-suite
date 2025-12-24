/**
 * CLIENT TASKS LOGIC
 * ====================
 * Jeden zdroj pravdy pro generování úkolů z dat klienta.
 * 
 * Dashboard = pouze sbírá úkoly z klientů
 * Karta klienta = zdroj pravdy (tato logika)
 */

import { differenceInDays, isToday, isFuture, differenceInMinutes } from 'date-fns';

// ===================================
// TYPES
// ===================================

export type TaskType = 
  | 'training-now'    // Trénink probíhá právě teď
  | 'training-today'  // Trénink naplánovaný na dnes
  | 'overload'        // Vysoké RPE + špatný feedback
  | 'feedback'        // Chybí feedback po tréninku
  | 'health-issue'    // Zdravotní problém (bolest, red flag)
  | 'credit'          // Nízký/žádný kredit
  | 'no-training'     // Dlouho bez tréninku
  | 'unpaid'          // Nezaplacený trénink
  | 'note'            // Potřebuje poznámku
  | 'schedule';       // Naplánovat trénink

export type TaskSeverity = 'error' | 'warning' | 'info';

export interface ClientTask {
  id: string;
  type: TaskType;
  severity: TaskSeverity;
  clientId: string;
  clientName: string;
  title: string;
  subtitle: string;
  detail?: string;
  actionLabel: string;
  meta?: Record<string, any>;
}

export interface ClientData {
  id: string;
  name: string;
  credit_balance: number;
  payment_mode: string | null;
  feedback_enabled?: boolean | null;
}

export interface TrainingSession {
  id: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  rpe?: number | null;
  final_price?: number | null;
  payment_status?: string | null;
}

export interface FeedbackData {
  id: string;
  training_date: string;
  pain?: number | null;
  body_feel?: number | null;
  rpe_rating?: number | null;
  is_red_flag?: boolean | null;
}

export interface FeedbackRequest {
  training_session_id: string;
  status: string;
}

export interface ClientTasksInput {
  client: ClientData;
  sessions: TrainingSession[];
  feedback: FeedbackData[];
  feedbackRequests: FeedbackRequest[];
  lowCreditThreshold?: number;
  criticalCreditThreshold?: number;
  isInBudgetGroup?: boolean;
}

// ===================================
// CORE LOGIC - Generování úkolů z jednoho klienta
// ===================================

export function generateClientTasks(input: ClientTasksInput): ClientTask[] {
  const {
    client,
    sessions,
    feedback,
    feedbackRequests,
    lowCreditThreshold = 800,
    criticalCreditThreshold = 0,
    isInBudgetGroup = false,
  } = input;

  const tasks: ClientTask[] = [];
  const now = new Date();

  // ===== 1. TRÉNINK PRÁVĚ TEĎ =====
  const currentTraining = sessions.find(s => {
    if (s.status !== 'scheduled') return false;
    const trainingDate = new Date(s.date);
    const minsDiff = differenceInMinutes(trainingDate, now);
    return minsDiff >= -60 && minsDiff <= 30; // Začal před max 1h nebo začne do 30min
  });

  if (currentTraining) {
    tasks.push({
      id: `training-now-${currentTraining.id}`,
      type: 'training-now',
      severity: 'info',
      clientId: client.id,
      clientName: client.name,
      title: client.name,
      subtitle: 'Trénink teď',
      detail: 'Probíhá právě teď',
      actionLabel: 'Otevřít',
      meta: { trainingId: currentTraining.id },
    });
  }

  // ===== 2. TRÉNINK DNES (pokud není teď) =====
  if (!currentTraining) {
    const todayTraining = sessions.find(s => 
      isToday(new Date(s.date)) && s.status === 'scheduled'
    );

    if (todayTraining) {
      const time = new Date(todayTraining.date).toLocaleTimeString('cs-CZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      tasks.push({
        id: `training-today-${todayTraining.id}`,
        type: 'training-today',
        severity: 'info',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Trénink dnes',
        detail: `v ${time}`,
        actionLabel: 'Otevřít',
        meta: { trainingId: todayTraining.id },
      });
    }
  }

  // ===== 3. PŘETÍŽENÍ (vysoké RPE + špatný feedback) =====
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentHighRpe = sessions.filter(s => 
    s.status === 'completed' && 
    s.rpe && s.rpe >= 8 &&
    new Date(s.date) >= sevenDaysAgo
  );

  const recentBadFeedback = feedback.filter(f => 
    new Date(f.training_date) >= sevenDaysAgo &&
    ((f.pain && f.pain >= 6) || (f.body_feel && f.body_feel <= 4) || f.is_red_flag)
  );

  if (recentBadFeedback.length >= 2 || (recentHighRpe.length >= 2 && recentBadFeedback.length >= 1)) {
    tasks.push({
      id: `overload-${client.id}`,
      type: 'overload',
      severity: 'error',
      clientId: client.id,
      clientName: client.name,
      title: client.name,
      subtitle: 'Přetížení',
      detail: 'Vysoké RPE + špatný feedback',
      actionLabel: 'Zkontrolovat',
    });
  }

  // ===== 4. ZDRAVOTNÍ PROBLÉM (bez přetížení) =====
  const latestFeedback = feedback[0];
  if (latestFeedback && differenceInDays(now, new Date(latestFeedback.training_date)) <= 7) {
    if (latestFeedback.is_red_flag) {
      tasks.push({
        id: `health-redflag-${client.id}`,
        type: 'health-issue',
        severity: 'error',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Red flag',
        detail: 'Klient hlásí vážný problém',
        actionLabel: 'Řešit',
      });
    } else if (latestFeedback.pain && latestFeedback.pain >= 7) {
      tasks.push({
        id: `health-pain-${client.id}`,
        type: 'health-issue',
        severity: 'error',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Vysoká bolest',
        detail: `${latestFeedback.pain}/10`,
        actionLabel: 'Řešit',
      });
    } else if (latestFeedback.pain && latestFeedback.pain >= 5) {
      tasks.push({
        id: `health-pain-${client.id}`,
        type: 'health-issue',
        severity: 'warning',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Bolest',
        detail: `${latestFeedback.pain}/10`,
        actionLabel: 'Sledovat',
      });
    }
  }

  // ===== 5. CHYBÍ FEEDBACK =====
  if (client.feedback_enabled !== false) {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const completedFeedbackIds = new Set(
      feedbackRequests
        .filter(f => f.status === 'completed')
        .map(f => f.training_session_id)
    );

    const recentCompleted = sessions.filter(s => 
      s.status === 'completed' && 
      new Date(s.date) >= threeDaysAgo &&
      new Date(s.date) <= now
    );

    recentCompleted.forEach(training => {
      if (!completedFeedbackIds.has(training.id)) {
        tasks.push({
          id: `feedback-${training.id}`,
          type: 'feedback',
          severity: 'warning',
          clientId: client.id,
          clientName: client.name,
          title: client.name,
          subtitle: 'Chybí feedback',
          detail: new Date(training.date).toLocaleDateString('cs-CZ'),
          actionLabel: 'Poslat',
          meta: { trainingId: training.id },
        });
      }
    });
  }

  // ===== 6. KREDIT =====
  if (client.payment_mode !== 'cash_only' && !isInBudgetGroup) {
    const balance = client.credit_balance || 0;
    
    if (balance <= criticalCreditThreshold) {
      tasks.push({
        id: `credit-${client.id}`,
        type: 'credit',
        severity: 'error',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Bez kreditu',
        detail: `${balance} Kč`,
        actionLabel: 'Dobít',
        meta: { balance },
      });
    } else if (balance < lowCreditThreshold) {
      tasks.push({
        id: `credit-${client.id}`,
        type: 'credit',
        severity: 'warning',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Nízký kredit',
        detail: `${balance} Kč`,
        actionLabel: 'Dobít',
        meta: { balance },
      });
    }
  }

  // ===== 7. DLOUHO BEZ TRÉNINKU =====
  const lastCompleted = sessions.find(s => s.status === 'completed');
  const hasFutureTraining = sessions.some(s => 
    s.status === 'scheduled' && isFuture(new Date(s.date))
  );

  if (lastCompleted && !hasFutureTraining) {
    const daysAgo = differenceInDays(now, new Date(lastCompleted.date));
    
    if (daysAgo > 14) {
      tasks.push({
        id: `no-training-${client.id}`,
        type: 'no-training',
        severity: 'error',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Dlouho bez tréninku',
        detail: `${daysAgo} dní`,
        actionLabel: 'Naplánovat',
      });
    } else if (daysAgo > 7) {
      tasks.push({
        id: `no-training-${client.id}`,
        type: 'no-training',
        severity: 'warning',
        clientId: client.id,
        clientName: client.name,
        title: client.name,
        subtitle: 'Chybí trénink',
        detail: `${daysAgo} dní`,
        actionLabel: 'Naplánovat',
      });
    }
  }

  // ===== 8. NEZAPLACENÉ TRÉNINKY =====
  const unpaidTrainings = sessions.filter(s => 
    s.status === 'completed' && 
    s.payment_status === 'pending' &&
    differenceInDays(now, new Date(s.date)) > 7
  );

  unpaidTrainings.forEach(training => {
    tasks.push({
      id: `unpaid-${training.id}`,
      type: 'unpaid',
      severity: 'warning',
      clientId: client.id,
      clientName: client.name,
      title: client.name,
      subtitle: 'Nezaplaceno',
      detail: training.final_price ? `${training.final_price} Kč` : undefined,
      actionLabel: 'Řešit',
      meta: { trainingId: training.id, amount: training.final_price },
    });
  });

  return tasks;
}

// ===================================
// HELPER - Získání dominantního úkolu (pro CTA)
// ===================================

export function getDominantTask(tasks: ClientTask[]): ClientTask | null {
  if (tasks.length === 0) return null;

  // Priorita typů úkolů
  const priority: TaskType[] = [
    'training-now',
    'training-today',
    'overload',
    'health-issue',
    'feedback',
    'credit',
    'no-training',
    'unpaid',
    'schedule',
  ];

  // Seřadit podle priority a severity
  const sorted = [...tasks].sort((a, b) => {
    const aPriority = priority.indexOf(a.type);
    const bPriority = priority.indexOf(b.type);
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Stejná priorita typu -> seřadit podle severity
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return sorted[0];
}

// ===================================
// HELPER - Agregace úkolů pro Dashboard
// ===================================

export interface AggregatedTasks {
  allTasks: ClientTask[];
  byType: Map<TaskType, ClientTask[]>;
  bySeverity: Map<TaskSeverity, ClientTask[]>;
  errorCount: number;
  warningCount: number;
  totalCount: number;
}

export function aggregateTasks(allClientTasks: ClientTask[][]): AggregatedTasks {
  const allTasks = allClientTasks.flat();
  
  const byType = new Map<TaskType, ClientTask[]>();
  const bySeverity = new Map<TaskSeverity, ClientTask[]>();
  
  allTasks.forEach(task => {
    // By type
    const typeList = byType.get(task.type) || [];
    typeList.push(task);
    byType.set(task.type, typeList);
    
    // By severity
    const sevList = bySeverity.get(task.severity) || [];
    sevList.push(task);
    bySeverity.set(task.severity, sevList);
  });

  return {
    allTasks,
    byType,
    bySeverity,
    errorCount: bySeverity.get('error')?.length || 0,
    warningCount: bySeverity.get('warning')?.length || 0,
    totalCount: allTasks.length,
  };
}

// ===================================
// HELPER - Seřazení úkolů podle dopadu
// ===================================

export function sortTasksByImpact(tasks: ClientTask[]): ClientTask[] {
  const priority: TaskType[] = [
    'training-now',
    'overload',
    'health-issue',
    'training-today',
    'credit',
    'feedback',
    'unpaid',
    'no-training',
    'schedule',
  ];

  return [...tasks].sort((a, b) => {
    // Nejprve podle severity
    const severityOrder = { error: 0, warning: 1, info: 2 };
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    
    // Pak podle typu
    return priority.indexOf(a.type) - priority.indexOf(b.type);
  });
}
