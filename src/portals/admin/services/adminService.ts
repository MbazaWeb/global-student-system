import { supabase } from "../../../lib/supabase";

/**
 * adminService — typed wrappers for platform-admin reads.
 * All writes (institution approval, admin assignment, guardian grant,
 * refund decision) already have dedicated services or are called directly
 * from the action pages.
 */

export type StudentRow = {
  user_id: string;
  email: string;
  display_name: string;
  global_student_id: string | null;
  created_at: string;
};

export type InstitutionRow = {
  id: string;
  name: string;
  country_code: string;
  verification_status: string;
  created_at: string;
  institution_code: string | null;
  region: string | null;
};

export type VerificationMonitoringRow = {
  request_id: string;
  student_name: string;
  admission_number: string;
  institution_name: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

export type IntegrationRow = {
  id: string;
  name: string;
  kind: string;
  status: string;
  description: string;
  updated_at: string;
};

export type AuditLogRow = {
  source: string;
  id: string;
  created_at: string;
  actor: string;
  summary: string;
};

export type CountryRow = { iso2: string; name: string };

function db() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export const adminService = {
  async listStudents(search: string): Promise<StudentRow[]> {
    const { data, error } = await db().rpc("gss_admin_list_students", {
      p_search: search.trim() || null,
      p_limit: 100,
    });
    fail(error);
    return (data ?? []) as StudentRow[];
  },

  async listInstitutions(search: string, status: string): Promise<InstitutionRow[]> {
    const { data, error } = await db().rpc("gss_admin_list_institutions", {
      p_search: search.trim() || null,
      p_status: status || null,
    });
    fail(error);
    return (data ?? []) as InstitutionRow[];
  },

  async createInstitution(
    name: string, countryCode: string, institutionCode: string, region: string, note: string
  ): Promise<string> {
    const { data, error } = await db().rpc("gss_admin_create_institution", {
      p_name: name,
      p_country_code: countryCode,
      p_institution_code: institutionCode || null,
      p_region: region || null,
      p_note: note,
    });
    fail(error);
    return data as string;
  },

  async verificationMonitoring(status: string): Promise<VerificationMonitoringRow[]> {
    const { data, error } = await db().rpc("gss_admin_verification_monitoring", {
      p_status: status || null,
    });
    fail(error);
    return (data ?? []) as VerificationMonitoringRow[];
  },

  async listIntegrations(): Promise<IntegrationRow[]> {
    const { data, error } = await db().rpc("gss_admin_list_integration_status");
    fail(error);
    return (data ?? []) as IntegrationRow[];
  },

  async auditLog(limit: number): Promise<AuditLogRow[]> {
    const { data, error } = await db().rpc("gss_admin_audit_log", { p_limit: limit });
    fail(error);
    return (data ?? []) as AuditLogRow[];
  },

  async listCountries(): Promise<CountryRow[]> {
    const { data, error } = await db().rpc("gss_admin_list_countries");
    fail(error);
    return (data ?? []) as CountryRow[];
  },
};
