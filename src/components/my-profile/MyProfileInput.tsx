import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Activity, Scale, Camera } from 'lucide-react';
import { TrainerStrengthInputForm } from './TrainerStrengthInputForm';
import { TrainerCardioInputForm } from './TrainerCardioInputForm';
import { TrainerMeasurementInputForm } from './TrainerMeasurementInputForm';
import { TrainerDiaryInput } from './TrainerDiaryInput';

interface MyProfileInputProps {
  clientId: string;
}

export function MyProfileInput({ clientId }: MyProfileInputProps) {
  const [activeTab, setActiveTab] = useState('garmin');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Zaznamenat výkon</h2>
        <p className="text-sm text-muted-foreground">
          Zadejte své výsledky z tréninku. Data budou viditelná v žebříčcích a porovnáních s klienty.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="garmin" className="flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Garmin</span>
          </TabsTrigger>
          <TabsTrigger value="strength" className="flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">Síla</span>
          </TabsTrigger>
          <TabsTrigger value="cardio" className="flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Kardio</span>
          </TabsTrigger>
          <TabsTrigger value="measurement" className="flex items-center gap-1.5">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Měření</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="garmin" className="mt-4">
          <TrainerDiaryInput />
        </TabsContent>

        <TabsContent value="strength" className="mt-4">
          <TrainerStrengthInputForm clientId={clientId} />
        </TabsContent>

        <TabsContent value="cardio" className="mt-4">
          <TrainerCardioInputForm clientId={clientId} />
        </TabsContent>

        <TabsContent value="measurement" className="mt-4">
          <TrainerMeasurementInputForm clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
