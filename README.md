# GitPreview

Preview GitHub repositories instantly - both screenshots and live running previews.

[![CI](https://github.com/tianyuwang227-max/gitpreview/actions/workflows/ci.yml/badge.svg)](https://github.com/tianyuwang227-max/gitpreview/actions/workflows/ci.yml)

## Features

- **Repository Preview** - Get screenshots or live running previews
- **Project Detection** - Auto-detect Node.js, Python, Static projects
- **Framework Support** - Vite, React, Vue, Next.js, Svelte, Express, etc.
- **Real-time Progress** - WebSocket-based progress updates
- **Security** - Sandboxed execution, rate limiting, resource quotas
- **Governance** - Disk monitoring, auto-cleanup, access stats

## Quick Start

```bash
# Clone
git clone https://github.com/tianyuwang227-max/gitpreview.git
cd gitpreview

# Install
npm ci

# Build
npm run build

# Run
npm start
```

Open http://localhost:3000

## API

### Preview

```bash
# Screenshot mode
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/vitejs/vite", "mode": "screenshot"}'

# Live preview mode
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/vitejs/vite", "mode": "live"}'

# Auto mode (tries live, falls back to screenshot)
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/vitejs/vite", "mode": "auto"}'
```

### Governance

```bash
# Get system status
curl http://localhost:3000/api/governance

# Get alerts
curl http://localhost:3000/api/governance/alerts

# Manual cleanup
curl -X POST http://localhost:3000/api/governance/cleanup
```

## Modules

| Module | Description |
|--------|-------------|
| `github-repo-manager` | URL validation, cloning, caching |
| `screenshot-service` | Puppeteer screenshots |
| `preview-runner` | Process isolation, port management |
| `repo-analyzer` | README, tech stack, license detection |
| `discovery` | Trending, search, categories, favorites |
| `history` | Browsing history, statistics |
| `governance` | Disk quota, rate limiting, cleanup |
| `websocket` | Real-time progress updates |
| `web-server` | Express API, static files |

## Security

- Environment variable isolation (no GITHUB_TOKEN leaked)
- Command injection prevention
- Script whitelist (blocks postinstall, preinstall, etc.)
- Process tree termination
- Concurrent preview limits
- Rate limiting per IP

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Recommended:** VPS with Node.js 18+

**Not supported:** Vercel, Netlify, Lambda (no long-running processes)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific suite
npm test -- --testPathPattern=governance
```

## License

MIT
