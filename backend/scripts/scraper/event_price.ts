import { localApiUrl } from "./local-api.js";

interface ViernulvierPriceResponse {
  "@id": string;
  "@type": string;
  amount: number | string;
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

  return await response;
}

export async function scrapeEventPricesForEvent(
  priceIds: number[],
  eventId: number,
  authToken: string,
  loginToken: string,
) {
  for (const priceId of priceIds) {
    try {
      const response = await fetchPriceRequest(priceId, authToken);
      const priceData = await response.json() as ViernulvierPriceResponse;

      const body = {
        event: eventId,
        amount: Number(priceData.amount),
      }

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
        console.error(`Error creating event price for ID ${priceId}: ${createResponse.status} ${errorText}`);
      }
    } catch (error) {
      console.error(`Error fetching price for ID ${priceId}:`, error);
    }
  }
}