"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { BookingsProvider, useBookings } from "@/components/admin/BookingsProvider";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Toasts } from "@/components/admin/Toasts";
import { Spinner } from "@/components/booking/Spinner";
import logo from "../../../../public/brand/jasper-logo.jpg";

function NavLink({ href, children, badge }: { href: string; children: ReactNode; badge?: number }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition ${
        active ? "bg-garnet-soft text-garnet" : "text-stone hover:text-ink"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
      {badge ? (
        <span className="rounded-full bg-warning px-2 py-0.5 text-[0.68rem] font-medium text-white">{badge}</span>
      ) : null}
    </Link>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { state, signOut } = useAdminAuth();
  const { counts } = useBookings();
  const email = state.status === "admin" ? state.user.email : "";

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src={logo} alt="" className="h-9 w-auto mix-blend-multiply" sizes="48px" />
              <span className="hidden font-serif text-lg text-garnet sm:inline">Admin</span>
            </Link>
            <nav className="flex gap-1">
              <NavLink href="/admin">Dashboard</NavLink>
              <NavLink href="/admin/bookings" badge={counts.Pending}>
                Bookings
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="hidden text-xs text-stone md:inline">{email}</span>
            <button type="button" onClick={signOut} className="btn btn-ghost btn-sm px-2">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <Toasts />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { state } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "signed-out" || state.status === "forbidden" || state.status === "unconfigured") {
      router.replace("/admin/login");
    }
  }, [state.status, router]);

  if (state.status !== "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-stone">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <BookingsProvider>
      <Shell>{children}</Shell>
    </BookingsProvider>
  );
}
