import { FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface ReportDetailPageProps {
  params: Promise<{
    reportId: string;
  }>;
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { reportId } = await params;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Report Details
        </h1>
        <p className="mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400">
          {reportId}
        </p>
      </div>

      <Card accentColor="yellow">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Images not stored
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Re-upload required to re-run verification.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Report detail view coming soon. This page will show the saved verification results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
