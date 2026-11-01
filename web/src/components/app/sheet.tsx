"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Bottom sheet on phones, centred dialog on desktop. Slides 320ms, no bounce (DESIGN.md §6). */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="max-h-[92dvh] w-full overflow-y-auto border-t border-hairline bg-paper px-5 pb-8 pt-4 md:max-w-[440px] md:border md:p-8"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-[3px] w-9 bg-ink/15 md:hidden" />
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-normal tracking-[-0.02em]">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="p-1 transition-opacity hover:opacity-70">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-60">{label}</span>
      <span className="tabular text-right">{children}</span>
    </div>
  );
}

export function PreviewNotice({ children }: { children: ReactNode }) {
  return <div className="mt-6 border border-hairline bg-mist p-4 text-sm leading-relaxed text-ink-70">{children}</div>;
}
