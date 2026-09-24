# Deploying Toro

## Prerequisites

- Node.js 20+
- A GitHub account and repository
- A Vercel account
- A Firebase project on an appropriate billing/free tier
- Firebase CLI (`npm install -g firebase-tools`) for rules and index deployment

## 1. Firebase project

Create a Firebase project and register a Web app. Enable Email/Password and Google providers under Authentication. Create a Firestore database and a Cloud Storage bucket in the appropriate region.

In Project settings → Service accounts, create a service-account key. Store its project ID, client email and private key only in server environment variables. Never prefix them with `NEXT_PUBLIC_`.

## 2. Environment variables

Copy `.env.example` to `.env.local` for development. In Vercel, add the same names under Project settings → Environment Variables, selecting Development, Preview and Production as appropriate.

For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the full private key and preserve line breaks (or use escaped `\\n`). Set `NEXT_PUBLIC_APP_URL` independently for local, preview and production environments.

## 3. Firebase rules and indexes

Authenticate the CLI and select the project:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Vercel does not deploy these files. Repeat the Firebase deployment when rules or indexes change.

## 4. GitHub and Vercel

Push the repository to GitHub. In Vercel choose Add New → Project, import the repository, accept the Next.js preset, add all environment variables, and deploy. Vercel runs `npm install` and `npm run build`. Subsequent production-branch pushes deploy production; pull requests create previews.

## 5. Authorized domains

In Firebase Authentication → Settings → Authorized domains, add the production Vercel hostname and final custom domain. Keep `localhost` for development. Add stable preview domains only when required; arbitrary preview URLs should not be broadly trusted for OAuth redirects.

## 6. Custom domain

Add the domain in Vercel Project settings → Domains, apply the displayed DNS records, then add the verified domain to Firebase Authentication. Update `NEXT_PUBLIC_APP_URL` and redeploy.

## 7. Production verification

Before launch, verify registration, verification email, login, Google sign-in, reset email, company creation, company selection and switching with at least two users and two companies. Attempt direct Firestore reads and workspace URLs across companies and confirm denial. Inspect the browser bundle and Vercel logs to confirm Admin credentials are server-only.

Run locally and in CI:

```bash
npm run typecheck
npm run lint
npm run build
```

## Troubleshooting

- `Firebase Admin is not configured`: confirm all three `FIREBASE_ADMIN_*` variables and private-key newlines.
- `auth/unauthorized-domain`: add the exact hostname in Firebase Authentication.
- Missing membership query index: deploy `firestore.indexes.json` and wait for index construction.
- Session works locally but not in production: confirm HTTPS, project consistency between Web and Admin credentials, and that Vercel received the variables before the latest deployment.
- Firestore permission denied: deploy the rules and confirm the company member document exists with `status: active`.

Cloud Functions, TURN/SFU infrastructure, messaging credentials and optional integrations are separate deployments and are not required by this foundation.
