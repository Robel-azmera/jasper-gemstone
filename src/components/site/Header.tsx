import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/brand/jasper-logo.jpg";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Jasper Gemstone home">
          <Image
            src={logo}
            alt=""
            priority
            className="h-10 w-auto mix-blend-multiply sm:h-12"
            sizes="64px"
          />
          <span className="hidden font-serif text-xl tracking-wide text-garnet sm:inline">
            Jasper Gemstone
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link href="/gemstones" className="btn btn-ghost btn-sm px-2 sm:px-3">
            Gemstones
          </Link>
          <Link href="/collection" className="btn btn-ghost btn-sm hidden px-3 sm:inline-flex">
            Browse
          </Link>
          <Link href="/book" className="btn btn-primary btn-sm">
            <span className="sm:hidden">Consult</span>
            <span className="hidden sm:inline">Book a Consultation</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
