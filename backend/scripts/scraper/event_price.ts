interface ViernulvierPriceResponse {
  "@id": string;
  "@type": string;
  amount: number;
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
) {
  for (const priceId of priceIds) {
    try {
      const response = await fetchPriceRequest(priceId, authToken);
      const priceData = await response.json() as ViernulvierPriceResponse;

      const body = {
        event: eventId,
        amount: priceData.amount,
      }

      const createResponse = await fetch("http://localhost:5173/event_price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": authToken,
        },
        body: JSON.stringify(body),
      });

      if (!createResponse.ok) {
        console.error(`Error creating event price for ID ${priceId}:`, createResponse.status);
      }
    } catch (error) {
      console.error(`Error fetching price for ID ${priceId}:`, error);
    }
  }
}