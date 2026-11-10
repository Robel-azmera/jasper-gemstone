import type { Metadata } from "next";
import { BookingForm } from "@/components/booking/BookingForm";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description: "Request a private gemstone viewing, consultation, custom inquiry or business appointment.",
};

export default function BookConsultationPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-5 md:py-20">
      <aside className="md:col-span-2">
        <p className="eyebrow">Private appointments</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">Book a consultation</h1>
        <p className="mt-5 leading-relaxed text-stone">
          Meet our specialists to view stones in person, seek expert guidance, source something
          bespoke, or discuss a business matter.
        </p>
        <ul className="mt-8 space-y-4 text-sm text-stone">
          {[
            ["Personal", "Every request is answered by a member of our team."],
            ["No obligation", "A request is not a commitment to buy or a confirmed booking."],
            ["Discreet", "Your details are used only to respond to you."],
          ].map(([title, text]) => (
            <li key={title} className="border-l border-gold pl-4">
              <span className="block text-ink">{title}</span>
              {text}
            </li>
          ))}
        </ul>
      </aside>
      <section className="border border-line bg-white p-5 sm:p-8 md:col-span-3">
        <BookingForm mode="consultation" />
      </section>
    </div>
  );
}
