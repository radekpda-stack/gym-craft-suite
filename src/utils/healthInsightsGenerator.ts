import { BaselineData } from '@/services/baselineService';

export interface HealthInsight {
  type: 'positive' | 'warning' | 'critical' | 'info';
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
}

export interface ScoreComponents {
  retention: { value: number; label: string };
  credits: { value: number; label: string };
  revenue: { value: number; label: string };
  payments: { value: number; label: string };
}

export interface CreditInfo {
  clientsWithCredit: number;
  clientsInDebt: number;
  totalDebt: number;
}

export interface ClientAtRisk {
  id: string;
  name: string;
  issue: 'debt' | 'inactive' | 'lowCredit';
  value?: number;
  daysInactive?: number;
}

export function generateInsights(
  score: number,
  components: ScoreComponents,
  creditInfo?: CreditInfo,
  clientsAtRisk?: ClientAtRisk[],
  baselines?: BaselineData[]
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  // Score-based main insight
  if (score >= 85) {
    insights.push({
      type: 'positive',
      emoji: '🎯',
      title: 'Skvělá práce!',
      description: 'Tvůj byznys je ve výborné kondici. Všechny metriky jsou nad průměrem.',
    });
  } else if (score >= 70) {
    insights.push({
      type: 'info',
      emoji: '📊',
      title: 'Dobrý stav',
      description: 'Byznys funguje dobře, ale je prostor pro zlepšení.',
    });
  } else if (score >= 50) {
    insights.push({
      type: 'warning',
      emoji: '⚠️',
      title: 'Vyžaduje pozornost',
      description: 'Některé oblasti potřebují tvou pozornost.',
    });
  } else {
    insights.push({
      type: 'critical',
      emoji: '🚨',
      title: 'Kritický stav',
      description: 'Byznys potřebuje okamžitou pozornost ve více oblastech.',
    });
  }

  // Component-specific insights
  if (components.retention.value < 60) {
    const inactiveCount = clientsAtRisk?.filter((c) => c.issue === 'inactive').length || 0;
    insights.push({
      type: 'warning',
      emoji: '👥',
      title: 'Nízká retence klientů',
      description: inactiveCount > 0
        ? `${inactiveCount} klientů nemělo trénink přes měsíc. Zvažte follow-up zprávu.`
        : 'Méně klientů je aktivních než obvykle. Čas na reaktivační kampaň?',
      actionLabel: 'Zobrazit neaktivní',
      actionLink: '/clients?filter=inactive',
    });
  }

  if (components.credits.value < 60 && creditInfo) {
    insights.push({
      type: creditInfo.clientsInDebt > 2 ? 'critical' : 'warning',
      emoji: '💳',
      title: 'Problémy s kredity',
      description: creditInfo.clientsInDebt > 0
        ? `${creditInfo.clientsInDebt} klientů je v dluhu (celkem ${Math.abs(creditInfo.totalDebt).toLocaleString('cs-CZ')} Kč).`
        : 'Někteří klienti mají nízký kredit. Připomeňte jim dobití.',
      actionLabel: 'Řešit dluhy',
      actionLink: '/clients?filter=debt',
    });
  }

  if (components.revenue.value < 0) {
    insights.push({
      type: 'warning',
      emoji: '📉',
      title: 'Pokles příjmů',
      description: `Příjmy klesly o ${Math.abs(components.revenue.value)}% oproti minulému období.`,
    });
  } else if (components.revenue.value > 20) {
    insights.push({
      type: 'positive',
      emoji: '📈',
      title: 'Příjmy rostou',
      description: `Skvělé! Příjmy vzrostly o ${components.revenue.value}% oproti minulému období.`,
    });
  }

  if (components.payments.value < 80) {
    insights.push({
      type: 'warning',
      emoji: '💰',
      title: 'Nezaplacené tréninky',
      description: 'Některé dokončené tréninky nemají evidovanou platbu.',
      actionLabel: 'Zkontrolovat platby',
      actionLink: '/finances',
    });
  }

  // Confidence-based insight
  const avgConfidence = baselines
    ? baselines.reduce((sum, b) => sum + b.confidence, 0) / baselines.length
    : 0;

  if (avgConfidence > 0 && avgConfidence < 50) {
    insights.push({
      type: 'info',
      emoji: '🎓',
      title: 'Učím se tvůj byznys',
      description: `Spolehlivost predikce: ${Math.round(avgConfidence)}%. S více daty bude přesnější.`,
    });
  }

  return insights;
}

export function generateNaturalLanguageSummary(
  score: number,
  components: ScoreComponents,
  weekChange: number,
  creditInfo?: CreditInfo
): string {
  const parts: string[] = [];

  // Main score context
  if (score >= 85) {
    parts.push('Tvůj byznys je ve skvělé kondici.');
  } else if (score >= 70) {
    parts.push('Byznys funguje dobře.');
  } else if (score >= 50) {
    parts.push('Některé oblasti potřebují pozornost.');
  } else {
    parts.push('Je potřeba se zaměřit na několik problémů.');
  }

  // Week change
  if (weekChange !== 0) {
    if (weekChange > 0) {
      parts.push(`Skóre vzrostlo o ${weekChange} bodů za týden.`);
    } else {
      parts.push(`Skóre kleslo o ${Math.abs(weekChange)} bodů za týden.`);
    }
  }

  // Specific callouts
  const issues: string[] = [];
  const wins: string[] = [];

  if (components.retention.value >= 80) {
    wins.push('výborná retence');
  } else if (components.retention.value < 60) {
    issues.push('nízká retence');
  }

  if (components.revenue.value > 10) {
    wins.push('rostoucí příjmy');
  } else if (components.revenue.value < -10) {
    issues.push('klesající příjmy');
  }

  if (creditInfo && creditInfo.clientsInDebt > 0) {
    issues.push(`${creditInfo.clientsInDebt} dlužníků`);
  }

  if (wins.length > 0) {
    parts.push(`Pozitiva: ${wins.join(', ')}.`);
  }

  if (issues.length > 0) {
    parts.push(`K řešení: ${issues.join(', ')}.`);
  }

  return parts.join(' ');
}

export function getStatusLabel(status: 'excellent' | 'good' | 'warning' | 'critical'): string {
  const labels = {
    excellent: 'Výborný',
    good: 'Dobrý',
    warning: 'Vyžaduje pozornost',
    critical: 'Kritický',
  };
  return labels[status];
}

export function getScoreStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}
