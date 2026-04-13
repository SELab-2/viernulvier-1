import { localApiUrl } from "./local-api.js";

/**
 * Price import is best-effort: fetch/create errors for individual tiers are logged and skipped.
 * The parent event still counts as imported; many events legitimately have no prices (`[]`).
 */

interface ViernulvierPriceResponse {
  "@id": string;
  "@type": string;
  amount: number | string;
}

export function parseNonNegativePriceAmount(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }
  return null;
}

async function fetchPriceRequest(id: number, authToken: string) {
  const url = `https://www.viernulvier.gent/api/v1/events/prices/${id}`;

  const response = await fetch(url, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  return response;
}

export async function scrapeEventPricesForEvent(
  priceIds: number[],
  eventId: number,
  authToken: string,
  loginToken: string,
) {
  if (priceIds.length === 0) return;

  for (const priceId of priceIds) {
    try {
      const response = await fetchPriceRequest(priceId, authToken);
      const priceData = (await response.json()) as ViernulvierPriceResponse;

      const amount = parseNonNegativePriceAmount(priceData.amount);
      if (amount === null) {
        console.error(
          `Skipping event price legacy id ${priceId} for event ${eventId}: invalid or missing amount (${JSON.stringify(priceData.amount)})`,
        );
        continue;
      }

      const body = {
        event: eventId,
        amount,
      };

      const createResponse = await fetch(localApiUrl("/api/v1/event/price"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${loginToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          `Error creating event price for legacy price id ${priceId} (event ${eventId}): ${createResponse.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error(`Error fetching price for legacy id ${priceId} (event ${eventId}):`, error);
    }
  }
}
