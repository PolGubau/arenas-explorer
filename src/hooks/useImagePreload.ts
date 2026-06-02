"use client";

import type { ImagesIndex } from "@/types/graph";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Hard cap so a stalled CDN response (or a silently 404'd image) can't keep
 * the user staring at a loading overlay forever. After this elapses we mark
 * the preload as ready regardless of how many images actually loaded — Sigma's
 * NodeImageProgram will still lazy-load anything missing on first render.
 */
const MAX_WAIT_MS = 8_000;

interface PreloadResult {
	loaded: number;
	total: number;
	progress: number;
	ready: boolean;
}

/**
 * Warms the browser's HTTP cache for every image referenced by `imagesIndex`
 * using `new Image()`. This avoids the visible "pop-in" where Sigma uploads
 * texture stubs and gradually swaps them for real photos as fetches resolve.
 *
 * Errors are counted toward `loaded` on purpose: progress must always reach
 * `total` so the consumer's `ready` flag flips deterministically.
 */
export function useImagePreload(imagesIndex: ImagesIndex): PreloadResult {
	const urls = useMemo(() => {
		const set = new Set<string>();
		for (const meta of Object.values(imagesIndex)) {
			if (meta?.url) set.add(meta.url);
		}
		return Array.from(set);
	}, [imagesIndex]);

	const total = urls.length;
	const [loaded, setLoaded] = useState(0);
	const [timedOut, setTimedOut] = useState(false);
	const cancelledRef = useRef(false);

	useEffect(() => {
		cancelledRef.current = false;
		setLoaded(0);
		setTimedOut(false);

		if (total === 0) return;

		const images: HTMLImageElement[] = [];
		const bump = () => {
			if (cancelledRef.current) return;
			setLoaded((n) => n + 1);
		};

		for (const url of urls) {
			const img = new Image();
			img.decoding = "async";
			img.loading = "eager";
			img.onload = bump;
			img.onerror = bump;
			img.src = url;
			images.push(img);
		}

		const timer = window.setTimeout(() => {
			if (cancelledRef.current) return;
			setTimedOut(true);
		}, MAX_WAIT_MS);

		return () => {
			cancelledRef.current = true;
			window.clearTimeout(timer);
			for (const img of images) {
				img.onload = null;
				img.onerror = null;
			}
		};
	}, [urls, total]);

	const ready = total === 0 || loaded >= total || timedOut;
	const progress = total === 0 ? 1 : Math.min(loaded / total, 1);

	return { loaded, total, progress, ready };
}
