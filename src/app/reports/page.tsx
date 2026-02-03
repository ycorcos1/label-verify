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

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No reports yet. Reports will appear here after you run verifications.
        </p>
      </div>
    </div>
  );
}
