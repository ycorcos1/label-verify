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
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Viewing report: <span className="font-mono">{reportId}</span>
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Report detail view coming soon.
        </p>
      </div>
    </div>
  );
}
