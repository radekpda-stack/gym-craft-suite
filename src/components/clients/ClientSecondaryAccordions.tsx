/**
 * ClientSecondaryAccordions Component
 * 
 * Wraps secondary sections in collapsible accordions:
 * - Poznámka trenéra
 * - Měření
 * - Diagnostika
 * - Feedback
 * - Výzvy
 * - Média
 * - Finance
 * - Časová osa
 * - Klientská zóna Admin
 */
import { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  StickyNote, 
  Ruler, 
  Stethoscope, 
  MessageSquare, 
  Trophy, 
  Image, 
  Wallet,
  Clock,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionSection {
  id: string;
  icon: ReactNode;
  title: string;
  badge?: string | number;
  children: ReactNode;
  defaultOpen?: boolean;
}

interface ClientSecondaryAccordionsProps {
  sections: AccordionSection[];
  defaultOpenSections?: string[];
}

export function ClientSecondaryAccordions({
  sections,
  defaultOpenSections = [],
}: ClientSecondaryAccordionsProps) {
  return (
    <Accordion 
      type="multiple" 
      defaultValue={defaultOpenSections}
      className="space-y-2"
    >
      {sections.map(section => (
        <AccordionItem 
          key={section.id} 
          value={section.id}
          className="glass rounded-xl border-0 overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3 text-foreground">
              <span className="text-primary">{section.icon}</span>
              <span className="font-medium">{section.title}</span>
              {section.badge !== undefined && section.badge !== null && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {section.badge}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            {section.children}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// Pre-defined section configs with icons
export const SECTION_ICONS = {
  notes: <StickyNote className="w-5 h-5" />,
  measurements: <Ruler className="w-5 h-5" />,
  diagnostics: <Stethoscope className="w-5 h-5" />,
  feedback: <MessageSquare className="w-5 h-5" />,
  challenges: <Trophy className="w-5 h-5" />,
  media: <Image className="w-5 h-5" />,
  finance: <Wallet className="w-5 h-5" />,
  timeline: <Clock className="w-5 h-5" />,
  admin: <Shield className="w-5 h-5" />,
};
