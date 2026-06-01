"use client";

import { useState } from "react";
import { Check, Link2 } from "@/lib/icons";

/**
 * Copies the current URL (including selection + filter query params) to
 * the clipboard. Falls back to a no-op when clipboard API is unavailable.
 */
export function ShareButton() {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 1400);
		} catch {
			// silently ignore — clipboard may be blocked in iframes
		}
	};

	return (
		<button
			type="button"
			onClick={copy}
			aria-label="Copiar enlace"
			title="Copiar enlace al portapapeles"
			className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
		>
			{copied ? (
				<Check size={14} className="text-[var(--color-dim-transcripcion)]" />
			) : (
				<Link2 size={14} />
			)}
		</button>
	);
}
