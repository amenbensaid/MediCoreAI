export type Practitioner = {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  specialty?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  consultationFee?: number;
  acceptsOnline?: boolean;
  paymentPolicy?: string;
  ratingAvg?: number;
  reviewsCount?: number;
  education?: string[];
  expertise?: string[];
  reviews?: Array<{
    id: string;
    patientName?: string;
    rating: number;
    reviewText?: string;
    createdAt?: string;
  }>;
  patientReview?: {
    id: string;
    rating: number;
    reviewText?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  canReview?: boolean;
  lastCompletedAppointmentId?: string | null;
  calendar?: {
    defaultDurationMinutes?: number;
    sessions?: Array<{ enabled: boolean; mode: string }>;
  };
};

export type AppointmentType = {
  id: string;
  name: string;
  durationMinutes?: number;
  price?: number;
};

export type AvailableSlot = {
  time: string;
  available: boolean;
  durationMinutes?: number;
  endTime?: string;
};
