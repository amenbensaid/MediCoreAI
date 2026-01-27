CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'practitioner',
    specialty VARCHAR(100),
    license_number VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, 
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'staff',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, clinic_id)
);


CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    social_security_number VARCHAR(50),
    insurance_provider VARCHAR(255),
    insurance_number VARCHAR(100),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    blood_type VARCHAR(10),
    allergies TEXT[],
    chronic_conditions TEXT[],
    current_medications TEXT[],
    notes TEXT,
    referral_source VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animals (
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


CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    record_type VARCHAR(50) NOT NULL, 
    chief_complaint TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    prescriptions JSONB DEFAULT '[]',
    vital_signs JSONB DEFAULT '{}',
    notes TEXT,
    ai_suggestions JSONB DEFAULT '{}',
    is_ai_analyzed BOOLEAN DEFAULT false,
    record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dental_charts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    tooth_number VARCHAR(10) NOT NULL,
    condition VARCHAR(50),
    treatment_needed TEXT,
    treatment_done TEXT,
    notes TEXT,
    last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aesthetic_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    procedure_type VARCHAR(100) NOT NULL,
    before_images TEXT[],
    after_images TEXT[],
    injection_points JSONB DEFAULT '{}',
    products_used JSONB DEFAULT '[]',
    notes TEXT,
    procedure_date TIMESTAMP,
    follow_up_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vaccinations (
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


CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL, 
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    ai_analysis JSONB DEFAULT '{}',
    is_ai_analyzed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    appointment_type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',
    room VARCHAR(50),
    color VARCHAR(20),
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    no_show_probability DECIMAL(5, 2), 
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',   
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    specialty VARCHAR(50), 
    default_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 20.00,
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    due_date DATE,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 20.00,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, 
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'unit',
    purchase_price DECIMAL(10, 2),
    selling_price DECIMAL(10, 2),
    current_stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    supplier VARCHAR(255),
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL,     
    quantity INTEGER NOT NULL,
    reference VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, 
    direction VARCHAR(10) DEFAULT 'outbound', 
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(20) DEFAULT 'sent', 
    sent_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE newsletter_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    recipient_filter JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft', 
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    total_recipients INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    no_show_appointments INTEGER DEFAULT 0,
    new_patients INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    total_invoiced DECIMAL(12, 2) DEFAULT 0,
    total_collected DECIMAL(12, 2) DEFAULT 0,
    average_consultation_time INTEGER, 
    room_occupancy_rate DECIMAL(5, 2), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clinic_id, stat_date)
);

CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL, 
    prediction_date DATE NOT NULL,
    predicted_value JSONB NOT NULL,
    actual_value JSONB,
    confidence_score DECIMAL(5, 2),
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, start_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_practitioner ON appointments(practitioner_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_invoices_clinic ON invoices(clinic_id);
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_daily_stats_clinic_date ON daily_stats(clinic_id, stat_date);
CREATE INDEX idx_audit_logs_clinic ON audit_logs(clinic_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

INSERT INTO users (id, email, password_hash, first_name, last_name, role, specialty, is_verified)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@medicore.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/Kai',
    'Admin',
    'MediCore',
    'admin',
    'Administration',
    true
);

INSERT INTO clinics (id, name, type, address, city, postal_code, phone, email)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Clinique MediCore Demo',
    'general',
    '123 Avenue de la Santé',
    'Paris',
    '75001',
    '+33 1 23 45 67 89',
    'contact@medicore-demo.fr'
);

INSERT INTO user_clinics (user_id, clinic_id, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'admin'
);

INSERT INTO services (clinic_id, code, name, description, category, default_price, duration_minutes) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CONS-GEN', 'Consultation générale', 'Consultation médicale standard', 'Consultation', 50.00, 30),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CONS-SPE', 'Consultation spécialisée', 'Consultation avec spécialiste', 'Consultation', 80.00, 45),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'ECG', 'Électrocardiogramme', 'Examen cardiaque ECG', 'Examen', 75.00, 20),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'RADIO-THOR', 'Radiographie thoracique', 'Radio des poumons', 'Imagerie', 60.00, 15),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'VACCIN', 'Vaccination', 'Administration de vaccin', 'Prévention', 35.00, 15);

INSERT INTO patients (clinic_id, patient_number, first_name, last_name, date_of_birth, gender, email, phone, address, city, postal_code) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'PAT-001', 'Jean', 'Dupont', '1985-03-15', 'male', 'jean.dupont@email.com', '+33 6 12 34 56 78', '15 Rue de la Paix', 'Paris', '75002'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'PAT-002', 'Marie', 'Martin', '1990-07-22', 'female', 'marie.martin@email.com', '+33 6 23 45 67 89', '28 Boulevard Haussmann', 'Paris', '75009'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'PAT-003', 'Pierre', 'Bernard', '1978-11-08', 'male', 'pierre.bernard@email.com', '+33 6 34 56 78 90', '42 Avenue des Champs-Élysées', 'Paris', '75008'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'PAT-004', 'Sophie', 'Petit', '1995-01-30', 'female', 'sophie.petit@email.com', '+33 6 45 67 89 01', '7 Rue du Faubourg Saint-Honoré', 'Paris', '75008'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'PAT-005', 'Luc', 'Moreau', '1982-09-14', 'male', 'luc.moreau@email.com', '+33 6 56 78 90 12', '33 Place de la République', 'Paris', '75003');
