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
   REDIS_URL="redis://localhost:6379"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key-here-change-in-production"

   # OAuth (for user authentication)
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # PostHog (optional)
   NEXT_PUBLIC_POSTHOG_KEY=""
   NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

   # Vercel Blob
   BLOB_READ_WRITE_TOKEN="your-blob-read-write-token"

   # Email
   EMAIL_HOST=
   EMAIL_PORT=
   EMAIL_USER=
   EMAIL_PASSWORD=
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

## OAuth Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env` file

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App (or edit your existing one)
3. **Set Authorization callback URL:**
   - Development: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://yourdomain.com/api/auth/callback/github`

   **Note**: This single callback URL handles both authentication and account linking. The system automatically detects which flow to use.

4. Copy the Client ID and Client Secret to your `.env` file

**Important**: The OAuth app is configured to request the `repo` scope, which allows creating GitHub issues. When users sign in with GitHub, they'll need to authorize your app to access their repositories.

**Note**: Users can sign in with Google and then link their GitHub account in the account settings to enable GitHub integration features. The account linking uses the same callback URL but with a special parameter to avoid changing the user's login method.

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

1. Sign in with Google or GitHub at `http://localhost:3000`
2. If you signed in with Google, you'll be prompted to connect your GitHub account for integration features
3. Create a project in the dashboard
4. Copy the embed script from the project page
5. Add the script to your website
6. Configure GitHub integration in settings
7. Start receiving feedback!

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
