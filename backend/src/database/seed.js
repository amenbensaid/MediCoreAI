const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://medicore_user:change_me_postgres_password@localhost:5432/medicore_db',
});

async function seed() {
    console.log('🌱 Seeding database...\n');

    try {
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash('Admin@123', salt);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )
    `);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS clinics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )
    `);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_clinics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'staff',
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, clinic_id)
      )
    `);

        const clinicResult = await pool.query(`
      INSERT INTO clinics (name, type, address, city, postal_code, phone, email)
      VALUES ('Clinique MediCore Demo', 'general', '123 Avenue de la Santé', 'Paris', '75001', '+33 1 23 45 67 89', 'contact@medicore-demo.fr')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

        let clinicId;
        if (clinicResult.rows.length > 0) {
            clinicId = clinicResult.rows[0].id;
        } else {
            const existingClinic = await pool.query("SELECT id FROM clinics WHERE name = 'Clinique MediCore Demo'");
            clinicId = existingClinic.rows[0]?.id;
        }

        console.log('✅ Clinic created/found:', clinicId);

        const users = [
            { email: 'admin@medicore.ai', firstName: 'Admin', lastName: 'MediCore', role: 'admin', specialty: 'Administration' },
            { email: 'dr.dupont@medicore.ai', firstName: 'Jean', lastName: 'Dupont', role: 'practitioner', specialty: 'Médecine Générale' },
            { email: 'dr.martin@medicore.ai', firstName: 'Marie', lastName: 'Martin', role: 'practitioner', specialty: 'Dentiste' },
            { email: 'dr.bernard@medicore.ai', firstName: 'Pierre', lastName: 'Bernard', role: 'practitioner', specialty: 'Dermatologue' },
            { email: 'staff@medicore.ai', firstName: 'Sophie', lastName: 'Petit', role: 'staff', specialty: 'Secrétariat' },
        ];

        for (const user of users) {
            try {
                const userResult = await pool.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role, specialty, is_verified)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = $2,
            first_name = $3,
            last_name = $4,
            role = $5,
            specialty = $6,
            is_verified = true
          RETURNING id
        `, [user.email, passwordHash, user.firstName, user.lastName, user.role, user.specialty]);

                const userId = userResult.rows[0].id;

                if (clinicId) {
                    await pool.query(`
            INSERT INTO user_clinics (user_id, clinic_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, clinic_id) DO NOTHING
          `, [userId, clinicId, user.role === 'admin' ? 'admin' : 'staff']);
                }

                console.log(`✅ User created: ${user.email}`);
            } catch (err) {
                console.log(`⚠️  User ${user.email}: ${err.message}`);
            }
        }

        console.log('\n🎉 Seeding completed!\n');
        console.log('📋 Test Credentials:');
        console.log('─'.repeat(40));
        console.log('Email: admin@medicore.ai');
        console.log('Password: Admin@123');
        console.log('─'.repeat(40));
        console.log('\nOther test accounts (same password):');
        console.log('- dr.dupont@medicore.ai');
        console.log('- dr.martin@medicore.ai');
        console.log('- dr.bernard@medicore.ai');
        console.log('- staff@medicore.ai');

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    } finally {
        await pool.end();
    }
}

seed();
