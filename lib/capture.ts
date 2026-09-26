export function queryObject(url: URL): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const current = result[key];
    if (current === undefined) result[key] = value;
    else result[key] = Array.isArray(current) ? [...current, value] : [current, value];
  }
  return result;
}

export function parseJsonBody(body: string, contentType: string | null): unknown | null {
  if (!body || !contentType?.toLowerCase().includes("json")) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
