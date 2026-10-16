# Portal navigation

Authenticated users receive role-specific navigation links. The links are UX only: route guards and database RLS remain the security boundaries. Working modules are links; unfinished modules are explicitly marked as coming later.

Student: dashboard, profile, Global ID, admission verification.
Institution admin: dashboard, directory, verification queue.
Platform admin: dashboard, institution approvals, admin assignments.
Bank roles: dashboard only; banking remains mock-only.

This commit does not apply migrations or connect a Supabase project.
