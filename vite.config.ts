import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		host: "::",
		port: 8080,
		hmr: {
			overlay: false,
		},
		proxy: {
			// Proxy to bypass CORS for n8n.teky.vn during development
			"/n8n-proxy": {
				target: "https://n8n.teky.vn",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/n8n-proxy/, ""),
				secure: false,
			},
		},
	},
	worker: {
		format: "es",
	},
	plugins: [react(), mode === "development" && componentTagger()].filter(
		Boolean,
	),
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
}));
