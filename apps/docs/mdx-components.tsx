import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'

// This file is required to use MDX in `app` directory.
export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        ...getThemeComponents(components)
    }
}
