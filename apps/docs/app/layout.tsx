import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const pageMap = await getPageMap()
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <Head>
                <link rel="icon" href="/icon.jpg" type="image/jpeg" />
            </Head>
            <body>
                <Layout
                    navbar={
                        <Navbar
                            logo={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img src="/icon.jpg" alt="Orchable Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                                    <b>Orchable Docs</b>
                                </div>
                            }
                        />
                    }
                    footer={<Footer>2026 © Orchable</Footer>}
                    pageMap={pageMap}
                >
                    {children}
                </Layout>
            </body>
        </html>
    )
}
