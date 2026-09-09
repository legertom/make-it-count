"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { FeedbackPanel } from "./FeedbackPanel";

/**
 * Floating "Feedback" button. The panel stays mounted once opened so a
 * half-finished conversation survives closing and reopening it.
 */
export function FeedbackLauncher() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const show = () => {
    setMounted(true);
    setOpen(true);
  };

  return (
    <>
      {!open && (
        <button type="button" className="fb-launch" onClick={show} data-screenshot-hide="">
          <MessageSquare size={16} aria-hidden="true" />
          Feedback
        </button>
      )}
      {mounted && (
        <div hidden={!open}>
          <FeedbackPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
