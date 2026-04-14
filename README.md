
# EMS-with-QR-transaction
updated EMS with the QR transaction rather than API
=======
# PTU Event Management System (EMS)

A full-stack Event Management System for Puducherry Technological University with React frontend, Node.js backend, and PostgreSQL database.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## 1. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE ems_db;
```

2. Run the schema file to create tables and seed data:
```bash
psql -U postgres -d ems_db -f backend/db/schema.sql
```

---

## 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your database credentials:
```
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ems_db
JWT_SECRET=change_this_to_a_long_random_secret
NODE_ENV=development
```

Start the backend:
```bash
npm run dev      # development (with nodemon)
# or
npm start        # production
```

Backend runs on: http://localhost:5000

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

---

## 🔑 Default Login Credentials

| Role    | Email                | Password   |
|---------|----------------------|------------|
| Admin   | admin@ptu.edu.in     | admin123   |
| Student | arun@ptu.edu.in      | student123 |
| Student | priya@ptu.edu.in     | student123 |

> **Note:** The seed passwords in schema.sql use a placeholder hash. For real logins, re-hash them or use the Register page to create new accounts.

---

## 📦 Project Structure

```
ems/
├── backend/
│   ├── db/
│   │   ├── index.js          # PostgreSQL connection pool
│   │   └── schema.sql        # DB schema + seed data
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js           # Login & register
│   │   ├── events.js         # CRUD for events
│   │   ├── registrations.js  # Event registrations
│   │   └── students.js       # Student management & stats
│   ├── server.js             # Express app entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx    # Sidebar + outlet layout
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Events.jsx
    │   │   ├── Students.jsx
    │   │   └── Registrations.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## ✨ Features

### Admin
- Dashboard with stats (total events, registrations, students, upcoming)
- Bar chart: top events by registrations
- Pie chart: registration capacity per event
- Create / Edit / Delete events
- View all student registrations (table view)
- View all registered students

### Student
- Dashboard with personal stats & schedule
- Browse & filter events by category
- Register / cancel registration for events
- View capacity progress bar per event
- My Registrations page with confirmed events

## 🛠 Tech Stack
- **Frontend**: React 18, Vite, React Router 6, Recharts, Lucide React, Plain CSS
- **Backend**: Node.js, Express, JWT, bcryptjs
- **Database**: PostgreSQL with `pg` driver

