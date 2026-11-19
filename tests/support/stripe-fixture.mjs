import assert from "node:assert/strict";

export const testStripeKey = "sk_test_marketplace_fixture";
export const testWebhookSecret = "whsec_marketplace_fixture";

export function createPaymentsFixture({ listings, json, readBody }) {
  const owners = new Map();
  const accounts = new Map();
  const orders = new Map();
  const sessions = new Map();
  const intents = new Map();
  const stripeAccounts = new Map();
  const onboardingLinks = [];

  function dbMatches(row, query) {
    return [...query].every(([column, operator]) => {
      if (operator.startsWith("eq.")) return String(row[column]) === operator.slice(3);
      if (operator.startsWith("lte.")) return row[column] <= operator.slice(4);
      return true;
    });
  }

  function rpc(response, name, args) {
    const item = listings.get(args.p_listing_id);
    const account = [...accounts.values()].find((entry) =>
      entry.owner_hash === owners.get(item?.id) && entry.seller_email === item?.seller_email.toLowerCase());
    const eligible = !item?.sold_at && item?.price >= 0.5 && account?.payments_enabled && account?.charges_enabled && account?.payouts_enabled && account?.details_submitted;
    if (name === "marketplace_listing_can_buy") return json(response, 200, Boolean(eligible));
    if (name === "reserve_marketplace_order") {
      if (!item || item.sold_at) return json(response, 400, { message: "listing_unavailable" });
      const active = [...orders.values()].find((row) => row.listing_id === item.id && row.status === "pending");
      if (active) return json(response, 200, active);
      if (!eligible) return json(response, 400, { message: "listing_not_purchasable" });
      if (orders.has(args.p_order_id)) return json(response, 409, { code: "23505" });
      const order = {
        id: args.p_order_id, listing_id: item.id, title: item.title, amount_cents: Math.round(item.price * 100),
        platform_fee_cents: Math.round(item.price * 10), stripe_account_id: account.stripe_account_id,
        currency: "usd", status: "pending", stripe_checkout_id: null,
        expires_at: new Date(Date.now() + 45 * 60_000).toISOString(),
      };
      orders.set(order.id, order);
      return json(response, 200, order);
    }
    const order = orders.get(args.p_order_id);
    assert.equal(name, "confirm_marketplace_order");
    assert.equal(order.status, "pending");
    assert.equal(order.stripe_checkout_id, args.p_checkout_id);
    assert.equal(order.stripe_account_id, args.p_account_id);
    assert.equal(order.amount_cents, args.p_amount);
    assert.equal(order.platform_fee_cents, args.p_fee);
    order.status = "paid";
    order.stripe_payment_intent_id = args.p_intent_id;
    listings.get(order.listing_id).sold_at = new Date().toISOString();
    return json(response, 200, true);
  }

  async function stripeRequest(request, response, path) {
    assert.equal(request.headers.authorization, "Bearer " + testStripeKey);
    const form = new URLSearchParams((await readBody(request)).toString());
    const accountId = request.headers["stripe-account"];
    if (path === "/v1/accounts") {
      assert.equal(form.get("controller[stripe_dashboard][type]"), "full");
      assert.equal(form.get("controller[losses][payments]"), "stripe");
      const account = { id: "acct_Fixture" + (stripeAccounts.size + 1), email: form.get("email") };
      stripeAccounts.set(account.id, account);
      return json(response, 200, account);
    }
    if (path === "/v1/account_links") {
      assert.ok(stripeAccounts.has(form.get("account")));
      onboardingLinks.push(form);
      return json(response, 200, { url: "https://connect.stripe.com/setup/fixture" });
    }
    if (path.startsWith("/v1/accounts/")) return json(response, 200, stripeAccounts.get(path.split("/").at(-1)));
    if (path === "/v1/checkout/sessions") {
      const orderId = form.get("metadata[marketplace_order_id]");
      const order = orders.get(orderId);
      assert.equal(accountId, order.stripe_account_id);
      assert.equal(request.headers["idempotency-key"], "marketplace-checkout-" + orderId);
      assert.equal(form.get("allowed_payment_method_types[0]"), "card");
      assert.equal(form.get("line_items[0][price_data][unit_amount]"), String(order.amount_cents));
      assert.equal(form.get("payment_intent_data[application_fee_amount]"), String(order.platform_fee_cents));
      assert.ok(form.get("success_url").includes(orderId + "/success?session_id={CHECKOUT_SESSION_ID}"));
      assert.ok(form.get("cancel_url").endsWith(`/item/${order.listing_id}#checkout-cancelled-${order.id}`));
      const id = "cs_test_Fixture" + (sessions.size + 1);
      const session = {
        id, url: "https://checkout.stripe.com/c/pay/" + id, livemode: false, status: "open",
        payment_status: "unpaid", metadata: { marketplace_order_id: orderId }, currency: "usd", amount_total: order.amount_cents,
      };
      sessions.set(id, session);
      return json(response, 200, session);
    }
    if (path.startsWith("/v1/checkout/sessions/") && path.endsWith("/expire")) {
      const session = sessions.get(path.split("/").at(-2));
      assert.equal(accountId, orders.get(session.metadata.marketplace_order_id).stripe_account_id);
      if (session.status !== "open") return json(response, 400, { error: { type: "invalid_request_error", message: "Session already closed" } });
      session.status = "expired";
      return json(response, 200, session);
    }
    if (path.startsWith("/v1/checkout/sessions/")) {
      const session = sessions.get(path.split("/").at(-1));
      assert.equal(accountId, orders.get(session.metadata.marketplace_order_id).stripe_account_id);
      return json(response, 200, session);
    }
    if (path.startsWith("/v1/payment_intents/")) {
      const intent = intents.get(path.split("/").at(-1));
      assert.equal(accountId, intent.account);
      return json(response, 200, intent);
    }
    return json(response, 404, { error: { type: "invalid_request_error", message: "Unexpected Stripe fixture route" } });
  }

  async function handle(request, response, url, serviceRole) {
    const { pathname, searchParams } = url;
    if (pathname.startsWith("/v1/")) {
      await stripeRequest(request, response, pathname);
      return true;
    }
    const target = pathname.split("/").at(-1);
    const table = target === "orders" ? orders : target === "seller_payment_accounts" ? accounts : null;
    if (!table && !pathname.startsWith("/rest/v1/rpc/")) return false;
    if (!serviceRole) {
      json(response, 403, { code: "42501" });
    } else if (!table) {
      rpc(response, target, JSON.parse((await readBody(request)).toString()));
    } else if (request.method === "POST") {
      const row = JSON.parse((await readBody(request)).toString());
      const key = row.owner_hash + ":" + row.seller_email;
      if (!table.has(key)) table.set(key, { stripe_checked_at: "-infinity", payments_enabled: true, ...row });
      response.writeHead(201).end();
    } else {
      const matching = [...table.values()].filter((row) => dbMatches(row, searchParams));
      if (request.method === "PATCH") {
        const changes = JSON.parse((await readBody(request)).toString());
        matching.forEach((row) => Object.assign(row, changes));
      }
      json(response, 200, matching);
    }
    return true;
  }

  return { owners, accounts, orders, sessions, intents, stripeAccounts, onboardingLinks, handle };
}
