# Bug Buddy

A feedback widget system that captures screenshots, allows annotations, and automatically creates GitHub issues.

## Prerequisites

- Node.js >= 24.12.0 < 25.0.0
- pnpm >= 9.0.0
- Docker and Docker Compose (for PostgreSQL)

## Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

   Note: If you encounter Node version issues, use `nvm` to switch to the correct version:

   ```bash
   nvm use
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://bugbuddy:bugbuddy@localhost:5432/bugbuddy?schema=public"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key-here-change-in-production"
   BETTER_AUTH_URL="http://localhost:3000"

   # GitHub OAuth (for user authentication)
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"

   # PostHog (optional)
   NEXT_PUBLIC_POSTHOG_KEY=""
   NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

   # App URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Vercel Blob
   BLOB_READ_WRITE_TOKEN="your-blob-read-write-token"
   ```

3. **Start PostgreSQL database:**

   ```bash
   docker-compose up -d
   ```

4. **Set up Prisma:**

   ```bash
   # Generate Prisma client
   pnpm db:generate

   # Push schema to database (for development)
   pnpm db:push

   # Or run migrations (for production)
   pnpm db:migrate
   ```

5. **Start the development server:**
   ```bash
   pnpm dev
   ```

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App (or edit your existing one)
3. Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
   - For production, use: `https://yourdomain.com/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env` file

**Important**: The OAuth app is configured to request the `repo` scope, which allows creating GitHub issues. When users sign in with GitHub, they'll need to authorize your app to access their repositories.

1. Go to GitHub Settings > Applications > Authorized OAuth Apps
2. Find your app and click "Revoke"
3. Sign out and sign in again to get the new token with `repo` scope

## GitHub Webhook Setup

The webhook allows Bug Buddy to sync GitHub issue status changes and comments back to your dashboard.

### Setting up the Webhook

1. **Go to your GitHub repository:**
   - Navigate to the repository where issues are created
   - Go to Settings > Webhooks

2. **Add a new webhook:**
   - Click "Add webhook"
   - **Payload URL:**
     - Development: `http://localhost:3000/api/github/webhook`
     - Production: `https://yourdomain.com/api/github/webhook`
   - **Content type:** `application/json`
   - **Events:** Select "Let me select individual events" and choose:
     - ✅ Issues
     - ✅ Issue comments
   - **Active:** ✅ (checked)
   - Click "Add webhook"

3. **Verify webhook is working:**
   - After creating the webhook, GitHub will send a test ping
   - You should see it in the webhook's "Recent Deliveries" section
   - When you close or comment on an issue in GitHub, the status will automatically sync to Bug Buddy

### What the Webhook Does

- **Issue State Changes:** When an issue is closed or reopened in GitHub, the feedback status is updated in Bug Buddy
- **Comments:** New comments on GitHub issues are synced to Bug Buddy as activity
- **Bidirectional Sync:** Keeps your Bug Buddy dashboard in sync with GitHub

## Usage

1. Sign in with GitHub at `http://localhost:3000`
2. Create a project in the dashboard
3. Copy the embed script from the project page
4. Add the script to your website
5. Configure GitHub integration in settings
6. Start receiving feedback!

## Widget Embed

Add this script to your website:

```html
<script
  src="http://localhost:3000/widget.js"
  data-project-key="YOUR_API_KEY"
  data-app-url="http://localhost:3000"
></script>
```

Replace `YOUR_API_KEY` with the API key from your project.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database (development)
- `pnpm db:migrate` - Create and run migrations (production)
- `pnpm db:studio` - Open Prisma Studio
