import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Stripe from "stripe";
import { startMarketplaceFixture } from "./support/marketplace-fixture.mjs";
import { testStripeKey, testWebhookSecret } from "./support/stripe-fixture.mjs";

test("sandbox Connect, direct Checkout, and signed fulfillment", { timeout: 60000 }, async (t) => {
  const { origin, payment, close } = await startMarketplaceFixture({ payments: true });
  t.after(close);
  const stripe = new Stripe(testStripeKey);
  const sellerEmail = "seller@example.com";
  const id = randomUUID();
  let orderId = randomUUID();
  const noOwnerId = randomUUID();
  const bytes = await readFile(new URL("./fixtures/marketplace-photo.webp", import.meta.url));

  async function request(path, status, options) {
    const response = await fetch(origin + path, options);
    assert.equal(response.status, status, path);
    return response;
  }
  async function post(path, status, body, cookie) {
    return request(path, status, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
      body: JSON.stringify(body),
    });
  }
  async function publish(listingId, sendOwnerCookie) {
    const form = new FormData();
    form.set("uploadId", listingId);
    form.set("photo", new Blob([bytes], { type: "image/webp" }), "item.webp");
    const upload = await request("/api/upload", 201, { method: "POST", body: form });
    assert.match(upload.headers.get("set-cookie"), /HttpOnly.*SameSite=Lax/);
    const cookie = upload.headers.get("set-cookie").split(";")[0];
    await post("/api/listings", 201, {
      uploadId: listingId, title: "Reading chair", description: "A test listing.", price: 12.35,
      sellerEmail, category: "furniture",
    }, sendOwnerCookie ? cookie : undefined);
    return cookie;
  }
  async function event(type, object, account, status = 200, sign = true) {
    const payload = JSON.stringify({ type, account, livemode: false, data: { object } });
    const header = sign ? stripe.webhooks.generateTestHeaderString({ payload, secret: testWebhookSecret }) : "invalid";
    return request("/api/stripe/webhook", status, { method: "POST", headers: { "stripe-signature": header }, body: payload });
  }

  const cookie = await publish(id, true);
  await publish(noOwnerId, false);
  const item = () => request("/api/listings/" + id, 200).then((response) => response.json());
  assert.equal((await item()).canBuy, false);
  await post("/api/stripe/checkout", 409, { listingId: id, orderId });

  const onboard = await post("/api/stripe/onboarding", 200, { email: sellerEmail.toUpperCase() }, cookie);
  assert.match((await onboard.json()).url, /^https:\/\/connect\.stripe\.com\//);
  assert.equal(payment.accounts.size, 1);
  const account = [...payment.stripeAccounts.values()][0];
  assert.equal(account.email, sellerEmail);
  assert.match(payment.onboardingLinks[0].get("return_url"), /\/sell\/payments\?email=/);
  Object.assign(account, { details_submitted: true, charges_enabled: true, payouts_enabled: true });
  await event("account.updated", account, account.id, 400, false);
  assert.equal((await item()).canBuy, false);
  await event("account.updated", account, account.id);
  assert.equal((await item()).canBuy, true);
  assert.equal((await (await request("/api/listings/" + noOwnerId, 200)).json()).canBuy, false);

  const checkout = await post("/api/stripe/checkout", 200, { listingId: id, orderId });
  const url = (await checkout.json()).url;
  let session = [...payment.sessions.values()][0];
  assert.equal(url, session.url);
  assert.equal((await (await post("/api/stripe/checkout", 200, { listingId: id, orderId })).json()).url, url);
  await post("/api/stripe/checkout", 409, { listingId: id, orderId: randomUUID() });
  assert.equal(payment.sessions.size, 1);
  assert.equal(payment.orders.get(orderId).platform_fee_cents, 124);
  const receipt = (sessionId = session.id) => "/api/stripe/orders/" + orderId + "?session_id=" + sessionId;
  await request(receipt("cs_test_Other"), 404);
  assert.equal((await (await request(receipt(), 200)).json()).status, "pending");

  session.status = "expired";
  await event("checkout.session.expired", session, account.id);
  assert.equal((await (await request(receipt(), 200)).json()).status, "expired");
  orderId = randomUUID();
  await post("/api/stripe/checkout", 200, { listingId: id, orderId });
  session = [...payment.sessions.values()].at(-1);

  Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: "pi_Fixture" });
  payment.intents.set("pi_Fixture", {
    id: "pi_Fixture", account: account.id, livemode: false, status: "succeeded",
    currency: "usd", amount_received: 1235, application_fee_amount: 123,
  });
  await event("checkout.session.completed", session, "acct_Unrelated");
  assert.equal((await item()).listing.soldAt, null);
  await event("checkout.session.completed", session, account.id);
  assert.equal((await (await request(receipt(), 200)).json()).status, "pending");
  payment.intents.get("pi_Fixture").application_fee_amount = 124;
  await event("checkout.session.completed", session, account.id);
  await event("checkout.session.completed", session, account.id);
  const paid = await (await request(receipt(), 200)).json();
  assert.deepEqual(paid, { listingId: id, title: "Reading chair", amountCents: 1235, status: "paid" });
  await request("/orders/" + orderId + "/success?session_id=" + session.id, 200);
  const sold = await item();
  assert.ok(sold.listing.soldAt);
  assert.equal(sold.canBuy, false);
  await post("/api/stripe/checkout", 409, { listingId: id, orderId: randomUUID() });
});
