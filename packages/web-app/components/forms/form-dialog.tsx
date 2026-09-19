"use client";
import { useLayoutEffect, useId, useRef, type ReactNode } from "react";
import "./forms.css";
export function FormDialog({
  open,
  title,
  onClose,
  children,
  busy = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className="form-dialog"
      aria-labelledby={id}
      onClose={() => {
        // Strict Mode replays the effect: close() queues an event, then
        // showModal() opens again. That stale event must not dismiss it.
        if (ref.current && !ref.current.open) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) ref.current?.close();
      }}
    >
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}
