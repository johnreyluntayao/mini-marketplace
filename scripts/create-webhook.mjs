import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const site = process.argv[2] || process.env.MARKETPLACE_URL;
const root = new URL("../", import.meta.url);
const productionEnvName = ".env.vercel-webhook";
const productionEnv = new URL(productionEnvName, root);
const events = ["account.updated", "checkout.session.completed", "checkout.session.expired"];

async function register() {
  if (!key?.startsWith("sk_test_")) throw new Error("Use a Stripe sandbox secret key.");
  if (!site) throw new Error("Pass the public Vercel production URL or set MARKETPLACE_URL.");
  const origin = new URL(site);
  if (origin.protocol !== "https:" || origin.username || origin.password ||
    origin.hostname === "localhost" || origin.hostname.endsWith(".localhost") || /^[\d.]+$/.test(origin.hostname)) {
    throw new Error("Use a public HTTPS production domain.");
  }

  const ignored = spawnSync("git", ["check-ignore", "--quiet", "--", productionEnvName], { cwd: root });
  if (ignored.status !== 0) throw new Error(`${productionEnvName} must be ignored by Git.`);
  const settings = await readFile(productionEnv, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const url = new URL("/api/stripe/webhook", origin).href;
  const namespace = createHash("sha256").update(url).digest("hex");
  const stripe = new Stripe(key, { maxNetworkRetries: 2 });
  for await (const existing of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (existing.url !== url) continue;
    if (existing.metadata.marketplace_endpoint !== namespace) {
      throw new Error("An endpoint already exists at this URL. Check its Connect mode and signing secret in Stripe.");
    }
    if (!/^STRIPE_WEBHOOK_SECRET=whsec_\S+$/m.test(settings) ||
        !settings.split(/\r?\n/).includes(`MARKETPLACE_URL=${origin.origin}`)) {
      throw new Error("The endpoint exists. Retrieve its signing secret before continuing.");
    }
    console.log("The Stripe Connect webhook is already registered.");
    return;
  }
  if (settings) throw new Error(`${productionEnvName} already contains settings for another endpoint.`);
  const endpoint = await stripe.webhookEndpoints.create({
    url,
    connect: true,
    enabled_events: events,
    metadata: { marketplace_endpoint: namespace },
  }, { idempotencyKey: "marketplace-webhook-" + namespace });
  if (!endpoint.secret) throw new Error("Stripe did not return a signing secret.");
  await writeFile(productionEnv, `MARKETPLACE_URL=${origin.origin}\nSTRIPE_WEBHOOK_SECRET=${endpoint.secret}\n`, { flag: "wx", mode: 0o600 });
  console.log(`Stripe Connect webhook registered. The signing secret was saved in ${productionEnvName}.`);
}

register().catch((error) => {
  console.error(error instanceof Stripe.errors.StripeError ? (error.code || "Stripe rejected the webhook registration.") : error.message);
  process.exitCode = 1;
});
