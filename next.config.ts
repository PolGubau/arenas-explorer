import type { NextConfig } from "next";

// Generated artifacts (graph.json, images-index.json) and image thumbs are
// content-stable for the lifetime of a deploy — they're regenerated on every
// build by `prebuild`, so we can mark them immutable at the edge.
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

const SECURITY_HEADERS = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Frame-Options", value: "SAMEORIGIN" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
	},
];

const nextConfig: NextConfig = {
	reactStrictMode: true,
	poweredByHeader: false,
	experimental: {
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "static.arxiusenlinia.cultura.gencat.cat",
			},
		],
	},
	async headers() {
		return [
			{ source: "/:path*", headers: SECURITY_HEADERS },
			{
				source: "/data/:path*.json",
				headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }],
			},
			{
				source: "/images-thumb/:path*",
				headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }],
			},
		];
	},
};

export default nextConfig;
