import React from 'react'

const config = {
    logo: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/favicon.ico" alt="Orchable Logo" style={{ width: '24px', height: '24px' }} />
            <span style={{ fontWeight: 800 }}>Orchable Docs</span>
        </div>
    ),
    project: {
        link: 'https://github.com/MakeXYZFun/orchable',
    },
    docsRepositoryBase: 'https://github.com/MakeXYZFun/orchable/tree/main/apps/docs',
    footer: {
        text: (
            <span>
                {new Date().getFullYear()} ©{' '}
                <a href="https://orchable.app" target="_blank" rel="noopener noreferrer">
                    Orchable
                </a>
            </span>
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
            <link rel="icon" href="/favicon.ico" />
        </>
    ),
    primaryHue: { dark: 200, light: 200 },
}

export default config
