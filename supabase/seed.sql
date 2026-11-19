insert into public.listings (id, title, description, price, category, seller_email, image_url, location, created_at)
values
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480101', 'Vintage teak lounge chair', 'Solid teak frame with olive cushions and a low seat. The armrests have light wear. Local pickup.', 145.00, 'furniture', 'teak-lounge-chair@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480101/photo', 'Oakland, CA', now() - interval '1 day'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480102', 'Wireless over-ear headphones', 'Cream wireless headphones with soft ear pads and a USB-C charging cable.', 68.00, 'electronics', 'wireless-headphones@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480102/photo', 'Berkeley, CA', now() - interval '2 days'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480103', 'City commuter bike', 'Lightweight sage-green commuter bike with recently serviced brakes and tires.', 230.00, 'sports-outdoors', 'city-commuter-bike@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480103/photo', 'San Francisco, CA', now() - interval '3 days'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480104', 'Opal globe floor lamp', 'Walnut floor lamp with an opal glass globe and a warm LED bulb. The base has a few small marks.', 85.00, 'home-garden', 'opal-globe-floor-lamp@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480104/photo', 'Palo Alto, CA', now() - interval '4 days'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480105', 'Vintage denim chore jacket', 'Washed indigo denim with roomy front pockets. Fits like a medium.', 42.00, 'clothing', 'denim-chore-jacket@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480105/photo', 'Alameda, CA', now() - interval '5 days'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480106', 'Handmade stoneware bowls', 'Three nesting bowls with a matte sand glaze. The largest works as a serving bowl.', 34.00, 'home-garden', 'stoneware-bowls@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480106/photo', 'San Mateo, CA', now() - interval '6 days'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480107', 'Compact 35mm film camera', 'Black and silver point-and-shoot with a working flash. Takes standard 35mm film. Battery included.', 95.00, 'electronics', 'compact-film-camera@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480107/photo', 'San Francisco, CA', now() - interval '7 days'),
  ('a1f4566e-9c6e-4db2-9a5f-57f7cb480108', 'Art and design book set', 'Three illustrated hardcovers on interiors, color, and mid-century design. Light shelf wear.', 30.00, 'books-hobbies', 'art-design-books@example.com', '/api/listings/a1f4566e-9c6e-4db2-9a5f-57f7cb480108/photo', 'San Jose, CA', now() - interval '8 days')
on conflict (id) do nothing;

insert into public.messages (id, listing_id, buyer_email, message)
values
  ('df9675b9-3dc5-4d27-b7ac-ee3ace6ef201', 'a1f4566e-9c6e-4db2-9a5f-57f7cb480101', 'demo-buyer-1@example.com', 'Hi, would the lounge chair fit in a compact car?'),
  ('df9675b9-3dc5-4d27-b7ac-ee3ace6ef202', 'a1f4566e-9c6e-4db2-9a5f-57f7cb480102', 'demo-buyer-2@example.com', 'Are the headphones still available for pickup?'),
  ('df9675b9-3dc5-4d27-b7ac-ee3ace6ef203', 'a1f4566e-9c6e-4db2-9a5f-57f7cb480106', 'demo-buyer-3@example.com', 'Could you share the diameter of the largest bowl?')
on conflict (id) do nothing;
