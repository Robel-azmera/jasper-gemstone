import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-pearl">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-serif text-2xl text-garnet">Jasper Gemstone</p>
          <p className="mt-2 text-sm text-stone">Fine natural gemstones, hand-selected.</p>
        </div>
        <div className="text-sm text-stone">
          <p className="eyebrow mb-3">Visit</p>
          <p>Private viewings by appointment only.</p>
          <Link href="/book" className="mt-2 inline-block text-garnet underline-offset-4 hover:underline">
            Book a consultation
          </Link>
        </div>
        <div className="text-sm text-stone">
          <p className="eyebrow mb-3">Information</p>
          <ul className="space-y-1">
            <li><Link href="/gemstones" className="hover:text-garnet">The collection</Link></li>
            <li><Link href="/privacy" className="hover:text-garnet">Privacy notice</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-line py-5 text-center text-xs tracking-widest text-mist uppercase">
        Jasper Gemstone
      </p>
    </footer>
  );
}
