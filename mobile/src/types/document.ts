export type PatientDocumentKind = 'image' | 'pdf' | 'document';

export type PatientDocumentAccessScope = 'private' | 'appointment' | 'shared';

export type PatientDocument = {
  id: string;
  patient_id?: string;
  name: string;
  document_code?: string | null;
  file_type?: PatientDocumentKind | string | null;
  category?: string | null;
  notes?: string | null;
  appointment_id?: string | null;
  appointment_access_id?: string | null;
  access_scope?: PatientDocumentAccessScope | string | null;
  uploaded_by?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  file_size?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

export type PatientProfileWithDocuments = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  city?: string | null;
  bloodType?: string | null;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  notes?: string | null;
  documents?: PatientDocument[];
};

export type PatientDocumentPayload = {
  name: string;
  documentCode?: string;
  category?: string;
  notes?: string;
  appointmentId?: string;
  accessScope?: PatientDocumentAccessScope;
  fileType?: PatientDocumentKind;
  file?: {
    uri: string;
    name: string;
    mimeType?: string | null;
  } | null;
};
