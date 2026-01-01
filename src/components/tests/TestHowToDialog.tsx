import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, AlertTriangle, Settings, ListOrdered, ClipboardCheck, XCircle } from 'lucide-react';
import type { TestDefinition } from '@/types/tests';

interface TestHowToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: TestDefinition;
}

export function TestHowToDialog({ open, onOpenChange, definition }: TestHowToDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jak provést: {definition.name_cs || definition.name}</DialogTitle>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={['setup', 'protocol', 'checklist']} className="w-full">
          {/* Setup */}
          <AccordionItem value="setup">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Nastavení a vybavení
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                {definition.device_family && (
                  <div>
                    <span className="font-medium">Zařízení:</span>{' '}
                    <span className="text-muted-foreground">{definition.device_family}</span>
                  </div>
                )}
                {definition.equipment_setup && Object.keys(definition.equipment_setup).length > 0 && (
                  <div className="space-y-1">
                    <span className="font-medium">Doporučené nastavení:</span>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {Object.entries(definition.equipment_setup).map(([key, value]) => (
                        <li key={key}>{key}: {String(value)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {definition.category === 'cardio' && definition.device_family === 'SkillRow' && (
                  <p className="text-muted-foreground">
                    Pro SkillRow/SkillUp nastavte odpor: buď Level 1-10 NEBO Magnet 1-3 (nikdy oboje).
                  </p>
                )}
                {definition.category === 'cardio' && definition.device_family === 'SkillRun' && (
                  <p className="text-muted-foreground">
                    Pro SkillRun nastavte sklon 1-15%.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Protocol */}
          <AccordionItem value="protocol">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                Protokol
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                {definition.protocol_text && (
                  <p className="text-muted-foreground">{definition.protocol_text}</p>
                )}
                {definition.how_to_steps && definition.how_to_steps.length > 0 && (
                  <ol className="list-decimal list-inside space-y-2">
                    {definition.how_to_steps.map((step, i) => (
                      <li key={i} className="text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Standardization Checklist */}
          <AccordionItem value="checklist">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Standardizační checklist
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {definition.standardization_checklist && definition.standardization_checklist.length > 0 ? (
                <ul className="space-y-2">
                  {definition.standardization_checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Žádné položky</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Common Mistakes */}
          <AccordionItem value="mistakes">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Časté chyby
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {definition.common_mistakes && definition.common_mistakes.length > 0 ? (
                <ul className="space-y-2">
                  {definition.common_mistakes.map((mistake, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{mistake}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Žádné časté chyby</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Validity Rules */}
          <AccordionItem value="validity">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Kdy označit jako nevalidní
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {definition.validity_rules && definition.validity_rules.length > 0 ? (
                <ul className="space-y-2">
                  {definition.validity_rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">• {rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Označte jako nevalidní pokud: test byl přerušen, klient měl bolest, 
                  nastavení nebylo správné, nebo protokol nebyl dodržen.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
