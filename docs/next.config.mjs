import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  latex: true,
  search: {
    codeblocks: false
  }
})

export default withNextra({
  reactStrictMode: true,
  transpilePackages: ['supports-color'],
  experimental: {
    esmExternals: 'loose'
  },
  async redirects() {
    return [
      {
        source: '/dubhe/sui/contracts/schemas',
        destination: '/dubhe/sui/contracts/resources',
        permanent: true
      },
      {
        source: '/dubhe/sui/contracts/schemas/:path*',
        destination: '/dubhe/sui/contracts/resources/:path*',
        permanent: true
      }
    ]
  }
})