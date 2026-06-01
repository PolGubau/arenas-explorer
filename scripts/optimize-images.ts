/**
 * One-shot image optimizer.
 *
 *   public/images-iaah/*.jpg  →  public/images-thumb/*.webp
 *
 * The originals are 2 GB total (~4 MB/file) — far too large for git/Vercel.
 * Thumbs are ~600 px wide WebP @ q=78, which compresses to ~50–100 KB each,
 * keeping the whole gallery under ~50 MB.
 *
 * Run with: `npm run optimize:images` (or `npx tsx scripts/optimize-images.ts`).
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	statSync,
} from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "public", "images-iaah");
const OUT_DIR = join(ROOT, "public", "images-thumb");

const WIDTH = 600;
const QUALITY = 78;
const CONCURRENCY = 6;

async function main() {
	if (!existsSync(SRC_DIR)) {
		console.error(`Source not found: ${SRC_DIR}`);
		process.exit(1);
	}
	mkdirSync(OUT_DIR, { recursive: true });

	const files = readdirSync(SRC_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
	console.log(`Optimizing ${files.length} images → ${OUT_DIR}`);

	let done = 0;
	let skipped = 0;
	let totalIn = 0;
	let totalOut = 0;

	async function work(name: string) {
		const inPath = join(SRC_DIR, name);
		const outName = `${parse(name).name}.webp`;
		const outPath = join(OUT_DIR, outName);
		const inStat = statSync(inPath);
		totalIn += inStat.size;

		if (existsSync(outPath)) {
			totalOut += statSync(outPath).size;
			skipped++;
			return;
		}

		await sharp(inPath)
			.rotate()
			.resize({ width: WIDTH, withoutEnlargement: true })
			.webp({ quality: QUALITY })
			.toFile(outPath);

		totalOut += statSync(outPath).size;
		done++;
		if ((done + skipped) % 50 === 0) {
			console.log(`  ${done + skipped}/${files.length}`);
		}
	}

	// simple promise pool
	const queue = [...files];
	const workers = Array.from({ length: CONCURRENCY }, async () => {
		while (queue.length) {
			const f = queue.shift();
			if (f) await work(f);
		}
	});
	await Promise.all(workers);

	const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
	console.log(
		`✓ Done · generated ${done} · reused ${skipped} · ${mb(totalIn)} MB → ${mb(totalOut)} MB`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
