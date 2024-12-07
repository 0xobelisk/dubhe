"use strict";
const { i18n } = require('./next-i18next.config');

module.exports = {
    experimental: {
        // outputStandalone: true,
        ignoreDuringBuilds: true,
    },
    staticPageGenerationTimeout: 1000,
    eslint: {
        dirs: ['src'], // Only run ESLint on the 'pages' and 'utils' directories during production builds (next build)
    },
    i18n,
}

