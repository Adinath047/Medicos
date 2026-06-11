# 🏥 Medicos EMR

An **offline-first, hybrid-cloud Electronic Medical Record (EMR)** system designed for modern hospitals and clinics. Medicos ensures seamless clinical operations even without reliable internet, synchronizing data to a central cloud database when connectivity is restored.

---

## ✨ Key Features

*   **📡 Offline-First Architecture:** Built to work entirely locally using IndexedDB (Dexie). Syncs automatically in the background via a custom Express/SQLite/Supabase sync engine when online.
*   **🔐 Role-Based Access Control (RBAC):** Distinct portals and dashboards for Administrators, Doctors, Front-Desk Receptionists, and Pharmacy Staff.
*   **💊 Smart Prescriptions:** Live auto-calculation of total tablet/medicine quantities based on dosage, frequency, and duration. Generates clean, printable Rx slips with Rx Tokens.
*   **💳 Dual-Track Billing:** Complete separation between clinical consultation billing (Front-Desk) and pharmacy dispensing (Pharmacy Staff), with distinct invoice numbers and templates.
*   **📈 Clinical Dashboards:** Real-time metrics for today's queue, pending billing, and quick actions tailored to the user's role.
*   **🖨️ Branded Print Templates:** High-quality, print-ready CSS templates for Prescriptions, Consultation Bills, and Pharmacy Invoices.
*   **🛡️ Secure Authentication:** JWT-based stateless authentication with express-rate-limit brute-force protection.

---

## 🛠️ Technology Stack

**Frontend (Client)**
*   **Framework:** React 18 + TypeScript + Vite
*   **State Management:** Zustand
*   **Local Database:** Dexie.js (IndexedDB wrapper)
*   **Styling:** Pure CSS (Responsive & Mobile-friendly)

**Backend (Server)**
*   **Framework:** Node.js + Express.js
*   **Local/Edge Database:** SQLite (Better-SQLite3)
*   **Cloud Database:** Supabase (PostgreSQL)
*   **Authentication:** JWT + bcryptjs

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   A Supabase project (for cloud sync)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/Adinath047/Medicos.git
cd Medicos
\`\`\`

### 2. Install dependencies
Install dependencies for both the frontend and backend:
\`\`\`bash
# Install frontend deps
cd client
npm install

# Install backend deps
cd ../server
npm install
\`\`\`

### 3. Environment Variables
Create a \`.env\` file in the **\`server/\`** directory:
\`\`\`env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
\`\`\`

### 4. Run the application
Run both the frontend and backend concurrently.

**Start the Backend (API & Sync Engine):**
\`\`\`bash
cd server
npm run dev
\`\`\`

**Start the Frontend (React App):**
\`\`\`bash
cd client
npm run dev
\`\`\`

The app will be available at \`http://localhost:5173\`.

---

## 🏗️ Folder Structure

\`\`\`text
Medicos/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── api/            # Axios client setup
│   │   ├── components/     # Reusable UI components
│   │   ├── db/             # Dexie local database schema
│   │   ├── pages/          # Clinical & Admin modules (Billing, Prescriptions, etc.)
│   │   ├── store/          # Zustand state management
│   │   ├── sync/           # Offline-first sync engine logic
│   │   └── utils/          # Print templates and helpers
│   └── index.html
└── server/                 # Backend Node.js Application
    ├── db/                 # SQLite setup & Supabase client
    ├── middleware/         # Auth & Rate limiting
    └── routes/             # API endpoints (Auth, Sync, etc.)
\`\`\`

## 📄 License
This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
