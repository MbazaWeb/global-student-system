# Institution student directory

The single Institution Admin can read up to 500 recent enrollments at their institution using the authorization-checked `gss_institution_student_directory()` RPC. The RPC derives institution scope from authenticated role assignments; no institution ID is accepted from the browser. Only student name, GSS ID, admission number, status and submission date are returned.

Search and status filtering currently operate on the loaded rows. Add server pagination and audited lookups for large institutions before production. Student contact information is intentionally omitted. The global ID alone does not prove enrollment.
