import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { startMarketplaceFixture } from "./support/marketplace-fixture.mjs";

function postJson(data) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}

function postPhoto(id, bytes, type = "image/webp") {
  const body = new FormData();
  body.set("uploadId", id);
  body.set("photo", new Blob([bytes], { type }), "listing-image.webp");
  return { method: "POST", body };
}

test("production marketplace routes", { timeout: 60000 }, async (t) => {
  const fixture = await startMarketplaceFixture();
  t.after(fixture.close);

  async function request(path, status, options) {
    const response = await fetch(`${fixture.origin}${path}`, options);
    assert.equal(response.status, status, path);
    return response;
  }

  const id = randomUUID();
  const draft = {
    uploadId: id,
    title: "Fixture chair",
    description: "A 100% oak reading chair.",
    price: 12.50,
    category: "furniture",
    sellerEmail: "seller@example.com",
    location: "Oakland",
  };
  const photo = await readFile(new URL("./fixtures/marketplace-photo.webp", import.meta.url));

  await t.test("serves the empty catalog and validates requests", async () => {
    const response = await request("/api/listings", 200);
    assert.deepEqual(await response.json(), { listings: [], nextCursor: null });
    assert.match(response.headers.get("cache-control"), /must-revalidate/);
    assert.ok(response.headers.get("etag"));
    await request("/api/listings?category=unknown", 400);
    await request("/api/listings?cursor=invalid", 400);
    await request("/api/listings/invalid", 400);
    await request(`/api/listings/${id}`, 404);
    await request("/api/listings", 400, postJson({ ...draft, price: "12.005" }));
    await request("/api/listings", 400, postJson({ ...draft, sellerEmail: "invalid" }));
    await request("/api/listings", 422, postJson(draft));
    await request("/api/upload", 415, postPhoto(id, photo, "text/plain"));
    await request("/api/upload", 422, postPhoto(id, "corrupt WebP"));
    await request("/api/upload", 413, postPhoto(id, Buffer.alloc(4 * 1024 * 1024 + 1)));
  });

  await t.test("prepares private variants, publishes once, and keeps browse summaries small", async () => {
    const initial = await request("/api/listings", 200);
    const emptyTag = initial.headers.get("etag");
    await initial.json();
    const headers = { "If-None-Match": emptyTag };
    const unchanged = await request("/api/listings", 304, { headers });
    assert.equal(await unchanged.text(), "");

    await request("/api/upload", 201, postPhoto(id, photo));
    await request("/api/upload", 200, postPhoto(id, photo));
    await request(`/api/listings/${id}/photo?size=thumbnail`, 404);

    const published = await request("/api/listings", 201, postJson(draft));
    assert.equal(published.headers.get("cache-control"), "no-store");
    const { listing } = await published.json();
    assert.equal(listing.id, id);
    assert.equal(fixture.listings.get(id).image_url, `/api/listings/${id}/photo`);
    await request("/api/listings", 200, postJson(draft));
    await request("/api/listings", 409, postJson({ ...draft, title: "Different title" }));

    const changed = await request("/api/listings", 200, { headers });
    assert.notEqual(changed.headers.get("etag"), emptyTag);
    await changed.json();

    const { listings } = await (await request("/api/listings?category=furniture&q=100%25%20oak", 200)).json();
    assert.equal(listings.length, 1);
    assert.equal(listings[0].id, id);
    assert.equal("description" in listings[0], false);
    assert.equal("sellerEmail" in listings[0], false);

    const detail = await request(`/api/listings/${id}`, 200);
    const detailTag = detail.headers.get("etag");
    assert.deepEqual((await detail.json()).listing, listing);
    await request(`/api/listings/${id}`, 304, { headers: { "If-None-Match": detailTag } });

    const thumbnail = await request(listings[0].imageUrl, 302, { redirect: "manual" });
    assert.match(thumbnail.headers.get("location"), /\.thumb\.webp\?/);
    assert.match(thumbnail.headers.get("cache-control"), /max-age=300/);
    const result = await fetch(thumbnail.headers.get("location"));
    assert.equal(result.headers.get("content-type"), "image/webp");
    const bytes = Buffer.from(await result.arrayBuffer());
    assert.equal((await sharp(bytes).metadata()).width, 480);
    assert.ok(bytes.length < fixture.photos.get(`${id}.webp`).length);

    fixture.photos.delete(`${id}.thumb.webp`);
    const fallback = await request(listings[0].imageUrl, 302, { redirect: "manual" });
    assert.match(fallback.headers.get("location"), new RegExp(`${id}\\.webp\\?`));
  });

  await t.test("preserves older asset URLs and categories on browse and detail", async () => {
    const seedId = randomUUID();
    const storedPhoto = "/listings/older-listing.webp";
    fixture.listings.set(seedId, {
      id: seedId,
      title: "Seeded reading chair",
      description: "Teak fixture with a bundled photo",
      price: 145,
      category: "collectibles",
      image_url: storedPhoto,
      seller_email: "demo@example.com",
      created_at: new Date().toISOString(),
    });

    const browse = await (await request("/api/listings?q=seeded%20reading", 200)).json();
    assert.equal(browse.listings[0].imageUrl, storedPhoto);
    assert.equal(browse.listings[0].category, "collectibles");
    const detail = await (await request(`/api/listings/${seedId}`, 200)).json();
    assert.equal(detail.listing.imageUrl, storedPhoto);
    assert.equal(detail.listing.category, "collectibles");
    const redirect = await request(`/api/listings/${seedId}/photo?size=thumbnail`, 302, { redirect: "manual" });
    assert.equal(redirect.headers.get("location"), storedPhoto);
  });

  await t.test("combines price and location with keyword and category filters", async () => {
    const filters = new URLSearchParams({ category: "furniture", q: "chair", location: "OAK", minPrice: "12.50", maxPrice: "12.50" });
    const browse = await (await request("/api/listings?" + filters, 200)).json();
    assert.deepEqual(browse.listings.map((listing) => listing.id), [id]);

    for (const excluded of [{ location: "San Francisco" }, { minPrice: "", maxPrice: "0" }, { minPrice: "12.51", maxPrice: "" }]) {
      const params = new URLSearchParams(filters);
      for (const [key, value] of Object.entries(excluded)) params.set(key, value);
      const result = await (await request("/api/listings?" + params, 200)).json();
      assert.deepEqual(result.listings, []);
    }

    await request("/api/listings?minPrice=-1", 400);
    await request("/api/listings?maxPrice=12.001", 400);
    await request("/api/listings?minPrice=20&maxPrice=10", 400);
  });

  await t.test("repairs a partial upload using the photo already stored", async () => {
    const uploadId = randomUUID();
    fixture.faults.thumbnail = true;
    try {
      await request("/api/upload", 502, postPhoto(uploadId, photo));
    } finally {
      fixture.faults.thumbnail = false;
    }
    const original = fixture.photos.get(`${uploadId}.webp`);
    assert.ok(original);
    const differentPhoto = await sharp({ create: { width: 720, height: 720, channels: 3, background: "blue" } }).webp().toBuffer();
    await request("/api/upload", 201, postPhoto(uploadId, differentPhoto));
    assert.deepEqual(fixture.photos.get(`${uploadId}.webp`), original);
    assert.deepEqual(fixture.photos.get(`${uploadId}.thumb.webp`), await sharp(original).resize(480, 480, { fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toBuffer());
  });

  await t.test("stores messages once and restricts message reads", async () => {
    const message = { id: randomUUID(), listingId: id, buyerEmail: "buyer@example.com", message: "Is it available?" };
    await request("/api/messages", 400, postJson({ ...message, buyerEmail: "invalid" }));
    await request("/api/messages", 404, postJson({ ...message, listingId: randomUUID() }));
    await request("/api/messages", 201, postJson(message));
    await request("/api/messages", 200, postJson(message));
    const path = `/api/messages?listingId=${id}`;
    await request(path, 401);
    const inbox = await request(path, 200, { headers: { Authorization: `Bearer ${fixture.adminToken}` } });
    assert.equal(inbox.headers.get("cache-control"), "no-store");
    const { messages } = await inbox.json();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].message, message.message);
  });

  await t.test("paginates without duplicate rows and recovers from an upstream error", async () => {
    for (let index = 0; index < 25; index += 1) {
      const id = randomUUID();
      fixture.listings.set(id, {
        id,
        title: `Cursor fixture ${index}`,
        description: "",
        price: 0,
        category: "electronics",
        created_at: "2025-01-01T00:00:00.000Z",
      });
    }
    const first = await (await request("/api/listings?category=electronics", 200)).json();
    assert.equal(first.listings.length, 24);
    assert.ok(first.nextCursor);
    const next = await (await request(`/api/listings?${new URLSearchParams({ category: "electronics", cursor: first.nextCursor })}`, 200)).json();
    assert.equal(next.listings.length, 1);
    assert.equal(next.nextCursor, null);
    assert.equal(new Set([...first.listings, ...next.listings].map(({ id }) => id)).size, 25);

    fixture.faults.catalog = true;
    try {
      const failed = await request("/api/listings", 502);
      assert.equal(failed.headers.get("cache-control"), "no-store");
      assert.match((await failed.json()).error, /Couldn’t load listings/);
    } finally {
      fixture.faults.catalog = false;
    }
    await request("/api/listings", 200);
  });
});
