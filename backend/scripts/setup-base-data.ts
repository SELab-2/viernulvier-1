/**
 * Setup script to create base Production and Hall with ID 1
 * This ensures foreign key references don't fail when creating events/other data
 * 
 * Usage: npm run setup-base-data (after backend is running)
 */

const BASE_URL = process.env["API_URL"] || "http://localhost:3000";
const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] || "admin";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] || "password";

interface LoginResponse {
  token: string;
}

interface Production {
  id: number;
  title: Record<string, string>;
  artist: Record<string, string>;
  tagline: Record<string, string>;
  teaser: Record<string, string>;
}

interface Hall {
  id: number;
  name: Record<string, string>;
  address: string;
  vendor_id: number;
}

async function login(): Promise<string> {
  console.log("🔐 Logging in...");
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Login failed with status ${response.status}: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as LoginResponse;
  console.log("✅ Logged in successfully");
  return data.token;
}

async function createProduction(token: string): Promise<Production> {
  console.log("🎭 Creating production...");
  const response = await fetch(`${BASE_URL}/api/v1/production`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: { nl: "Base Production", en: "Base Production" },
      artist: { nl: "System", en: "System" },
      tagline: { nl: "Base production for foreign key references", en: "Base production for foreign key references" },
      teaser: { nl: "This is a base production", en: "This is a base production" },
      finalized: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create production with status ${response.status}: ${await response.text()}`,
    );
  }

  const production = (await response.json()) as Production;
  console.log(`✅ Production created with ID: ${production.id}`);
  return production;
}

async function createHall(token: string): Promise<Hall> {
  console.log("🏛️  Creating hall...");
  const response = await fetch(`${BASE_URL}/api/v1/hall`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: { nl: "Base Hall", en: "Base Hall" },
      address: "System Address",
      vendor_id: 0,
      old_id: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create hall with status ${response.status}: ${await response.text()}`,
    );
  }

  const hall = (await response.json()) as Hall;
  console.log(`✅ Hall created with ID: ${hall.id}`);
  return hall;
}

async function main() {
  try {
    console.log("🚀 Starting base data setup...\n");
    const token = await login();
    const production = await createProduction(token);
    const hall = await createHall(token);

    console.log("\n✨ Setup complete!");
    console.log(`📊 Production ID: ${production.id}`);
    console.log(`🏛️  Hall ID: ${hall.id}`);

    // Verify the IDs are 1
    if (production.id === 1 && hall.id === 1) {
      console.log("\n✅ Perfect! Both production and hall have ID 1");
    } else {
      console.warn(
        `\n⚠️  Warning: Expected IDs to be 1, but got production ID ${production.id} and hall ID ${hall.id}`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
