export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(
    message: string,
    status: number,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (!res.ok) {
    if (res.status === 401 && !["/login", "/me"].includes(path))
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      data.error || "Something went wrong.",
      res.status,
      data.fields,
    );
  }
  return data;
}
