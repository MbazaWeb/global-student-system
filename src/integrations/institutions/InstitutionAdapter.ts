export interface InstitutionAdapter { verifyAdmission(institutionId: string, admissionNumber: string): Promise<{ verified: boolean }>; }
