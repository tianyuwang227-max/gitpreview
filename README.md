# GitPreview

> Preview GitHub projects without deployment. Explore, analyze, and preview repositories instantly.

[![CI](https://github.com/tianyuwang227-max/gitpreview/actions/workflows/ci.yml/badge.svg)](https://github.com/tianyuwang227-max/gitpreview/actions/workflows/ci.yml)

## Features

- **Instant Preview** - Get repository screenshots without cloning
- **Live Preview** - Run projects in Docker containers (experimental)
- **Repository Analysis** - README summary, directory structure, tech stack detection
- **Discovery** - Browse trending projects, search, and categorize
- **Favorites** - Save and manage your favorite repositories

## Quick Start

```bash
# Clone the repository
git clone https://github.com/tianyuwang227-max/gitpreview.git
cd gitpreview

# Install dependencies
npm install

# Start the server
npm run dev
```

Open http://localhost:3000

## Docker Deployment

```bash
# Build image
docker build -t gitpreview .

# Run container
docker run -p 3000:3000 -e GITHUB_TOKEN=your_token gitpreview
```

## API Documentation

### Preview

```bash
# Synchronous preview
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/facebook/react"}'

# Asynchronous preview with Docker
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/facebook/react", "async": true, "useDocker": true}'
```

### Discovery

```bash
# Get trending projects
curl http://localhost:3000/api/trending

# Search projects
curl http://localhost:3000/api/search?q=react

# Get categories
curl http://localhost:3000/api/categories
```

### Favorites

```bash
# Get favorites
curl http://localhost:3000/api/favorites

# Add favorite
curl -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{"fullName": "facebook/react"}'

# Remove favorite
curl -X DELETE http://localhost:3000/api/favorites/facebook/react
```

## Project Structure

```
gitpreview/
├── src/
│   ├── modules/
│   │   ├── github-repo-manager/   # GitHub URL validation & cloning
│   │   ├── screenshot-service/    # Puppeteer screenshots
│   │   ├── docker-runner/         # Docker container management
│   │   ├── repo-analyzer/         # Repository analysis
│   │   ├── discovery/             # Project discovery & favorites
│   │   └── web-server/            # Express API server
│   ├── config/                    # Configuration
│   └── utils/                     # Utilities (logger, errors, cache, task-queue)
├── public/                        # Frontend pages
├── tests/                         # Test suites
├── Dockerfile                     # Docker deployment
└── .github/workflows/             # CI/CD
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Runtime | Node.js |
| Web Framework | Express |
| Git Operations | simple-git |
| Screenshots | Puppeteer |
| Containerization | Docker |
| Testing | Jest |
| Linting | ESLint |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| GITHUB_TOKEN | GitHub API token | - |
| CLONE_BASE_DIR | Clone directory | ./projects |
| CLONE_TIMEOUT | Clone timeout (ms) | 60000 |
| PORT | Server port | 3000 |

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=validator

# Run with coverage
npm test -- --coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details
