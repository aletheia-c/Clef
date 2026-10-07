export async function getJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {signal});
  await ensureOk(response);
  return (await response.json()) as T;
}

export async function postJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  await ensureOk(response);
}

async function ensureOk(response: Response): Promise<void> {
  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
}
