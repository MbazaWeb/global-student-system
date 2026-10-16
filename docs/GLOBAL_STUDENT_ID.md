# Global Student ID

GSS assigns a unique, immutable platform identifier to each student profile via a database trigger. Existing profiles are backfilled. Format: GSS-0000100000 and subsequent sequence values.

- The Global Student ID is distinct from a university admission number and Supabase Auth UUID.
- A student has one ID even if enrolled at multiple institutions.
- RLS exposes the identifier only to its owner; no public lookup endpoint is included.
- The student identity screen displays whether at least one enrollment has been institution-verified.
- The identifier alone does not prove enrollment, citizenship, bank ownership, or identity.

Production prerequisites: signed/verifiable credential issuance, revocation, anti-fraud checks, privacy review, verified institutional data and QR validation endpoint.
