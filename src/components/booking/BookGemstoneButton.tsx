"use client";

import { useEffect, useRef, useState } from "react";
import { BookingForm, type BookingFormGemstone } from "./BookingForm";

/** Prominent "Reserve This Gemstone" button that opens the booking modal. */
export function BookGemstoneButton({ gemstone }: { gemstone: BookingFormGemstone }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-primary w-full sm:w-auto sm:min-w-72"
        onClick={() => setOpen(true)}
      >
        {gemstone.available ? "Reserve This Gemstone" : "Enquire About This Gemstone"}
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // backdrop click
        }}
        aria-labelledby="booking-dialog-title"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/50 backdrop:backdrop-blur-sm sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl"
      >
        {open && (
          <div className="animate-rise-in flex h-full flex-col bg-ivory sm:h-auto sm:max-h-[92dvh] sm:shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-8 sm:py-6">
              <div>
                <p className="eyebrow">{gemstone.available ? "Reservation request" : "Enquiry"}</p>
                <h2 id="booking-dialog-title" className="mt-1 font-serif text-2xl text-ink sm:text-3xl">
                  {gemstone.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="-mr-2 p-2 text-stone transition hover:text-garnet"
                aria-label="Close booking form"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
              <BookingForm mode="gemstone" gemstone={gemstone} onClose={close} />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
