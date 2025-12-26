import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExerciseDuplicateTool } from './ExerciseDuplicateTool';
import { ExerciseAliasManagerPage } from './ExerciseAliasManagerPage';
import { UnmatchedEntriesManager } from './UnmatchedEntriesManager';
import { Link2, AlertTriangle, Merge } from 'lucide-react';

export function ExercisesManagementSection() {
  const [activeTab, setActiveTab] = useState('duplicates');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Merge className="w-4 h-4" />
            <span className="hidden sm:inline">Duplicity</span>
          </TabsTrigger>
          <TabsTrigger value="aliases" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Aliasy</span>
          </TabsTrigger>
          <TabsTrigger value="unmatched" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Nepřiřazené</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates" className="mt-4">
          <ExerciseDuplicateTool />
        </TabsContent>

        <TabsContent value="aliases" className="mt-4">
          <ExerciseAliasManagerPage />
        </TabsContent>

        <TabsContent value="unmatched" className="mt-4">
          <UnmatchedEntriesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
