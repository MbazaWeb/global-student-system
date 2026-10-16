# Dedicated Supabase environment — 2026-10-16

Project: Global Student System
Project ref: guqrahxasuebxpdvkslm
Region: eu-central-2
API URL: https://guqrahxasuebxpdvkslm.supabase.co

All 12 committed SQL migrations through transaction_ledger were applied successfully to this **new** project. Database inspection confirms RLS enabled on all ten public tables.

To connect a local app, copy .env.example to .env.local and replace the placeholder with the GSS publishable key from Supabase > Project Settings > API Keys. For deployment, configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting provider's environment settings. Do not commit local env files, service_role keys or database passwords.

**Not yet verified:** end-to-end signup, admin role bootstrap, migration parity, production deployment and npm build. There are no real payment transactions or payment gateway integrations.

**Security review before launch:** rate-limit institution applications; ensure a trusted platform admin bootstrap; audit SECURITY DEFINER RPC grants; enforce referential consistency between transaction enrollment/student/institution; add financial audit trails and server-side paginated statement generation.
