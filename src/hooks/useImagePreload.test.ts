import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ImagesIndex } from "@/types/graph";
import { useImagePreload } from "./useImagePreload";

// ── Mock Image ────────────────────────────────────────────────────────────────

type MockImg = {
	src: string;
	decoding: string;
	loading: string;
	onload: (() => void) | null;
	onerror: (() => void) | null;
};

let imageInstances: MockImg[] = [];

function setupImageMock() {
	imageInstances = [];
	vi.stubGlobal(
		"Image",
		class {
			src = "";
			decoding = "";
			loading = "";
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			constructor() {
				// Push `this` so tests can fire load/error events
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				imageInstances.push(this as any);
			}
		},
	);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeIndex(count: number): ImagesIndex {
	return Object.fromEntries(
		Array.from({ length: count }, (_, i) => [
			`node-${i}`,
			{
				url: `https://example.com/img-${i}.jpg`,
				caption: "",
				year_csv: 2020,
				nom_fons: "",
				nom_arxiu: "",
				toponims: "",
				noms_propis: "",
			},
		]),
	);
}

function img(i: number): MockImg {
	const instance = imageInstances[i];
	if (!instance) throw new Error(`No image instance at index ${i}`);
	return instance;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
//
// IMPORTANT: always define the `ImagesIndex` object OUTSIDE the renderHook
// callback. If it's created inline (e.g. `renderHook(() => useImagePreload(makeIndex(n)))`),
// every re-render produces a new object reference, useMemo([imagesIndex])
// recomputes, and the effect re-runs — resetting progress to 0 and creating
// new Image instances in an uncontrolled loop.

describe("useImagePreload", () => {
	beforeEach(() => {
		setupImageMock();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("is immediately ready when index is empty", () => {
		const index: ImagesIndex = {};
		const { result } = renderHook(() => useImagePreload(index));
		expect(result.current.ready).toBe(true);
		expect(result.current.progress).toBe(1);
		expect(result.current.total).toBe(0);
		expect(result.current.loaded).toBe(0);
	});

	it("starts at most CONCURRENCY (8) requests in parallel", () => {
		const index = makeIndex(20);
		renderHook(() => useImagePreload(index));
		expect(imageInstances).toHaveLength(8);
	});

	it("starts the next request after each completion", () => {
		const index = makeIndex(10);
		renderHook(() => useImagePreload(index));
		expect(imageInstances).toHaveLength(8); // 0-7 in flight

		act(() => {
			img(0).onload?.();
		}); // completes → picks up #8
		expect(imageInstances).toHaveLength(9);

		act(() => {
			img(1).onerror?.();
		}); // error also counts → picks up #9
		expect(imageInstances).toHaveLength(10);

		act(() => {
			img(2).onload?.();
		}); // queue drained — no more URLs
		expect(imageInstances).toHaveLength(10);
	});

	it("increments loaded for both onload and onerror", () => {
		const index = makeIndex(4);
		const { result } = renderHook(() => useImagePreload(index));

		act(() => {
			img(0).onload?.();
		});
		expect(result.current.loaded).toBe(1);

		act(() => {
			img(1).onerror?.();
		});
		expect(result.current.loaded).toBe(2);
	});

	it("becomes ready when all images finish loading", () => {
		const index = makeIndex(4);
		const { result } = renderHook(() => useImagePreload(index));
		expect(result.current.ready).toBe(false);

		// snapshot before firing (all 4 are seeded upfront since 4 < CONCURRENCY)
		const initial = [...imageInstances];
		act(() => {
			for (const i of initial) i.onload?.();
		});
		expect(result.current.ready).toBe(true);
		expect(result.current.progress).toBe(1);
	});

	it("becomes ready when all images error (errors count toward total)", () => {
		const index = makeIndex(3);
		const { result } = renderHook(() => useImagePreload(index));
		const initial = [...imageInstances];

		act(() => {
			for (const i of initial) i.onerror?.();
		});
		expect(result.current.ready).toBe(true);
	});

	it("becomes ready after the 8 s timeout with pending images", () => {
		const index = makeIndex(10);
		const { result } = renderHook(() => useImagePreload(index));
		expect(result.current.ready).toBe(false);

		act(() => {
			vi.advanceTimersByTime(8_001);
		});
		expect(result.current.ready).toBe(true);
	});

	it("reports correct progress ratio as images complete", () => {
		const index = makeIndex(4);
		const { result } = renderHook(() => useImagePreload(index));

		act(() => {
			img(0).onload?.();
		});
		expect(result.current.progress).toBeCloseTo(0.25);

		act(() => {
			img(1).onload?.();
		});
		expect(result.current.progress).toBeCloseTo(0.5);
	});

	it("nulls callbacks and ignores completions after unmount", () => {
		const index = makeIndex(4);
		const { result, unmount } = renderHook(() => useImagePreload(index));
		const snapshot = [...imageInstances];

		unmount();

		for (const i of snapshot) {
			expect(i.onload).toBeNull();
			expect(i.onerror).toBeNull();
		}
		expect(result.current.loaded).toBe(0); // no state mutations after cancel
	});

	it("deduplicates identical URLs across different node keys", () => {
		const sharedMeta = {
			url: "https://example.com/same.jpg",
			caption: "",
			year_csv: 2020,
			nom_fons: "",
			nom_arxiu: "",
			toponims: "",
			noms_propis: "",
		};
		const index: ImagesIndex = { a: sharedMeta, b: sharedMeta, c: sharedMeta };
		renderHook(() => useImagePreload(index));
		expect(imageInstances).toHaveLength(1);
	});
});
