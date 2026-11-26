export interface ParsedJsonResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errorMessage: string;
}

export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<ParsedJsonResponse<T>> {
  const text = await res.text();
  let data: T | null = null;

  if (text.trim().length > 0) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  let errorMessage = '';
  if (!res.ok) {
    const fromJson =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error || '')
        : '';
    if (fromJson) {
      errorMessage = fromJson;
    } else if (res.status >= 500) {
      errorMessage =
        'The server is temporarily warming up or busy. Please try again in a few seconds.';
    } else {
      errorMessage = 'Request could not be completed. Please try again.';
    }
  } else if (data === null && text.trim().length > 0) {
    errorMessage =
      'Received an unexpected response from the server. Please refresh and try again.';
  }

  return {
    ok: res.ok && data !== null,
    status: res.status,
    data,
    errorMessage,
  };
}

export async function fetchJsonWithRetry<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  retries = 1
): Promise<ParsedJsonResponse<T>> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(input, init);
      const parsed = await parseJsonResponse<T>(res);
      const isTransientGatewayFailure =
        !parsed.ok &&
        (res.status === 502 ||
          res.status === 503 ||
          res.status === 504 ||
          (res.status >= 500 && parsed.data === null));

      if (isTransientGatewayFailure && attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 650));
        continue;
      }
      return parsed;
    } catch {
      if (attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 650));
        continue;
      }
      return {
        ok: false,
        status: 0,
        data: null,
        errorMessage:
          'Unable to reach the server. Please check your connection and try again.',
      };
    }
  }
}
