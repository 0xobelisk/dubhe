import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { useRouter } from 'next/router'
import { useConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <img
    src="/dubhe-logo.svg"
    alt="Dubhe Engine Logo"
    style={{ height: '32px' }}
  />,
  project: {
    link: 'https://github.com/0xobelisk/dubhe',
  },
  chat: {
    link: 'https://discord.gg/nveFk3p6za',
  },
  docsRepositoryBase: 'https://github.com/0xobelisk/dubhe-docs',
  footer: {
    content: 'Apache 2024 © Obelisk Labs.',
  },
  banner: {
    key: "v1-0-0-rc1 pre-mainnet released",
  // text: <a href="/docs/release-notes">🎉 v1.6.5 Released →</a>,
    content: <a href="https://github.com/0xobelisk/dubhe/releases">🎉 v1.1.0-Mainnet Released →</a>,
  },
  navigation: {
    prev: true,
    next: true
  },
  head() {
    const { asPath, defaultLocale, locale } = useRouter()
    const { frontMatter } = useConfig()
    const url =
      'https://my-app.com' +
      (defaultLocale === locale ? asPath : `/${locale}${asPath}`)
 
    return (
      <>
        <meta property="og:url" content={url} />
        <meta property="og:title" content={frontMatter.title || 'Dubhe'} />
        <meta
          property="og:description"
          content={frontMatter.description || 'The next site builder'}
        />
      </>
    )
  }
}

export default config
