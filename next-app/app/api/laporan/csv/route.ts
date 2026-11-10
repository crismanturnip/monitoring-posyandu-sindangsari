// Keep existing download links working after switching the report format to Excel.
export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/api/laporan/excel';
  return Response.redirect(url, 307);
}
