# Marketplace features

## Browse and search

- Browse published listings in a responsive grid or switch to list view.
- Open **Filters** to narrow results by the seller-entered city or area and an inclusive USD price range. These filters combine with categories and keyword search.
- Filter by Furniture, Electronics, Home & Garden, Clothing, Sports & Outdoors, or Books & Hobbies.
- Search the title, description, and location. Search runs within the current category when one is selected.
- Load more results in newest-first order. The catalog shows loading, empty, and retry states.

## Publish a listing

Open **Sell an item** and select **Item for sale**. Choose or drop a photo, then enter the title, USD price, category, description, and seller email. Location is optional. The live preview updates as you edit the form. The seller email appears on the published detail page.

The form validates required fields and accepts JPEG, PNG, WebP, AVIF, and GIF images up to 4 MiB. It shows separate upload and publish progress, then opens the published listing. A price of zero displays as **Free**.

## View and message a seller

Open a listing to view the larger photo, price, description, category, location, date, and seller contact. The detail page links back to the category.

Choose **Message seller** and enter your email and message. The app saves the message in Supabase and confirms the save. Buyer emails and message contents require administrator access. Administrators can retrieve messages for a listing through the authenticated API documented in the [development guide](DEVELOPMENT_GUIDE.md).

## Buy and sell with Stripe

Open **Seller payments**, enter the email used on your listings, and choose **Connect with Stripe**. Complete Stripe's hosted onboarding in the same browser you use to publish listings. The marketplace uses a private browser cookie to keep other people from linking their Stripe account to listings they didn’t publish.

Eligible listings show **Buy Now** after the seller can accept card payments and receive payouts. **Disconnect Stripe** pauses new checkouts. **Reconnect Stripe** resumes them with the seller's existing account. Stripe Checkout charges the buyer on the connected seller account for the listing price. The marketplace collects a 10% application fee, rounded to the nearest cent. Stripe processing fees are separate. The order page confirms the purchase after Stripe verifies payment by webhook. Sold listings remain visible with a **Sold** label. All payments use Stripe sandbox mode.
