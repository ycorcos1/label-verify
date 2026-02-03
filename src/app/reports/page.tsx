import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reports
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View and manage your saved verification reports.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <FileText className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            No reports yet.
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            Reports will appear here after you run verifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
