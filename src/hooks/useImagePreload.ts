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

// Browsers cap parallel HTTP/1.1 connections at ~6 per origin. Firing all
// requests at once would queue most of them in the network stack and stall
// the first paint of the canvas; chunking keeps the pipeline busy without
// saturating it and gives the bytes for the first visible nodes priority.
const CONCURRENCY = 8;

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
		let cursor = 0;

		const startNext = () => {
			if (cancelledRef.current) return;
			if (cursor >= urls.length) return;
			const url = urls[cursor++];
			if (!url) return;
			const img = new Image();
			img.decoding = "async";
			img.loading = "eager";
			const done = () => {
				if (cancelledRef.current) return;
				setLoaded((n) => n + 1);
				startNext();
			};
			img.onload = done;
			img.onerror = done;
			img.src = url;
			images.push(img);
		};

		// Seed the pool: `CONCURRENCY` requests in flight at any time. Each
		// completion picks up the next URL until the queue drains.
		for (let i = 0; i < CONCURRENCY; i++) startNext();

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
