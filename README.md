# MediCore AI 🏥

**Solution CRM/PMS intelligente pour les professionnels de santé**

MediCore AI est une plateforme SaaS complète de gestion de cabinet médical et de relation client, boostée par l'intelligence artificielle.

![MediCore AI](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

## ✨ Fonctionnalités

### 🩺 Gestion des Patients
- Dossiers patients complets (identité, antécédents, allergies)
- Historique médical détaillé
- Documents numérisés
- Gestion multi-cabinet

### 📅 Agenda Intelligent
- Prise de RDV en ligne
- Calendrier interactif
- **IA Predictive Scheduling** : Prédiction des no-shows
- Rappels automatiques SMS/Email

### 💳 Facturation
- Création de factures et devis
- Suivi des paiements
- Gestion des impayés
- Export comptable

### 📊 Analytics & BI
- Tableaux de bord personnalisables
- Suivi du chiffre d'affaires
- Analyse de performance clinique
- Statistiques patientèle
- Rapports exportables PDF/Excel

### 🎨 Interface Premium
- Design moderne et responsive
- Mode sombre/clair
- Animations fluides
- Accessibilité WCAG

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| État | Zustand |
| Graphiques | Recharts |
| Backend | Node.js + Express |
| Base de données | PostgreSQL |
| Auth | JWT + bcrypt |
| Containerisation | Docker |

## 🚀 Installation

### Prérequis
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (ou utiliser Docker)

### Développement local

1. **Cloner le projet**
```bash
git clone https://github.com/your-repo/medicore.git
cd medicore
```

2. **Installer les dépendances Backend**
```bash
cd backend
npm install
```

3. **Installer les dépendances Frontend**
```bash
cd frontend
npm install
```

4. **Configurer les variables d'environnement**
```bash
# Backend
cp backend/.env.example backend/.env
# Modifier les valeurs selon votre configuration
```

5. **Démarrer avec Docker Compose**
```bash
docker-compose up -d
```

6. **Ou démarrer manuellement**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Accès
- **Frontend**: http://localhost:5173 (dev) ou http://localhost:3000 (docker)
- **Backend API**: http://localhost:5000
- **PostgreSQL**: localhost:5432

### Compte démo
```
Email: admin@medicore.ai
Mot de passe: Admin@123
```

## 📁 Structure du Projet

```
medicore/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration DB
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API routes
│   │   ├── database/        # SQL schemas
│   │   └── index.js         # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── layouts/         # Layouts (Auth, Dashboard)
│   │   ├── pages/           # Pages de l'application
│   │   ├── services/        # API calls
│   │   ├── stores/          # État global (Zustand)
│   │   ├── App.jsx          # Router principal
│   │   └── main.jsx         # Entry point
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## 🔌 API Endpoints

### Authentification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| GET | `/api/auth/me` | Profil utilisateur |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | Liste des patients |
| GET | `/api/patients/:id` | Détails patient |
| POST | `/api/patients` | Créer patient |
| PUT | `/api/patients/:id` | Modifier patient |

### Rendez-vous
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | Liste des RDV |
| GET | `/api/appointments/calendar` | RDV pour calendrier |
| POST | `/api/appointments` | Créer RDV |
| PATCH | `/api/appointments/:id/status` | Changer statut |

### Facturation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | Liste des factures |
| POST | `/api/invoices` | Créer facture |
| POST | `/api/invoices/:id/payments` | Enregistrer paiement |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/revenue` | CA par période |
| GET | `/api/analytics/appointments` | Stats RDV |
| GET | `/api/analytics/patients` | Stats patients |

## 🔐 Sécurité

- **Authentification JWT** avec refresh tokens
- **Chiffrement bcrypt** pour les mots de passe
- **CORS** configuré
- **Helmet** pour les headers de sécurité
- **Validation** des entrées avec express-validator
- Prêt pour **MFA** (authentification à deux facteurs)

## 🐳 Docker

### Build et lancement
```bash
# Build et démarrage
docker-compose up --build

# Arrêt
docker-compose down

# Avec volumes persistants
docker-compose down -v  # Supprime aussi les données
```

### Services
- `postgres` - Base de données (port 5432)
- `backend` - API Node.js (port 5000)
- `frontend` - React app (port 3000)

## 📝 Licence

MIT License - voir [LICENSE](LICENSE)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

**MediCore AI** - Révolutionnez la gestion de votre cabinet médical 🚀
