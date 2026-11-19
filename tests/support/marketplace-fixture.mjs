import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { createPaymentsFixture, testStripeKey, testWebhookSecret } from "./stripe-fixture.mjs";

const require = createRequire(import.meta.url);
const secretKey = "sb_secret_marketplace_test";

function json(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function listen(server) {
  await once(server.listen(0, "127.0.0.1"), "listening");
  return server.address().port;
}

function orderNewest(a, b) {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

function filterText(params, column) {
  return params.get(column)?.slice(7, -1).replace(/\\([\\%_])/g, "$1").toLowerCase();
}

function matchingRecords(records, params) {
  const id = params.get("id")?.slice(3);
  const listingId = params.get("listing_id")?.slice(3);
  const category = params.get("category")?.slice(3);
  const search = filterText(params, "search_text");
  const location = filterText(params, "location");
  const prices = params.getAll("price");
  const minPrice = Number(prices.find((filter) => filter.startsWith("gte."))?.slice(4) ?? -Infinity);
  const maxPrice = Number(prices.find((filter) => filter.startsWith("lte."))?.slice(4) ?? Infinity);
  const cursor = params.get("or")?.match(/^\(created_at\.lt\.([^,]+),and\(created_at\.eq\.\1,id\.lt\.([a-f0-9-]+)\)\)$/);
  const fields = params.get("select")?.split(",");
  const offset = Number(params.get("offset") ?? 0);
  const limit = Number(params.get("limit") ?? records.size);

  return [...records.values()].filter((row) => {
    const searchable = `${row.title} ${row.description} ${row.location}`.toLowerCase();
    return (!id || id === row.id) && (!listingId || listingId === row.listing_id) && (!category || category === row.category) &&
      (!location || row.location?.toLowerCase().includes(location)) && (!prices.length || (row.price >= minPrice && row.price <= maxPrice)) &&
      (!search || searchable.includes(search)) && (!cursor || row.created_at < cursor[1] || (row.created_at === cursor[1] && row.id < cursor[2]));
  }).sort(orderNewest).slice(offset, offset + limit).map((row) => {
    return fields ? Object.fromEntries(fields.map((field) => [field, row[field]])) : row;
  });
}

export async function startMarketplaceFixture({ port, payments = false } = {}) {
  await access(".next/BUILD_ID").catch(() => { throw new Error("Run npm run build before the integration tests."); });

  const listings = new Map();
  const messages = new Map();
  const photos = new Map();
  const faults = { catalog: false, thumbnail: false };
  const adminToken = randomUUID() + randomUUID();
  const payment = payments ? createPaymentsFixture({ listings, json, readBody }) : null;

  const backend = createServer(async (request, response) => {
    try {
      const { pathname, searchParams } = new URL(request.url, "http://127.0.0.1");
      const isServer = request.headers.apikey === secretKey;
      const method = request.method;
      const single = request.headers.accept?.includes("vnd.pgrst.object");

      if (pathname === "/rest/v1/rpc/publish_marketplace_listing" && method === "POST") {
        if (!isServer) return json(response, 403, { code: "42501" });
        const { p_listing: record, p_owner_hash: ownerHash } = JSON.parse((await readBody(request)).toString());
        if (!/^[0-9a-f]{64}$/.test(ownerHash)) return json(response, 400, { code: "23514" });
        if (listings.has(record.id)) return json(response, 409, { code: "23505" });
        record.created_at = new Date().toISOString();
        record.sold_at = null;
        listings.set(record.id, record);
        payment?.owners.set(record.id, ownerHash);
        return json(response, 200, single ? record : [record]);
      }

      if (payment && await payment.handle(request, response, new URL(request.url, "http://127.0.0.1"), isServer)) return;

      if (pathname === "/rest/v1/listings" || pathname === "/rest/v1/messages") {
        const isMessage = pathname.endsWith("/messages");
        if ((isMessage || method === "POST") && !isServer) return json(response, 403, { code: "42501" });
        if (!isMessage && method === "GET" && faults.catalog) return json(response, 403, { code: "FIXTURE_UNAVAILABLE" });
        const records = isMessage ? messages : listings;

        if (method === "POST") {
          const record = JSON.parse((await readBody(request)).toString());
          if (records.has(record.id)) return json(response, 409, { code: "23505" });
          if (isMessage && !listings.has(record.listing_id)) return json(response, 409, { code: "23503" });
          record.created_at = new Date().toISOString();
          records.set(record.id, record);
          if (single) return json(response, 201, record);
          response.writeHead(201).end();
          return;
        }

        const rows = matchingRecords(records, searchParams);
        return json(response, 200, single ? rows[0] : rows);
      }

      const name = pathname.split("/").at(-1);
      const image = photos.get(name);
      if (pathname.startsWith("/storage/v1/object/sign/listing-images/") && method === "GET") {
        if (!image || searchParams.get("token") !== "fixture") return json(response, 404, { code: "NoSuchKey" });
        response.writeHead(200, { "Content-Type": "image/webp" }).end(image);
        return;
      }
      if (!isServer) return json(response, 403, { code: "AccessDenied" });
      if (pathname.startsWith("/storage/v1/object/info/listing-images/")) {
        return image ? json(response, 200, { name }) : json(response, 404, { code: "NoSuchKey", message: "Object not found" });
      }
      if (pathname.startsWith("/storage/v1/object/sign/listing-images/")) {
        if (!image) return json(response, 404, { code: "NoSuchKey", message: "Object not found" });
        return json(response, 200, { signedURL: `/object/sign/listing-images/${name}?token=fixture` });
      }
      if (pathname.startsWith("/storage/v1/object/listing-images/")) {
        if (method === "POST") {
          if (faults.thumbnail && name.endsWith(".thumb.webp")) return json(response, 403, { code: "FIXTURE_UNAVAILABLE" });
          const bytes = await readBody(request);
          if (photos.has(name)) return json(response, 409, { code: "KeyAlreadyExists", message: "Duplicate file" });
          photos.set(name, bytes);
          return json(response, 200, { Key: `listing-images/${name}`, Id: randomUUID() });
        }
        if (image) {
          response.writeHead(200, { "Content-Type": "image/webp" }).end(image);
          return;
        }
      }
      return json(response, 404, { code: "FIXTURE_ROUTE_MISSING", pathname });
    } catch (error) {
      return json(response, 500, { error: error.message });
    }
  });

  const upstreamPort = await listen(backend);
  if (!port) {
    const reservation = createServer();
    port = await listen(reservation);
    await new Promise((resolve) => reservation.close(resolve));
  }

  const origin = `http://127.0.0.1:${port}`;
  const preload = payments ? ["--import", pathToFileURL(require.resolve("./stripe-transport.mjs")).href] : [];
  const app = spawn(process.execPath, [...preload, require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${upstreamPort}`,
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_marketplace_test",
      SUPABASE_SECRET_KEY: secretKey,
      MARKETPLACE_ADMIN_TOKEN: adminToken,
      STRIPE_SECRET_KEY: payments ? testStripeKey : "",
      STRIPE_WEBHOOK_SECRET: payments ? testWebhookSecret : "",
      STRIPE_FIXTURE_PORT: String(upstreamPort),
      MARKETPLACE_URL: origin,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let logs = "";
  app.stdout.on("data", (data) => { logs += data; });
  app.stderr.on("data", (data) => { logs += data; });

  async function close() {
    if (app.exitCode === null && app.signalCode === null) app.kill();
    backend.close();
    backend.closeAllConnections();
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/listings`, { signal: AbortSignal.timeout(700) });
      if (response.ok) return { origin, adminToken, listings, messages, photos, faults, payment, close };
    } catch {
      // The production server may still be starting.
    }
    if (app.exitCode !== null) break;
    await delay(150);
  }

  await close();
  throw new Error(`The marketplace test server could not start.\n${logs}`);
}
