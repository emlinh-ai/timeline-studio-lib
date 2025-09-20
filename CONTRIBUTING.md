# Contributing to React Timeline Library

Thank you for your interest in contributing to React Timeline Library! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 16 or higher
- npm, yarn, or pnpm
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/timeline-studio-lib.git
   cd timeline-studio-lib
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

## 📋 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(timeline): add drag and drop functionality
fix(virtualization): resolve memory leak in large datasets
docs(readme): update installation instructions
test(clips): add unit tests for clip validation
```

Types:
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance tasks

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Clip.test.tsx
```

### Writing Tests

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **Accessibility Tests**: Use `jest-axe` for a11y testing
- **Performance Tests**: Test with large datasets

Example test structure:
```typescript
describe('Clip Component', () => {
  it('should render clip with correct duration', () => {
    // Test implementation
  });

  it('should handle click events', () => {
    // Test implementation
  });

  it('should be accessible', async () => {
    // Accessibility test with jest-axe
  });
});
```

## 🎨 Code Style

### TypeScript

- Use strict TypeScript configuration
- Provide comprehensive type definitions
- Document complex types with JSDoc comments
- Prefer interfaces over types for object shapes

### React

- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow React best practices for accessibility

### CSS

- Use CSS modules or styled-components
- Follow BEM naming convention for CSS classes
- Ensure responsive design
- Support dark/light themes

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Include usage examples in documentation
- Document complex algorithms and business logic
- Keep README.md up to date

### API Documentation

When adding new features:

1. Update TypeScript interfaces
2. Add JSDoc comments with examples
3. Update README.md with usage examples
4. Add to the main export in `src/index.ts`

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Reproduction**: Steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, Node.js version, etc.
6. **Code Sample**: Minimal reproduction case

Use the bug report template:

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 91
- Node.js: 16.14.0
- React: 18.2.0
- Library Version: 1.0.0

## Code Sample
```tsx
// Minimal reproduction case
```

## 💡 Feature Requests

For new features:

1. **Use Case**: Describe the problem you're solving
2. **Proposed Solution**: How you'd like it to work
3. **Alternatives**: Other solutions you've considered
4. **Implementation**: Technical approach (if you have ideas)

## 🔍 Code Review Process

### Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: Explain what and why
3. **Testing**: Include tests for new functionality
4. **Documentation**: Update docs if needed
5. **Breaking Changes**: Clearly mark breaking changes

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass and coverage is maintained
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Accessibility requirements met
- [ ] Performance impact considered

## 🏗️ Architecture Guidelines

### Component Structure

```
src/
├── components/          # React components
│   ├── Timeline/       # Main timeline component
│   ├── Clip/          # Clip-related components
│   └── __tests__/     # Component tests
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── theme/              # Theme system
└── eventBus/           # Event bus implementation
```

### Performance Considerations

- Use React.memo for expensive components
- Implement virtualization for large datasets
- Debounce scroll and zoom events
- Optimize bundle size
- Monitor memory usage

### Accessibility Requirements

- Support keyboard navigation
- Provide ARIA labels and descriptions
- Ensure proper focus management
- Test with screen readers
- Support high contrast mode

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Build artifacts generated
- [ ] npm publish completed

## 🤝 Community

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Discord/Slack**: Real-time community chat (if available)

## 📄 License

By contributing to React Timeline Library, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to React Timeline Library! 🎉