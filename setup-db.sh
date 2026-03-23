#!/bin/bash

# Setup PostgreSQL Database for MediCore AI
echo "🚀 Setting up MediCore AI Database..."

# Start PostgreSQL with Docker Compose
echo "📦 Starting PostgreSQL container..."
cd /Users/amen/Desktop/MediCore\ AI
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Import the database schema
echo "📥 Importing database schema..."
docker-compose exec -T postgres psql -U medicore_user -d medicore_db < backend/src/database/init.sql

# Run seed data
echo "🌱 Seeding database..."
cd backend
npm install
npm run seed

echo "✅ Database setup complete!"
echo ""
echo "📊 Database Credentials:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: medicore_user"
echo "  Password: medicore_secure_password_2024"
echo "  Database: medicore_db"
echo ""
echo "🔐 Demo Account:"
echo "  Email: admin@medicore.ai"
echo "  Password: Admin@123"
