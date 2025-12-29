# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Bug Buddy Next.js project. The integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (Next.js 15.3+ approach)
- **Server-side PostHog client** in `src/lib/posthog-server.ts` for backend event tracking
- **Reverse proxy configuration** in `next.config.ts` to route PostHog requests through `/ingest` for better reliability
- **User identification** in the session provider that automatically identifies users on login and resets on logout
- **Error tracking** using `posthog.captureException()` for application errors
- **12 custom events** tracking key user actions across the application

## Events Instrumented

| Event Name | Description | File |
|------------|-------------|------|
| `user_signed_in` | User initiates sign-in via GitHub or Google OAuth | `src/components/auth/sign-in-card.tsx` |
| `project_created` | User creates a new project for feedback collection | `src/components/dashboard/create-project-dialog.tsx` |
| `embed_code_copied` | User copies the widget embed code - key activation step | `src/components/dashboard/projects-list.tsx` |
| `api_key_copied` | User copies the API key to clipboard | `src/components/dashboard/projects-list.tsx` |
| `github_integration_saved` | User saves GitHub integration settings - key conversion | `src/components/dashboard/github-integration-form.tsx` |
| `github_webhook_secret_generated` | User generates a webhook secret for GitHub | `src/components/dashboard/github-integration-form.tsx` |
| `widget_customization_saved` | User saves widget customization settings | `src/components/dashboard/widget-customization-form.tsx` |
| `github_account_linked` | User links their GitHub account for repository access | `src/app/dashboard/account/account-settings-client.tsx` |
| `github_issue_closed` | User closes a GitHub issue from feedback detail view | `src/components/dashboard/feedback-detail.tsx` |
| `account_deleted` | User deletes their account - churn event | `src/app/dashboard/account/account-settings-client.tsx` |
| `session_revoked` | User revokes an active session | `src/app/dashboard/account/account-settings-client.tsx` |
| `app_error` | Application error captured via `captureException` | `src/app/error.tsx` |

## Configuration Files Created/Modified

| File | Purpose |
|------|---------|
| `.env` | Updated with PostHog API key and EU host |
| `instrumentation-client.ts` | Client-side PostHog initialization |
| `src/lib/posthog-server.ts` | Server-side PostHog client |
| `next.config.ts` | Added reverse proxy rewrites for `/ingest` |
| `src/components/auth/session-provider.tsx` | User identification on login/logout |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://eu.posthog.com/project/111662/dashboard/471370) - Core analytics dashboard for Bug Buddy

### Insights
- [User Sign-ins Over Time](https://eu.posthog.com/project/111662/insights/Gd0bLrYL) - Tracks sign-ins by provider (GitHub vs Google)
- [Signup to Project Creation Funnel](https://eu.posthog.com/project/111662/insights/IlerrtBO) - Key activation metric conversion funnel
- [Project to GitHub Integration Funnel](https://eu.posthog.com/project/111662/insights/oOQ818fr) - Feature adoption funnel
- [Account Deletions (Churn)](https://eu.posthog.com/project/111662/insights/H05oM9NS) - Churn tracking
- [Feature Adoption Overview](https://eu.posthog.com/project/111662/insights/bqSmgaof) - Overview of key feature usage

## Environment Variables

Make sure these environment variables are set in your production environment:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_7VEQhgtvMvw9Fl2pxyYt6JavijN2aMcOmcIPCWRPzwN
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```
