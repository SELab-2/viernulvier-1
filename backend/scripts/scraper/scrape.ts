import { scrapeAllEvents } from "./event.js";
//import { scrapeAllHalls } from "./hall.js";
//import { scrapeAllProductions } from "./production.js";


const authToken = process.env["VIERNULVIER_API_TOKEN"];
if (!authToken) {
  console.error("VIERNULVIER_API_TOKEN is not set in the environment variables.");
  process.exit(1);
}
 
scrapeAllEvents(new Date(), authToken);