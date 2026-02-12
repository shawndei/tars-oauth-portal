# TARS OAuth Portal

Multi-provider authentication system with OAuth2 support for Google, GitHub, and Microsoft.

## Features

- 🔐 Secure OAuth2 authentication
- 🔵 Google OAuth integration
- ⚫ GitHub OAuth integration  
- 🟦 Microsoft OAuth integration
- 📱 Responsive design
- ⚡ Built with Next.js

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Production

```bash
npm run build
npm run start
```

## Configuration

Set the backend URL via environment variable:

```
NEXT_PUBLIC_BACKEND_URL=https://tars-oauth-api.railway.app
```

## Architecture

- **Frontend**: Next.js React application
- **Backend**: TARS OAuth API (https://tars-oauth-api.railway.app)
- **Deployment**: Vercel

## Testing

```bash
npm run test
```

## License

MIT
