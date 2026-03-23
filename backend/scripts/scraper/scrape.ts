import { scrapeAllEvents } from "scripts/scraper/event.js";

const authToken = process.env["VIERNULVIER_API_TOKEN"];
if (!authToken) {
  console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
  process.exit(1);
}

scrapeAllEvents(new Date(), authToken);