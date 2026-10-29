import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-[#45493f] bg-[#171a15] p-6 text-[#e8e5dd] shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#3a2920] text-[#d1a878]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="font-display text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#a6a79e]">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-full border border-[#45493f] px-4 py-2 text-sm disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-full bg-[#9a5146] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
