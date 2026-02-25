import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import './globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const pageMap = await getPageMap()
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <Head>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <body>
                <Layout
                    navbar={<Navbar logo={<b>Orchable Docs</b>} />}
                    footer={<Footer>2026 © Orchable</Footer>}
                    pageMap={pageMap}
                >
                    {children}
                </Layout>
            </body>
        </html>
    )
}
