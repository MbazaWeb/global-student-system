import { supabase } from "../../../lib/supabase";

/**
 * institutionService — typed wrappers for institution-admin reads and
 * catalogue writes. All writes go through SECURITY DEFINER functions that
 * check gss_is_institution_admin(institution_id) and write an
 * institution_catalogue_audit row in the same transaction.
 */

export type CatalogueRow = {
  kind: string;
  id: string;
  name: string;
  code: string | null;
  year: string | null;
  active: boolean | null;
  label: string | null;
  amount_minor: number | null;
  currency_code: string | null;
  programme_name: string | null;
  academic_year: string | null;
  created_at: string;
};

export type InstitutionSelf = {
  id: string;
  name: string;
  country_code: string;
  verification_status: string;
  created_at: string;
  institution_code: string | null;
  region: string | null;
};

export type CatalogueAuditRow = {
  id: string;
  table_name: string;
  row_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  before: unknown;
  after: unknown;
};

function db() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export const institutionService = {
  async self(): Promise<InstitutionSelf | null> {
    const { data, error } = await db().rpc("gss_institution_self");
    fail(error);
    return (data ?? null) as InstitutionSelf | null;
  },

  async updateProfile(name: string, institutionCode: string, region: string): Promise<void> {
    const { error } = await db().rpc("gss_institution_update_profile", {
      p_name: name,
      p_institution_code: institutionCode,
      p_region: region,
    });
    fail(error);
  },

  async listCatalogues(): Promise<CatalogueRow[]> {
    const { data, error } = await db().rpc("gss_institution_list_catalogues");
    fail(error);
    return (data ?? []) as CatalogueRow[];
  },

  async upsertProgramme(id: string | null, name: string, code: string | null): Promise<string> {
    const { data, error } = await db().rpc("gss_institution_upsert_programme", {
      p_id: id, p_name: name, p_code: code,
    });
    fail(error);
    return data as string;
  },

  async deleteProgramme(id: string): Promise<void> {
    const { error } = await db().rpc("gss_institution_delete_programme", { p_id: id });
    fail(error);
  },

  async upsertDepartment(id: string | null, name: string): Promise<string> {
    const { data, error } = await db().rpc("gss_institution_upsert_department", { p_id: id, p_name: name });
    fail(error);
    return data as string;
  },

  async deleteDepartment(id: string): Promise<void> {
    const { error } = await db().rpc("gss_institution_delete_department", { p_id: id });
    fail(error);
  },

  async upsertAcademicYear(id: string | null, year: string, active: boolean): Promise<string> {
    const { data, error } = await db().rpc("gss_institution_upsert_academic_year", {
      p_id: id, p_year: year, p_active: active,
    });
    fail(error);
    return data as string;
  },

  async deleteAcademicYear(id: string): Promise<void> {
    const { error } = await db().rpc("gss_institution_delete_academic_year", { p_id: id });
    fail(error);
  },

  async upsertTuitionFee(
    id: string | null, label: string, amountMinor: number, currency: string,
    programmeId: string | null, academicYearId: string | null
  ): Promise<string> {
    const { data, error } = await db().rpc("gss_institution_upsert_tuition_fee", {
      p_id: id, p_label: label, p_amount_minor: amountMinor, p_currency_code: currency,
      p_programme_id: programmeId, p_academic_year_id: academicYearId,
    });
    fail(error);
    return data as string;
  },

  async deleteTuitionFee(id: string): Promise<void> {
    const { error } = await db().rpc("gss_institution_delete_tuition_fee", { p_id: id });
    fail(error);
  },

  async auditLog(limit: number): Promise<CatalogueAuditRow[]> {
    const { data, error } = await db().rpc("gss_institution_catalogue_audit_log", { p_limit: limit });
    fail(error);
    return (data ?? []) as CatalogueAuditRow[];
  },
};
