# Student dashboard and verification history

The student dashboard reads their own profile, GSS ID and enrollment statuses through RLS. The verification history reads the student's own review requests, decisions and review notes, limited to 100 recent entries.

This is a read-only review history, not yet an append-only multi-event audit trail. The existing verification request row stores the latest decision. No public credential verification endpoint or QR credential is claimed. No Supabase database was changed.
