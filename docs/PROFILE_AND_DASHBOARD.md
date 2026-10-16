# Student profile and institution dashboard

Student Profile: authenticated student may update only display_name, phone and country_code. These are self-reported details, not independently verified identity claims. Student ID and enrollment verification remain immutable from this form.

Institution Dashboard: the sole institution_admin views enrollment counts and pending verification requests scoped to their assigned institution by RLS. These are current database counts, not externally validated admissions statistics.

The Supabase migration must be applied to a dedicated GSS project later. No existing Supabase project is modified by this commit.
