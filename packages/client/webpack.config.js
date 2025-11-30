const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

// Common configuration shared between dev and prod builds
const commonConfig = {
  entry: './src/sui/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              noEmit: false,
              emitDeclarationOnly: false
            }
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false // Disable the behavior requiring .js extensions
        }
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // Node.js core modules polyfills for browser
      // These may be needed depending on your dependencies
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      process: false,
      path: false,
      fs: false
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist/browser'),
    library: {
      name: 'ObeliskClient',
      type: 'umd',
      umdNamedDefine: true
    },
    globalObject: 'this'
  }
};

// Development build configuration
const devConfig = {
  ...commonConfig,
  mode: 'development',
  devtool: 'source-map',
  output: {
    ...commonConfig.output,
    filename: 'obelisk-client.js'
  }
};

// Production build configuration
const prodConfig = {
  ...commonConfig,
  mode: 'production',
  devtool: 'source-map',
  output: {
    ...commonConfig.output,
    filename: 'obelisk-client.min.js'
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // Keep console for debugging
            drop_debugger: true
          },
          format: {
            comments: false // Remove comments
          }
        },
        extractComments: false
      })
    ]
  }
};

// Export both configurations to build both versions
module.exports = [devConfig, prodConfig];
