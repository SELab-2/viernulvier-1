import { localApiUrl } from "./local-api.js";

/**
 * Admin user for scraper `POST` calls (JWT). Override in non-local / CI / production.
 *
 * - `SCRAPER_ADMIN_USERNAME` — default `admin`
 * - `SCRAPER_ADMIN_PASSWORD` — default `password` (set explicitly anywhere the default admin password is not used)
 */
export function scraperAdminCredentials(): { username: string; password: string } {
  const userRaw = process.env["SCRAPER_ADMIN_USERNAME"]?.trim();
  const passRaw = process.env["SCRAPER_ADMIN_PASSWORD"]?.trim();
  return {
    username: userRaw && userRaw.length > 0 ? userRaw : "admin",
    password: passRaw && passRaw.length > 0 ? passRaw : "password",
  };
}

/**
 * JWT for `Authorization: Bearer` on protected routes of our API.
 */
export async function fetchScraperJwt(): Promise<string> {
  const { username, password } = scraperAdminCredentials();
  const response = await fetch(localApiUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Scraper login failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}
