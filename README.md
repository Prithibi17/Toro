# Toro ERP

Toro is a multi-company ERP foundation built with Next.js App Router, TypeScript, Tailwind CSS, Firebase Authentication and Cloud Firestore.

## Implemented milestone

- Email/password registration and login, Google sign-in, verification email and password reset
- Secure, HTTP-only Firebase session cookies
- Firebase-backed global profiles and multiple company memberships
- Atomic company and initial owner creation
- Five-step onboarding for details, apps, departments, invitations and review
- Membership-validated company switching and workspace routes
- Permission-aware module launcher and module enablement checks
- Responsive dark/light application shell
- Firestore and Storage rules, indexes, and Vercel-compatible configuration

Business module screens are intentionally foundation-only until their vertical workflows are implemented. No sample company, employee, task, or financial data is fabricated.

## Local setup

1. Use Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and fill in a Firebase Web app and Admin service account.
3. In Firebase Authentication, enable Email/Password and Google providers.
4. Create Firestore and Cloud Storage, then deploy rules and indexes.
5. Run `npm install` and `npm run dev`.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup and security notes.

## Data model

```text
users/{uid}
users/{uid}/companyMemberships/{companyId}
companies/{companyId}
companies/{companyId}/members/{uid}
companies/{companyId}/departments/{departmentId}
companies/{companyId}/invitations/{invitationId}
```

The company member document is authoritative. The user subcollection is a workspace-discovery mirror written only by trusted server code.

## Current limitations

- Invitation documents are created, but email delivery and token acceptance are the next milestone.
- Role templates and granular record permissions need their administration UI and shared policy evaluator.
- Profile editing and company logos need Storage wiring.
- Cross-company rules need Emulator Suite integration tests against a configured Firebase project.
- Business modules are route-protected placeholders, not claimed as implemented workflows.
