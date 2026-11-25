import { handleCtetApiRequest } from '../../server/examsnetService.ts';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const result = await handleCtetApiRequest(url.pathname, url.searchParams);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (result.cacheControl) {
    headers['Cache-Control'] = result.cacheControl;
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers,
  });
}
