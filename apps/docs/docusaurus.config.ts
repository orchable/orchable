import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
	title: "Orchable Docs",
	tagline: "Orchestrate Anything. Automatically.",
	favicon: "img/favicon.ico",

	future: {
		v4: true,
	},

	url: "https://docs.orchable.app",
	baseUrl: "/",

	organizationName: "orchable",
	projectName: "orchable",

	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",

	i18n: {
		defaultLocale: "en",
		locales: ["en", "vi"],
		localeConfigs: {
			en: {
				label: "English",
			},
			vi: {
				label: "Tiếng Việt",
			},
		},
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					routeBasePath: "/", // Serve docs at site root
					editUrl:
						"https://github.com/orchable/orchable/tree/main/apps/docs/",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		image: "img/docusaurus-social-card.jpg",
		colorMode: {
			defaultMode: "dark",
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "Orchable",
			logo: {
				alt: "Orchable Logo",
				src: "img/logo.svg",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "tutorialSidebar",
					position: "left",
					label: "Documentation",
				},
				{
					href: "https://orchable.app/hub",
					label: "Hub",
					position: "left",
				},
				{
					href: "https://github.com/orchable/orchable",
					label: "GitHub",
					position: "right",
				},
				{
					type: "localeDropdown",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Docs",
					items: [
						{
							label: "Technical Overview",
							to: "/",
						},
						{
							label: "System Architecture",
							to: "/architecture/system-overview",
						},
						{
							label: "Prompt Authoring",
							to: "/guides/prompt-authoring",
						},
					],
				},
				{
					title: "Product",
					items: [
						{
							label: "Launch App",
							href: "https://orchable.app",
						},
						{
							label: "Community Hub",
							href: "https://orchable.app/hub",
						},
					],
				},
				{
					title: "More",
					items: [
						{
							label: "GitHub",
							href: "https://github.com/orchable/orchable",
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} Orchable. Built with Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
