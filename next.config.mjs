/** @type {import('next').NextConfig} */
const nextConfig = {
	// Configure webpack
	webpack: (config) => {
		// Enable WebAssembly
		config.experiments = {
			asyncWebAssembly: true,
			layers: true,
			topLevelAwait: true,
		};
		// Add wasm loader to webpack
		config.module.rules.push({
			test: /\.wasm$/,
			type: "asset/resource",
		});

		return config;
	},

	// Add security headers for SharedArrayBuffer
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					},
				],
			},
		];
	},
};

export default nextConfig;
