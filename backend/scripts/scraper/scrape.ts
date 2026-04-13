import { scrapeAllEvents } from "./event.js";
import { scrapeAllHalls } from "./hall.js";
import { scrapeAllProductions } from "./production.js";

function readViernulvierApiToken(): string {
  const token = process.env["VIERNULVIER_API_TOKEN"];
  if (typeof token !== "string" || token.length === 0) {
    console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
    process.exit(1);
  }
  return token;
}

const viernulvierApiToken = readViernulvierApiToken();

/**
 * Full import: external API halls → productions → events (same order as legacy imports).
 * Halls and productions must exist in the local API before events are created.
 */
async function main() {
  console.log("Scraping halls…");
  await scrapeAllHalls(viernulvierApiToken);
  console.log("Scraping productions…");
  await scrapeAllProductions(viernulvierApiToken);
  console.log("Scraping events…");
  await scrapeAllEvents(new Date(), viernulvierApiToken);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
