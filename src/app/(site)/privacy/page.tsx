import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 leading-relaxed text-stone sm:px-6">
      <p className="eyebrow">Privacy</p>
      <h1 className="mt-3 font-serif text-5xl text-ink">Privacy notice</h1>
      <p className="mt-6">
        This notice explains how Jasper Gemstone handles the information you share when you request a
        gemstone reservation, viewing or consultation.
      </p>

      <h2 className="mt-10 font-serif text-2xl text-ink">What we collect</h2>
      <p className="mt-3">
        Your name, phone number, optional email address, preferred contact method, preferred
        appointment date and time, your message, and the gemstone you enquired about.
      </p>

      <h2 className="mt-10 font-serif text-2xl text-ink">How we use it</h2>
      <p className="mt-3">
        Only to respond to your request, confirm availability and arrange your appointment. We do not
        sell or share your details with third parties, and we do not use them for marketing without
        your permission.
      </p>

      <h2 className="mt-10 font-serif text-2xl text-ink">Who can see it</h2>
      <p className="mt-3">
        Your request is stored securely and is accessible only to authorised members of the Jasper
        Gemstone team. It is never displayed publicly.
      </p>

      <h2 className="mt-10 font-serif text-2xl text-ink">Your choices</h2>
      <p className="mt-3">
        You can ask us at any time to correct or delete your information. Quote your booking
        reference number when you contact us.
      </p>
    </article>
  );
}
