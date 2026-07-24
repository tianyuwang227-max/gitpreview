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
- **Monitoring** - Prometheus metrics, structured logging

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

## Usage

### Web UI

1. Open http://localhost:3000
2. Enter GitHub URL (e.g., `https://github.com/vitejs/vite`)
3. Select mode: Auto / Screenshot / Live Preview
4. Click "Preview"

### API

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

### Browser Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/preview` | POST | Create preview |
| `/api/health` | GET | Health check |
| `/api/governance` | GET | Governance status |
| `/api/governance/alerts` | GET | Get alerts |
| `/api/governance/cleanup` | POST | Manual cleanup |
| `/api/discovery` | GET | Discovery data |
| `/api/search?q=xxx` | GET | Search projects |
| `/api/trending` | GET | Trending projects |
| `/api/categories` | GET | Categories |
| `/api/favorites` | GET/POST | Favorites |
| `/api/history` | GET | Browsing history |
| `/metrics` | GET | Prometheus metrics |

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

## Monitoring

### Prometheus Metrics

```bash
curl http://localhost:3000/metrics
```

Available metrics:
- `http_request_duration_seconds` - Request duration
- `http_requests_total` - Total requests
- `preview_created_total` - Previews created
- `active_previews` - Active previews
- `ws_connections` - WebSocket connections
- `disk_usage_bytes` - Disk usage
- `task_queue_size` - Task queue size

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:
- Status (healthy/degraded/unhealthy)
- Disk usage
- Memory usage
- Process count
- Task queue stats

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Recommended:** VPS with Node.js 18+

**Not supported:** Vercel, Netlify, Lambda

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific suite
npm test -- --testPathPattern=governance
```

## Project Structure

```
gitpreview/
├── src/
│   ├── modules/
│   │   ├── github-repo-manager/
│   │   ├── screenshot-service/
│   │   ├── preview-runner/
│   │   ├── repo-analyzer/
│   │   ├── discovery/
│   │   ├── history/
│   │   ├── governance/
│   │   ├── websocket/
│   │   └── web-server/
│   ├── config/
│   └── utils/
├── public/
├── extension/
├── tests/
└── docs/
```

## License

MIT
