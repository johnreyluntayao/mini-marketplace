"use client";

import { type FormEvent, useRef, useState } from "react";
import {
  Button,
  CheckCircle2,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  LoaderCircle,
  MessageCircle,
  Send,
  Textarea,
} from "@/lib/imports";
import { isEmail } from "@/lib/listings";
import { postMarketplace } from "@/lib/marketplace-client";

export function MessageSeller({ listingId, title }: { listingId: string; title: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ email?: string; message?: string }>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [requestError, setRequestError] = useState("");
  const requestId = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;

    const form = event.currentTarget;
    const buyerEmail = email.trim();
    const text = message.trim();
    const emailError = isEmail(buyerEmail) ? undefined : "Enter a valid email address.";
    const messageError = text ? undefined : "Write a message for the seller.";
    setErrors({ email: emailError, message: messageError });

    if (emailError || messageError) {
      setStatus("idle");
      form.querySelector<HTMLElement>(emailError ? "#buyer-email" : "#buyer-message")?.focus();
      return;
    }

    setStatus("saving");
    setRequestError("");
    try {
      requestId.current ??= crypto.randomUUID();
      await postMarketplace<{ id: string }>("/api/messages", {
        id: requestId.current,
        listingId,
        buyerEmail,
        message: text,
      });
      requestId.current = null;
      setEmail("");
      setMessage("");
      setStatus("saved");
    } catch (error) {
      setRequestError((error as Error).message);
      setStatus("error");
    }
  }

  return (
    <Dialog onOpenChange={(open) => { if (open && status === "saved") setStatus("idle"); }}>
      <DialogTrigger asChild>
        <Button className="h-11 w-full rounded-lg font-semibold"><MessageCircle aria-hidden="true" /> Message seller</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-5 sm:max-w-[470px]">
        <DialogHeader>
          <DialogTitle>Message seller</DialogTitle>
          <DialogDescription className="wrap-anywhere">About {title}</DialogDescription>
        </DialogHeader>
        {status === "saved" ? (
          <>
            <p role="status" className="flex items-center gap-2 rounded-lg bg-accent p-3 text-sm font-medium text-accent-foreground">
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" /> Your message was saved.
            </p>
            <DialogFooter><DialogClose asChild><Button>Done</Button></DialogClose></DialogFooter>
          </>
        ) : (
          <form noValidate onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="buyer-email" className="text-sm font-semibold">Your email</label>
              <Input id="buyer-email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={255} value={email} disabled={status === "saving"} aria-invalid={!!errors.email} aria-describedby={errors.email ? "buyer-email-error" : undefined} onChange={(event) => { requestId.current = null; setEmail(event.target.value); setErrors((previous) => ({ ...previous, email: undefined })); }} />
              {errors.email && <p id="buyer-email-error" role="alert" className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="buyer-message" className="text-sm font-semibold">Message</label>
              <Textarea id="buyer-message" placeholder="Hi, is this still available?" required maxLength={5000} value={message} disabled={status === "saving"} aria-invalid={!!errors.message} aria-describedby={errors.message ? "buyer-message-error" : undefined} onChange={(event) => { requestId.current = null; setMessage(event.target.value); setErrors((previous) => ({ ...previous, message: undefined })); }} className="min-h-24" />
              {errors.message && <p id="buyer-message-error" role="alert" className="text-xs text-destructive">{errors.message}</p>}
            </div>
            {status === "error" && <p role="alert" className="text-sm text-destructive">{requestError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <Send aria-hidden="true" />}
                {status === "saving" ? "Saving…" : "Save message"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
