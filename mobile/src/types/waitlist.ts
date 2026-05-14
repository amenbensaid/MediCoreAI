export type PatientWaitlistStatus = 'pending' | 'offered' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export type PatientWaitlistEntry = {
  id: string;
  practitionerId?: string | null;
  practitioner?: string | null;
  specialty?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  appointmentType?: string | null;
  consultationMode?: 'in-person' | 'online' | string | null;
  reasonCategory?: string | null;
  reasonDetail?: string | null;
  notes?: string | null;
  status: PatientWaitlistStatus | string;
  offerExpiresAt?: string | null;
  createdAt?: string | null;
  position?: number | null;
};
