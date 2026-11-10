import Link from "next/link";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="max-w-md text-center">
          <p className="eyebrow">Page not found</p>
          <h1 className="mt-3 font-serif text-5xl text-ink">This stone has moved on</h1>
          <p className="mt-4 text-stone">
            The page you&apos;re looking for doesn&apos;t exist, or the gemstone is no longer listed.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/gemstones" className="btn btn-primary">
              View the collection
            </Link>
            <Link href="/book" className="btn btn-outline">
              Book a consultation
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
