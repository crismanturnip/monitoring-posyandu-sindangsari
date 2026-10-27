import { requireActiveProfile } from '@/lib/auth';
import { createReportCsv } from '@/lib/report-export';
import { loadReportRows, normalizeReportFilters, reportFilename } from '@/lib/reports';

export async function GET(request: Request) {
  const { supabase } = await requireActiveProfile();
  const url = new URL(request.url);
  const filters = normalizeReportFilters({
    category: url.searchParams.get('category') ?? undefined,
    posyandu: url.searchParams.get('posyandu') ?? undefined,
    start: url.searchParams.get('start') ?? undefined,
    end: url.searchParams.get('end') ?? undefined,
  });
  const report = await loadReportRows(supabase, filters);
  if (report.error) return Response.json({ error: report.error }, { status: 400 });
  return new Response(createReportCsv(report.rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${reportFilename(filters, 'csv')}"`, 'Cache-Control': 'private, no-store' } });
}
