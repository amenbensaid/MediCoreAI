ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2) DEFAULT 50.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_online BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_policy VARCHAR(30) DEFAULT 'full-onsite';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"appointmentEmail": true, "smsAlerts": false, "dailyReport": true, "aiAlerts": true}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS appearance_preferences JSONB DEFAULT '{"darkMode": false, "accentColor": "#6366f1"}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_preferences JSONB;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_mode VARCHAR(20) DEFAULT 'in-person';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_provider VARCHAR(30);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_status VARCHAR(30) DEFAULT 'not_required';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_created_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_last_sync_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) DEFAULT 'full-onsite';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  color VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20),
  weight DECIMAL(10, 2),
  microchip_number VARCHAR(50),
  tattoo_number VARCHAR(50),
  insurance_provider VARCHAR(255),
  insurance_number VARCHAR(100),
  allergies TEXT[],
  chronic_conditions TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aesthetic_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  procedure_type VARCHAR(100) NOT NULL,
  before_images TEXT[],
  after_images TEXT[],
  injection_points JSONB DEFAULT '{}'::jsonb,
  products_used JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  procedure_date TIMESTAMP,
  follow_up_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100),
  administration_date DATE NOT NULL,
  expiry_date DATE,
  next_due_date DATE,
  administered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointment_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by VARCHAR(20) DEFAULT 'patient',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  category VARCHAR(100) DEFAULT 'general',
  notes TEXT,
  file_path TEXT,
  mime_type VARCHAR(150),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS practitioner_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(practitioner_id, patient_id)
);

ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE practitioner_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company_name VARCHAR(255) NOT NULL,
  clinic_type VARCHAR(50),
  desired_plan VARCHAR(50) DEFAULT 'professional',
  team_size INTEGER,
  preferred_demo_date TIMESTAMP,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointment_notes_patient ON appointment_notes(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practitioner_reviews_practitioner ON practitioner_reviews(practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practitioner_reviews_clinic ON practitioner_reviews(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animals_clinic_active ON animals(clinic_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vaccinations_clinic_due ON vaccinations(clinic_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status_created ON demo_requests(status, created_at DESC);

UPDATE users
SET consultation_fee = COALESCE(consultation_fee, 50.00),
    payment_policy = COALESCE(payment_policy, 'full-onsite'),
    accepts_online = COALESCE(accepts_online, true),
    notification_preferences = COALESCE(notification_preferences, '{"appointmentEmail": true, "smsAlerts": false, "dailyReport": true, "aiAlerts": true}'::jsonb),
    appearance_preferences = COALESCE(appearance_preferences, '{"darkMode": false, "accentColor": "#6366f1"}'::jsonb)
WHERE role = 'practitioner';
