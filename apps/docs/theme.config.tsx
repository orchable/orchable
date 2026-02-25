import React from 'react'

const config = {
    logo: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/icon.jpg" alt="Orchable Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
            <span style={{ fontWeight: 800 }}>Orchable Docs</span>
        </div>
    ),
    project: {
        link: 'https://github.com/orchable/orchable',
    },
    docsRepositoryBase: 'https://github.com/orchable/orchable/tree/main/apps/docs',
    footer: {
        text: (
            <div className="flex w-full flex-col items-center justify-between gap-4 md:flex-row">
                <p className="text-sm">
                    Made with ❤️ by <strong>Thành</strong> — an indie hacker building Orchable in public.
                </p>
                <p className="text-sm text-gray-500">
                    © {new Date().getFullYear()} Orchable.
                </p>
            </div>
        ),
    },
    sidebar: {
        defaultMenuCollapseLevel: 1,
    },
    head: (
        <>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta property="og:title" content="Orchable Docs" />
            <meta property="og:description" content="Technical documentation for the Orchable AI Orchestration Platform" />
            <link rel="icon" href="/icon.jpg" type="image/jpeg" />
        </>
    ),
    primaryHue: { dark: 200, light: 200 },
}

export default config
