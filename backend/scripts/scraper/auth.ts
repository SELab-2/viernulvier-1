import { localApiUrl } from "./local-api.js";

/**
 * Admin user for scraper `POST` calls (JWT). Override in non-local / CI / production.
 *
 * - `SCRAPER_ADMIN_USERNAME` — default `admin`
 * - `SCRAPER_ADMIN_PASSWORD` — default `password` (set explicitly anywhere the default admin password is not used)
 */
export function scraperAdminUsername(): string {
  const v = process.env["SCRAPER_ADMIN_USERNAME"]?.trim();
  return v && v.length > 0 ? v : "admin";
}

/**
 * Password paired with {@link scraperAdminUsername} for `POST /api/v1/auth/login`.
 * Set `SCRAPER_ADMIN_PASSWORD` in any environment where the default is not acceptable.
 */
export function scraperAdminPassword(): string {
  const v = process.env["SCRAPER_ADMIN_PASSWORD"]?.trim();
  return v && v.length > 0 ? v : "password";
}

/** 
 * JWT for `Authorization: Bearer` on protected routes of our API. 
 */
export async function fetchScraperJwt(): Promise<string> {
  const response = await fetch(localApiUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: scraperAdminUsername(),
      password: scraperAdminPassword(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Scraper login failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}
