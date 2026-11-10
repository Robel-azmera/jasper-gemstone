"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  BOOKING_TYPE_LABELS,
  CONSULTATION_BOOKING_TYPES,
  CONTACT_PREFERENCES,
  LIMITS,
  TIME_SLOTS,
  formatTimeSlot,
  type BookingType,
  type ContactPreference,
} from "@/lib/bookings/constants";
import { bookingRequestSchema, fieldErrors } from "@/lib/bookings/validation";
import { BookingConfirmation } from "./BookingConfirmation";
import { Spinner } from "./Spinner";
import { Turnstile } from "./Turnstile";

export interface BookingFormGemstone {
  id: string;
  name: string;
  variety?: string;
  available: boolean;
}

type Props =
  | { mode: "gemstone"; gemstone: BookingFormGemstone; onClose?: () => void }
  | { mode: "consultation"; gemstone?: undefined; onClose?: () => void };

interface Values {
  bookingType: BookingType | "";
  customerName: string;
  phoneNumber: string;
  email: string;
  contactPreference: ContactPreference | "";
  preferredDate: string;
  preferredTime: string;
  message: string;
  consent: boolean;
  website: string; // honeypot
}

const CONSULTATION_DESCRIPTIONS: Record<(typeof CONSULTATION_BOOKING_TYPES)[number], string> = {
  gemstone_viewing: "See stones from the collection in person",
  gemstone_consultation: "Expert advice on choosing or valuing a gem",
  custom_inquiry: "Source a specific stone, colour or size",
  business_appointment: "Trade, partnership or general business",
};

function localToday(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const noopSubscribe = () => () => {};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function BookingForm(props: Props) {
  const { mode, onClose } = props;
  const gem = props.mode === "gemstone" ? props.gemstone : undefined;
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const initial: Values = {
    bookingType: mode === "gemstone" ? (gem?.available ? "gemstone_reservation" : "gemstone_viewing") : "",
    customerName: "",
    phoneNumber: "",
    email: "",
    contactPreference: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
    consent: false,
    website: "",
  };

  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();

  const startedAt = useRef(0);
  const idempotencyKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  // Today's date only exists in the browser (empty during server render).
  const minDate = useSyncExternalStore(noopSubscribe, localToday, () => "");

  function buildPayload(v: Values) {
    return {
      kind: mode,
      gemstoneId: gem?.id,
      bookingType: v.bookingType,
      customerName: v.customerName,
      phoneNumber: v.phoneNumber,
      email: v.email,
      contactPreference: v.contactPreference,
      preferredDate: v.preferredDate,
      preferredTime: v.preferredTime,
      message: v.message,
      consent: v.consent,
      website: v.website,
      startedAt: startedAt.current,
      idempotencyKey: idempotencyKey.current ?? "0000000000000000",
      turnstileToken,
    };
  }

  function validate(v: Values) {
    const result = bookingRequestSchema.safeParse(buildPayload(v));
    return result.success ? {} : fieldErrors(result.error);
  }

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    const next = { ...values, [key]: value };
    // Picking "Email" as contact method without an email shouldn't scream
    // until the visitor tries to submit.
    setValues(next);
    if (attempted) setErrors(validate(next));
    setServerError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // prevent double submission
    setAttempted(true);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setServerError("Please complete the verification check.");
      return;
    }

    // Reuse the key across retries of the same submission so the server can
    // de-duplicate; a fresh key is only created after a successful booking.
    idempotencyKey.current ??= newKey();
    inFlight.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(values)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        referenceNumber?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (res.ok && data.referenceNumber) {
        setReference(data.referenceNumber);
        return;
      }
      if (data.fieldErrors) setErrors(data.fieldErrors);
      setServerError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setServerError("We couldn't reach our server. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function reset() {
    setValues(initial);
    setErrors({});
    setAttempted(false);
    setReference(null);
    idempotencyKey.current = null;
    startedAt.current = Date.now();
  }

  if (reference) {
    return (
      <BookingConfirmation
        referenceNumber={reference}
        mode={mode}
        gemstoneName={gem?.name}
        onClose={onClose}
        onAnother={reset}
      />
    );
  }

  const err = (name: string) =>
    errors[name] ? (
      <p id={id(`${name}-error`)} className="field-error" role="alert">
        {errors[name]}
      </p>
    ) : null;
  const aria = (name: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? id(`${name}-error`) : undefined,
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Selected gemstone (read only) */}
      {gem && (
        <div className="border border-line bg-pearl/60 px-4 py-3">
          <p className="field-label mb-1">Selected gemstone</p>
          <p className="font-serif text-xl text-ink">{gem.name}</p>
          {!gem.available && (
            <p className="mt-1 text-sm text-warning">
              This stone is currently not available. You can still enquire — we&apos;ll let you know
              about its status or similar stones.
            </p>
          )}
        </div>
      )}

      {/* Request type */}
      <fieldset>
        <legend className="field-label">I would like to</legend>
        {mode === "gemstone" ? (
          <div className="grid grid-cols-2 gap-2">
            {(["gemstone_reservation", "gemstone_viewing"] as const).map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-center border px-3 py-3 text-center text-sm transition ${
                  values.bookingType === t
                    ? "border-garnet bg-garnet-soft text-garnet"
                    : "border-line bg-white hover:border-stone"
                }`}
              >
                <input
                  type="radio"
                  name="bookingType"
                  value={t}
                  checked={values.bookingType === t}
                  onChange={() => update("bookingType", t)}
                  className="sr-only"
                />
                {t === "gemstone_reservation" ? "Request a reservation" : "Arrange a viewing"}
              </label>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {CONSULTATION_BOOKING_TYPES.map((t) => (
              <label
                key={t}
                className={`cursor-pointer border px-4 py-3 transition ${
                  values.bookingType === t
                    ? "border-garnet bg-garnet-soft"
                    : "border-line bg-white hover:border-stone"
                }`}
              >
                <input
                  type="radio"
                  name="bookingType"
                  value={t}
                  checked={values.bookingType === t}
                  onChange={() => update("bookingType", t)}
                  className="sr-only"
                />
                <span className={`block text-sm ${values.bookingType === t ? "text-garnet" : "text-ink"}`}>
                  {BOOKING_TYPE_LABELS[t]}
                </span>
                <span className="mt-0.5 block text-xs text-stone">{CONSULTATION_DESCRIPTIONS[t]}</span>
              </label>
            ))}
          </div>
        )}
        {err("bookingType")}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={id("customerName")} className="field-label">
            Full name <span className="text-garnet">*</span>
          </label>
          <input
            id={id("customerName")}
            name="customerName"
            className="field-input"
            autoComplete="name"
            maxLength={LIMITS.name}
            value={values.customerName}
            onChange={(e) => update("customerName", e.target.value)}
            {...aria("customerName")}
          />
          {err("customerName")}
        </div>

        <div>
          <label htmlFor={id("phoneNumber")} className="field-label">
            Phone number <span className="text-garnet">*</span>
          </label>
          <input
            id={id("phoneNumber")}
            name="phoneNumber"
            type="tel"
            inputMode="tel"
            className="field-input"
            autoComplete="tel"
            placeholder="+251 9…"
            maxLength={LIMITS.phone}
            value={values.phoneNumber}
            onChange={(e) => update("phoneNumber", e.target.value)}
            {...aria("phoneNumber")}
          />
          {err("phoneNumber")}
        </div>

        <div>
          <label htmlFor={id("email")} className="field-label">
            Email{" "}
            {values.contactPreference === "Email" ? (
              <span className="text-garnet">*</span>
            ) : (
              <span className="normal-case tracking-normal text-mist">(optional)</span>
            )}
          </label>
          <input
            id={id("email")}
            name="email"
            type="email"
            inputMode="email"
            className="field-input"
            autoComplete="email"
            maxLength={LIMITS.email}
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            {...aria("email")}
          />
          {err("email")}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">
          Preferred contact method <span className="text-garnet">*</span>
        </legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {CONTACT_PREFERENCES.map((p) => (
            <label
              key={p}
              className={`flex min-h-12 cursor-pointer items-center justify-center border text-sm transition ${
                values.contactPreference === p
                  ? "border-garnet bg-garnet-soft text-garnet"
                  : "border-line bg-white hover:border-stone"
              }`}
            >
              <input
                type="radio"
                name="contactPreference"
                value={p}
                checked={values.contactPreference === p}
                onChange={() => update("contactPreference", p)}
                className="sr-only"
              />
              {p}
            </label>
          ))}
        </div>
        {err("contactPreference")}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={id("preferredDate")} className="field-label">
            Preferred date <span className="normal-case tracking-normal text-mist">(optional)</span>
          </label>
          <input
            id={id("preferredDate")}
            name="preferredDate"
            type="date"
            className="field-input"
            min={minDate || undefined}
            value={values.preferredDate}
            onChange={(e) => update("preferredDate", e.target.value)}
            {...aria("preferredDate")}
          />
          {err("preferredDate")}
        </div>
        <div>
          <label htmlFor={id("preferredTime")} className="field-label">
            Preferred time <span className="normal-case tracking-normal text-mist">(optional)</span>
          </label>
          <select
            id={id("preferredTime")}
            name="preferredTime"
            className="field-input"
            value={values.preferredTime}
            onChange={(e) => update("preferredTime", e.target.value)}
            {...aria("preferredTime")}
          >
            <option value="">Any time</option>
            {TIME_SLOTS.map((s) => (
              <option key={s} value={s}>
                {formatTimeSlot(s)}
              </option>
            ))}
          </select>
          {err("preferredTime")}
        </div>
      </div>

      <div>
        <label htmlFor={id("message")} className="field-label">
          Message <span className="normal-case tracking-normal text-mist">(optional)</span>
        </label>
        <textarea
          id={id("message")}
          name="message"
          rows={4}
          className="field-input resize-y"
          maxLength={LIMITS.message}
          placeholder={
            mode === "gemstone"
              ? "Anything we should know — setting ideas, questions about the stone…"
              : "Tell us what you are looking for…"
          }
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          {...aria("message")}
        />
        <div className="flex justify-between">
          {err("message") ?? <span />}
          <span className="mt-1 text-xs text-mist">
            {values.message.length}/{LIMITS.message}
          </span>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input
          id={id("website")}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      {/* Privacy notice */}
      <div className="border-l-2 border-gold bg-pearl/60 px-4 py-3 text-sm leading-relaxed text-stone">
        <p>
          <strong className="font-medium text-ink">Your privacy.</strong> We use the details you
          provide only to respond to this request. They are visible solely to the Jasper Gemstone
          team, never shared or sold, and you can ask us to delete them at any time.{" "}
          <Link href="/privacy" target="_blank" className="text-garnet underline underline-offset-2">
            Privacy notice
          </Link>
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-ink">
          <input
            type="checkbox"
            name="consent"
            checked={values.consent}
            onChange={(e) => update("consent", e.target.checked)}
            className="mt-1 h-4 w-4 accent-garnet"
            {...aria("consent")}
          />
          <span>I agree to be contacted about this request.</span>
        </label>
        {err("consent")}
      </div>

      {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />}

      {serverError && (
        <div role="alert" className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="space-y-3">
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Sending request…
            </>
          ) : mode === "gemstone" ? (
            "Send request"
          ) : (
            "Request consultation"
          )}
        </button>
        <p className="text-center text-xs text-stone">
          This is a request, not a confirmed booking. Availability is confirmed personally by our team.
        </p>
      </div>
    </form>
  );
}
