"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Image,
  ImageIcon,
  Input,
  LoaderCircle,
  MapPin,
  Plus,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/lib/imports";
import { PhotoField, type PhotoSelection } from "./photo-field";
import { categories, findCategory, formatPrice, isEmail, parsePrice, type Listing } from "@/lib/listings";
import { MarketplaceRequestError, marketplaceRequest, postMarketplace } from "@/lib/marketplace-client";

const emptyFields = {
  title: "",
  description: "",
  price: "",
  category: "",
  sellerEmail: "",
  location: "",
};

type Field = keyof typeof emptyFields;
type FieldErrors = Partial<Record<Field | "photo", string>>;

function FieldError({ field, error }: { field: Field; error?: string }) {
  return error ? <p id={`${field}-error`} className="text-xs font-medium text-destructive" role="alert">{error}</p> : null;
}

export function CreateListingForm() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState(emptyFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [photo, setPhoto] = useState<PhotoSelection | null>(null);
  const uploadedPhoto = useRef<string | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [stage, setStage] = useState<"uploading" | "publishing" | null>(null);
  const [saveError, setSaveError] = useState("");

  const category = findCategory(fields.category);
  const price = parsePrice(fields.price);

  function changeField(field: Field, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function fieldState(field: Field) {
    return {
      "aria-invalid": !!errors[field],
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage || readingPhoto) return;

    const title = fields.title.trim();
    const description = fields.description.trim();
    const sellerEmail = fields.sellerEmail.trim();
    const nextErrors: FieldErrors = {};
    if (errors.photo || !photo) nextErrors.photo = errors.photo || "Add one photo of your item.";
    if (!title) nextErrors.title = "Enter a title for your listing.";
    if (price === null) nextErrors.price = "Enter a price from $0 to $99,999,999.99 with up to two decimals.";
    if (!category) nextErrors.category = "Choose a category.";
    if (!description) nextErrors.description = "Describe the item you are selling.";
    if (!isEmail(sellerEmail)) nextErrors.sellerEmail = "Enter a valid email address.";

    setErrors(nextErrors);
    setSaveError("");
    if (!photo || !category || price === null || Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus());
      return;
    }

    try {
      if (uploadedPhoto.current !== photo.uploadId) {
        setStage("uploading");
        const body = new FormData();
        body.set("uploadId", photo.uploadId);
        body.set("photo", photo.file);
        await marketplaceRequest<{ uploadId: string }>("/api/upload", { method: "POST", body });
        uploadedPhoto.current = photo.uploadId;
      }

      setStage("publishing");
      const { listing } = await postMarketplace<{ listing: Listing }>("/api/listings", {
        uploadId: photo.uploadId,
        title,
        description,
        price,
        category: category.slug,
        sellerEmail,
        location: fields.location.trim(),
      });
      router.push(`/item/${listing.id}?published=1`);
    } catch (error) {
      if (error instanceof MarketplaceRequestError && error.status === 422) uploadedPhoto.current = null;
      setSaveError((error as Error).message);
      setStage(null);
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-8">
      <Card className="gap-0 rounded-2xl p-5 shadow-none sm:p-7">
        <form ref={form} noValidate onSubmit={submit} className="space-y-5">
          <fieldset disabled={stage !== null} className="min-w-0 space-y-5">
            <PhotoField
              imageUrl={photo?.url ?? ""}
              disabled={stage !== null}
              error={errors.photo}
              onChange={(value) => {
                setPhoto(value);
                setErrors((previous) => ({ ...previous, photo: undefined }));
              }}
              onError={(message) => setErrors((previous) => ({ ...previous, photo: message || undefined }))}
              onBusy={setReadingPhoto}
            />

            <div className="space-y-2">
              <label htmlFor="listing-title" className="text-sm font-semibold">Title</label>
              <Input id="listing-title" placeholder="e.g. Vintage teak lounge chair" value={fields.title} maxLength={255} required onChange={(event) => changeField("title", event.target.value)} {...fieldState("title")} className="h-10" />
              <FieldError field="title" error={errors.title} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label htmlFor="listing-price" className="text-sm font-semibold">Price (USD)</label>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="listing-price"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fields.price}
                    maxLength={16}
                    required
                    onChange={(event) => changeField("price", event.target.value)}
                    onBlur={() => {
                      if (price !== null) changeField("price", price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    }}
                    {...fieldState("price")}
                    className="h-10 pl-7"
                  />
                </div>
                <FieldError field="price" error={errors.price} />
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor="listing-category" className="text-sm font-semibold">Category</label>
                <Select value={fields.category} onValueChange={(value) => changeField("category", value)} required>
                  <SelectTrigger id="listing-category" {...fieldState("category")} className="w-full data-[size=default]:h-10">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>{categories.map(({ label, slug }) => <SelectItem key={slug} value={slug}>{label}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError field="category" error={errors.category} />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="listing-description" className="text-sm font-semibold">Description</label>
              <Textarea id="listing-description" placeholder="Describe the condition, size, or what’s included." value={fields.description} maxLength={5000} required onChange={(event) => changeField("description", event.target.value)} {...fieldState("description")} className="min-h-24" />
              <FieldError field="description" error={errors.description} />
            </div>

            <div className="space-y-2">
              <label htmlFor="listing-email" className="text-sm font-semibold">Seller email</label>
              <Input id="listing-email" type="email" autoComplete="email" placeholder="you@example.com" value={fields.sellerEmail} maxLength={255} required onChange={(event) => changeField("sellerEmail", event.target.value)} {...fieldState("sellerEmail")} aria-describedby={errors.sellerEmail ? "sellerEmail-error email-help" : "email-help"} className="h-10" />
              <p id="email-help" className="text-xs text-muted-foreground">Your email appears in the listing details.</p>
              <FieldError field="sellerEmail" error={errors.sellerEmail} />
            </div>

            <div className="space-y-2">
              <label htmlFor="listing-location" className="text-sm font-semibold">Location <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input id="listing-location" placeholder="e.g. Oakland, CA" value={fields.location} maxLength={255} onChange={(event) => changeField("location", event.target.value)} className="h-10" />
            </div>
          </fieldset>

          <div className="space-y-2 border-t pt-5">
            <Button type="submit" disabled={stage !== null || readingPhoto} className="h-10 w-full rounded-lg">
              {stage || readingPhoto ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <Plus aria-hidden="true" />}
              {stage === "uploading" ? "Uploading photo…" : stage === "publishing" ? "Publishing…" : readingPhoto ? "Reading photo…" : "Publish listing"}
            </Button>
            {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          </div>
        </form>
      </Card>

      <aside aria-label="Live preview" className="space-y-3 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold">Listing preview</h2>
        <Card className="gap-0 overflow-hidden rounded-2xl p-0 shadow-none">
          <div className="relative grid aspect-[1.6] place-items-center bg-muted">
            {photo ? (
              <Image src={photo.url} alt={fields.title.trim() || "Listing preview"} fill unoptimized className="object-contain" />
            ) : (
              <div className="grid justify-items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon aria-hidden="true" className="size-8" /> Your listing photo
              </div>
            )}
          </div>
          <div className="space-y-2 p-5 sm:p-6">
            {category && <Badge variant="secondary" className="bg-accent text-accent-foreground">{category.label}</Badge>}
            <p className="text-2xl font-bold tracking-tight">{price === null ? "$0.00" : formatPrice(price)}</p>
            <h3 className="text-xl font-semibold wrap-anywhere">{fields.title.trim() || "Your listing title"}</h3>
            {fields.location.trim() && <p className="flex items-start gap-1.5 text-xs wrap-anywhere text-muted-foreground"><MapPin aria-hidden="true" className="size-3.5 shrink-0" />{fields.location.trim()}</p>}
            <p className="line-clamp-4 text-sm wrap-anywhere whitespace-pre-wrap text-muted-foreground">{fields.description.trim() || "Your description will appear here."}</p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
