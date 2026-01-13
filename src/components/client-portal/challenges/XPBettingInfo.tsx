import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Zap, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Swords,
  HelpCircle
} from 'lucide-react';

export function XPBettingInfo() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Jak fungují XP sázky?
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="basics" className="border-none">
            <AccordionTrigger className="text-sm py-2">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Základy sázení
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Můžeš vsadit své XP (zkušenosti) na výzvy. Pokud vyhraješ, dostaneš 
                <span className="text-green-500 font-medium"> dvojnásobek</span> vsazené částky!
              </p>
              <p>
                Pokud prohraješ, vsazené XP se ti odečtou a přidají vítězi.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="duel" className="border-none">
            <AccordionTrigger className="text-sm py-2">
              <span className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-orange-500" />
                1v1 Duely
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>
                V duelu soutěžíš přímo proti jednomu soupeři. Jednoduchá pravidla:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="text-green-500">Vítěz</span> získá dvojnásobek své sázky
                </li>
                <li>
                  <span className="text-red-500">Poražený</span> ztratí svou sázku
                </li>
                <li>
                  Při remíze se sázky vrací
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="group" className="border-none">
            <AccordionTrigger className="text-sm py-2">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Skupinové výzvy
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Ve skupinových výzvách se XP přerozdělují podle umístění:
              </p>
              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="p-2 rounded bg-green-500/10 text-center">
                  <Trophy className="h-4 w-4 mx-auto text-yellow-500" />
                  <div className="text-xs mt-1">Top 25%</div>
                  <div className="text-green-500 font-medium">+2× sázka</div>
                </div>
                <div className="p-2 rounded bg-green-500/5 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto text-green-500" />
                  <div className="text-xs mt-1">25-50%</div>
                  <div className="text-green-500 font-medium">+0.5× sázka</div>
                </div>
                <div className="p-2 rounded bg-red-500/5 text-center">
                  <TrendingDown className="h-4 w-4 mx-auto text-red-400" />
                  <div className="text-xs mt-1">50-75%</div>
                  <div className="text-red-400 font-medium">-0.5× sázka</div>
                </div>
                <div className="p-2 rounded bg-red-500/10 text-center">
                  <TrendingDown className="h-4 w-4 mx-auto text-red-500" />
                  <div className="text-xs mt-1">Spodní 25%</div>
                  <div className="text-red-500 font-medium">-1× sázka</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tips" className="border-none">
            <AccordionTrigger className="text-sm py-2">
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Tipy pro úspěch
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>Začni s menšími sázkami, než se naučíš systém</li>
                <li>Sázej pouze XP, které si můžeš dovolit ztratit</li>
                <li>Sleduj statistiky soupeřů před sázením</li>
                <li>Buduj sérii výher pro bonusové body</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
