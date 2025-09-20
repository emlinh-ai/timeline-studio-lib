const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const { default: dts } = require('rollup-plugin-dts');
const postcss = require('rollup-plugin-postcss');
const { default: terser } = require('@rollup/plugin-terser');
const analyze = require('rollup-plugin-analyzer');

const packageJson = require('./package.json');

const isProduction = process.env.NODE_ENV === 'production';

// Base configuration for both builds
const baseConfig = {
  input: 'src/index.ts',
  external: ['react', 'react-dom'],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    postcss({
      extract: true,
      minimize: isProduction,
      sourceMap: true,
      modules: false,
      autoModules: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/types',
      rootDir: 'src',
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.stories.tsx'],
    }),
  ],
};

module.exports = [
  // ES Module build
  {
    ...baseConfig,
    output: {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      ...baseConfig.plugins,
      ...(isProduction ? [
        terser({
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
          },
          mangle: {
            reserved: ['React', 'ReactDOM'],
          },
        }),
        analyze({
          summaryOnly: true,
          limit: 10,
        }),
      ] : []),
    ],
  },
  
  // CommonJS build
  {
    ...baseConfig,
    output: {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      ...baseConfig.plugins,
      ...(isProduction ? [
        terser({
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
          },
          mangle: {
            reserved: ['React', 'ReactDOM'],
          },
        }),
      ] : []),
    ],
  },
  
  // TypeScript declarations bundle
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [
      dts({
        respectExternal: true,
      }),
    ],
    external: ['react', 'react-dom', /\.css$/],
  },
];