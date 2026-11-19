export class MarketplaceRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function marketplaceRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new MarketplaceRequestError(0, "Couldn’t reach the marketplace. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    const message = typeof data?.error === "string" ? data.error : "The marketplace request failed. Please try again.";
    throw new MarketplaceRequestError(response.status, message);
  }
  return data as T;
}

export function postMarketplace<T>(path: string, body: object) {
  return marketplaceRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
