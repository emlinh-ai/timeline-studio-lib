# React Timeline Library - Development Context

## Project Overview

This is a React component library for building video editing timelines. Key features include:

*   **Multi-track Support**: Video, audio, text, and overlay tracks
*   **Drag & Drop**: Intuitive clip manipulation
*   **Event Bus Architecture**: For loose coupling with external components
*   **TypeScript First**: Full type safety
*   **Virtualization**: For handling large datasets efficiently
*   **Customizable**: Themes and custom clip renderers
*   **Undo/Redo**: Complete history management
*   **Responsive & Accessible**: Mobile-friendly and WCAG compliant

The library is designed as a reusable component that can be integrated into larger React applications.

## Technology Stack

*   **Language**: TypeScript
*   **Framework**: React (16.8+)
*   **Bundler**: Rollup
*   **Package Manager**: npm/yarn/pnpm
*   **Testing**: Jest with Testing Library
*   **Linting**: ESLint with TypeScript and React plugins
*   **Build Tools**: PostCSS, Autoprefixer, Terser

## Project Structure

```
src/
├── components/          # React components
├── eventBus/           # Event bus implementation
├── state/              # State management (reducer, hooks, validation)
├── styles/             # CSS styles
├── theme/              # Theme system
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
index.ts                # Main entry point
setupTests.ts           # Test setup
```

## Building and Running

### Scripts

*   `npm run dev` / `npm run build:watch`: Build in watch mode for development
*   `npm run build`: Production build
*   `npm run build:dev`: Development build
*   `npm test`: Run tests
*   `npm run test:watch`: Run tests in watch mode
*   `npm run test:coverage`: Run tests with coverage
*   `npm run lint`: Lint code
*   `npm run lint:fix`: Fix linting issues
*   `npm run type-check`: TypeScript type checking
*   `npm run analyze`: Bundle analysis
*   `npm run size`: Check bundle size

### Build Outputs

The build process (Rollup) generates files in the `dist/` directory:

*   `index.js` - CommonJS build
*   `index.esm.js` - ES Module build
*   `index.d.ts` - Bundled TypeScript declarations
*   `styles/timeline.css` - Processed CSS

## Development Conventions

### Code Style

*   TypeScript with strict configuration
*   Functional React components with hooks
*   React.memo for performance optimization
*   ESLint for code style enforcement
*   JSDoc comments for public APIs

### Testing

*   Jest with Testing Library for React component testing
*   Jest with jsdom environment
*   Accessibility testing with jest-axe
*   Target 80% coverage for branches, functions, lines, and statements

### Architecture

*   Component-based structure in `src/components/`
*   Event bus pattern for loose coupling
*   Redux-like state management with useReducer/useContext
*   Virtualization for performance with large datasets
*   Theme system for customization

### Git Workflow

*   Branch naming: `feature/description`, `fix/description`, etc.
*   Conventional Commits for commit messages
*   Pull requests with review checklist

## Contributing

See `CONTRIBUTING.md` for detailed guidelines on:

*   Development setup
*   Code style
*   Testing
*   Documentation
*   Pull request process
*   Release process

The project follows Semantic Versioning and has a code of conduct.