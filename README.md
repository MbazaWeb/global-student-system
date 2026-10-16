# Global Student System (GSS)

Multi-institution student identity and bank-linked wallet platform — **starter scaffold v0.1.0**.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Supabase environment values are optional for the demo dashboard. Configure a dedicated Supabase project before running migrations.

## Portals

- `/student/dashboard`
- `/institution/dashboard`
- `/bank/dashboard` (mock only; CRDB is a proposed partner)
- `/admin/dashboard`

**Security:** No live banking, KYC, admission verification, payment processing or privileged access is enabled. Portal screens are demonstrative, not authenticated. Do not deploy with real student data before implementing RBAC, RLS, verified institution onboarding and bank agreements.
