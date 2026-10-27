import { requireActiveProfile } from '@/lib/auth';
import { createReportPdf } from '@/lib/report-export';
import { loadReportRows, normalizeReportFilters, reportFilename } from '@/lib/reports';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { profile, supabase } = await requireActiveProfile();
  const url = new URL(request.url);
  const filters = normalizeReportFilters({
    category: url.searchParams.get('category') ?? undefined,
    posyandu: url.searchParams.get('posyandu') ?? undefined,
    start: url.searchParams.get('start') ?? undefined,
    end: url.searchParams.get('end') ?? undefined,
  });
  const report = await loadReportRows(supabase, filters);
  if (report.error) return Response.json({ error: report.error }, { status: 400 });
  const bytes = await createReportPdf(report.rows, filters, profile.full_name);
  return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${reportFilename(filters, 'pdf')}"`, 'Cache-Control': 'private, no-store' } });
}
