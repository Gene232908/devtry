"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Warns before leaving a page that has unsaved edits.
 *
 * Covers both ways out. A full navigation (tab close, reload, typing a new URL)
 * is handled by the browser's own beforeunload prompt. In-app navigation gets
 * no such prompt, so link clicks are intercepted in the CAPTURE phase — that
 * runs before Next.js's own Link handler, which is the only point at which the
 * navigation can still be stopped.
 *
 * Returns the href the user tried to reach, so the caller can show a dialog and
 * either continue there or stay put. Does nothing at all while `dirty` is false,
 * so a clean page carries no listeners.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Required by older browsers to actually raise the prompt.
      e.returnValue = "";
    }

    function onClick(e: MouseEvent) {
      // Leave modified clicks alone — the user is deliberately opening a new
      // tab or window, so this page is not going anywhere.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      // Anything that does not replace this page: external links, phone/mail
      // handlers, and in-page anchors.
      if (!href || /^(https?:|tel:|mailto:|#)/i.test(href)) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const stay = useCallback(() => setPendingHref(null), []);

  const leave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [pendingHref, router]);

  return { pendingHref, stay, leave };
}
