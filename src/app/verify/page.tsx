'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { SingleVerifyView } from '@/components/verify/SingleVerifyView';
import { BatchVerifyView } from '@/components/verify/BatchVerifyView';

/**
 * Verify page with Single/Batch mode toggle.
 * 
 * - Single mode: verify one application comprised of one or more images
 * - Batch mode: upload many images, auto-group into applications, process progressively
 */
export default function VerifyPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Verify Labels
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Upload label images to verify compliance with regulatory requirements.
          </p>
        </div>
      </div>

      {/* Mode toggle tabs */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList>
          <TabsTrigger value="single">Single</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <SingleVerifyView />
        </TabsContent>

        <TabsContent value="batch" className="mt-6">
          <BatchVerifyView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
