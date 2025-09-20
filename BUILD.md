# Build Configuration

This document describes the build configuration for the React Timeline Library.

## Overview

The library uses Rollup as the primary bundler with comprehensive TypeScript support, CSS processing, and optimization features.

## Build Outputs

The build process generates the following files in the `dist/` directory:

### JavaScript Bundles
- `index.js` - CommonJS build (87.5 KB minified, 24.63 KB gzipped)
- `index.esm.js` - ES Module build (84.7 KB minified, 24.67 KB gzipped)
- `*.js.map` - Source maps for debugging

### CSS Files
- `index.css` - Processed and minified CSS (3.2 KB)
- `index.esm.css` - ES module CSS build
- `*.css.map` - CSS source maps

### TypeScript Declarations
- `index.d.ts` - Bundled TypeScript declarations (693 KB)
- `types/` - Individual declaration files

## Build Features

### 1. Rollup Configuration
- **Multiple output formats**: CommonJS and ES modules
- **Tree-shaking**: Automatic dead code elimination
- **External dependencies**: React and ReactDOM marked as peer dependencies
- **Source maps**: Generated for all builds

### 2. TypeScript Support
- **Declaration generation**: Comprehensive `.d.ts` files
- **Type checking**: Strict TypeScript configuration
- **Path mapping**: Support for `@/*` imports
- **Build-specific config**: Separate `tsconfig.build.json`

### 3. CSS Processing
- **PostCSS pipeline**: Autoprefixer and optimization
- **CSS extraction**: Separate CSS files for better caching
- **Minification**: Production CSS minification with cssnano
- **Source maps**: CSS source map generation

### 4. Production Optimizations
- **Code minification**: Terser for JavaScript minification
- **Console removal**: Debug statements removed in production
- **Bundle analysis**: Size analysis and reporting
- **Compression**: Optimal gzip compression

## Build Scripts

```bash
# Development build (unminified)
npm run build:dev

# Production build (minified and optimized)
npm run build

# Watch mode for development
npm run build:watch

# Clean build artifacts
npm run clean

# Analyze bundle size
npm run analyze

# Check bundle size limits
npm run size
```

## Configuration Files

### `rollup.config.js`
Main build configuration with:
- Plugin configuration (TypeScript, PostCSS, Terser)
- Output format definitions
- External dependency handling
- Production/development environment handling

### `postcss.config.js`
CSS processing configuration:
- Autoprefixer for browser compatibility
- cssnano for production minification
- Source map generation

### `tsconfig.json` & `tsconfig.build.json`
TypeScript configuration:
- Strict type checking
- ES2020 target
- React JSX support
- Declaration file generation

### `.browserslistrc`
Browser support definition:
- Modern browser support (> 0.5% usage)
- Last 2 versions
- No IE 11 support

## Bundle Size Monitoring

The build includes bundle size monitoring with the following limits:
- **CommonJS build**: < 100 KB
- **ES Module build**: < 100 KB

Current sizes (gzipped):
- CommonJS: 24.63 KB ✅
- ES Module: 24.67 KB ✅

## Performance Optimizations

### Tree Shaking
- ES modules enable automatic tree shaking
- Unused code is eliminated from final bundles
- External dependencies are properly marked

### Code Splitting
- CSS is extracted to separate files
- TypeScript declarations are bundled separately
- Source maps are generated as separate files

### Compression
- Terser minification in production
- CSS minification with cssnano
- Gzip-optimized output

## Development vs Production

### Development Build
- Unminified code for debugging
- Preserved console statements
- Faster build times
- Full source maps

### Production Build
- Minified and optimized code
- Console statements removed
- Bundle size analysis
- Optimized for deployment

## Browser Compatibility

The build targets modern browsers:
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions + ESR
- Safari: Last 2 versions
- No Internet Explorer support

## Troubleshooting

### Common Issues

1. **TypeScript errors**: Check `tsconfig.json` configuration
2. **CSS not loading**: Ensure CSS imports are included
3. **Bundle size exceeded**: Use `npm run analyze` to identify large modules
4. **Missing dependencies**: Check peer dependencies are installed

### Build Verification

To verify the build is working correctly:

```bash
# Run full build
npm run build

# Check bundle sizes
npm run size

# Verify TypeScript declarations
npm run type-check
```

## Future Enhancements

Potential improvements to consider:
- Code splitting for larger applications
- Dynamic imports for lazy loading
- Web Workers for heavy computations
- Service Worker for caching
- Bundle visualization tools