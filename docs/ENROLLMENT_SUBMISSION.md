# Student enrollment submission

Student visits /student/admission, chooses an approved institution and supplies an admission number. Server-side RPC verifies the authenticated user has a student profile and role, and the institution is approved, then creates both enrollment and pending verification request atomically.

The single institution admin reviews at /institution/verification. Neither the admission number nor a submitted request proves enrollment.

No direct browser insert/update privileges on enrollments. Unique admission number per institution prevents collisions. Additional production requirements: duplicate review, enrollment expiry, identity matching, rate limits, correction workflow and full audit history.
