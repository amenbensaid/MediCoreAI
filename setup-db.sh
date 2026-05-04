#!/bin/bash

# Setup PostgreSQL Database for MediCore AI
echo "🚀 Setting up MediCore AI Database..."

# Start PostgreSQL with Docker Compose
echo "📦 Starting PostgreSQL container..."
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
npm ci
npm run migrate
npm run seed

echo "✅ Database setup complete!"
echo ""
echo "📊 Database Credentials:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: \${POSTGRES_USER:-medicore_user}"
echo "  Database: \${POSTGRES_DB:-medicore_db}"
echo ""
echo "🔐 Demo Account:"
echo "  Email: admin@medicore.ai"
echo "  Password: Admin@123"
