# Hospital Queue Management System – Project G05
### For IDH / NIID Hospital Clinics (National Institute of Infectious Diseases)

A production-ready, full-stack Hospital Queue Management and Clinical Consultation Web Application built with **React**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, Realtime, Row Level Security)**.

---

## 🌟 Key Features Across All Six Roles

### 1. Patient Portal
- **Profile & Identification**: Hospital MRN (`PAT-2026-0042`), contact info, blood group, and emergency contact details.
- **Appointments**: View scheduled and checked-in appointments.
- **Live Queue Token**: Real-time status badge (`Waiting`, `Called`, `Recalled`, `Consulting`, `Completed`).
- **Estimated Wait Time**: Calculated dynamically from active clinic queue positions.
- **Thermal Slip Printing**: View and print official token slips with barcode and room instructions.
- **Authorized Medical Records**: View past consultation notes, diagnoses, vital signs, and prescriptions.
- **Laboratory Reports**: View and download authorized lab reports (FBC, IgE, Biochemistry).
- **In-App Notifications**: Real-time alerts when called to doctor rooms or when lab results are ready.

### 2. Doctor Console
- **Station Management**: Select active consultation room (e.g. `Room 101`, `Room 102`).
- **Live Waiting Queue**: Real-time waiting list prioritized by triage level.
- **Call Next Patient**: Atomic server-side selection respecting priority rules (`urgent` > `elderly` / `child` > `normal`).
- **Recall Patient**: Re-alerts patients without generating new tokens; records recall timestamps and count.
- **Start Consultation**: Locks active patient to doctor and transitions queue status to `consulting`.
- **Complete Consultation**: Dedicated documentation dialog capturing Diagnosis, Chief Complaint, Symptoms, Vitals (BP, Pulse, Temp, SpO2), Clinical Notes, and Follow-up Schedules.

### 3. Receptionist Desk
- **Patient Search**: Search by Patient Name, Phone Number, NIC, or Hospital MRN.
- **Barcode / QR Scanner Integration**: Native USB Keyboard Wedge listener for physical patient cards.
- **Patient Registration**: Full demographic intake with duplicate phone/NIC collision detection.
- **Check-in & Official Token Generation**: Issues sequential tokens (`OPD015`, `PED008`), assigns priority, and automatically triggers thermal receipt printing.
- **Hospital Queue Overview**: Monitor waiting lists across all clinics.
- **Token Cancellation**: Strict cancellation dialog with mandatory reason audit logging.

### 4. Hospital Admin Console
- **Hospital Operations KPIs**: Real-time counts of waiting patients, active consultations, completed visits, and cancellations.
- **Clinic Workload & Capacity**: Monitor daily token quotas across departments.
- **Staff Provisioning**: Create and manage staff accounts (Doctors, Receptionists, Clinic Heads, Maintainers).
- **Role & Status Governance**: Activate, deactivate, or reassign staff roles and clinics.
- **Clinic Configuration**: Edit operating hours, room lists, and daily token limits.
- **Operational Reports**: Throughput and waiting-time statistics without compromising patient confidentiality.

### 5. Clinic Head Dashboard
- **Clinic Flow Supervision**: Monitor patient flow and queue congestion for assigned clinic.
- **Doctor Availability**: Live station tracking showing which doctors are actively consulting or available.
- **Waiting-Time Analytics**: Check-in to first-call duration, call-to-consultation response, and consultation duration.
- **Congestion Alerts**: Automatic visual alerts when waiting lists exceed operational thresholds.

### 6. Technical Maintainer Console
- **System Health Diagnostics**: Real-time database latency measurement and uptime status.
- **Supabase Realtime Monitor**: Live WebSocket channel status (`hospital_queue_realtime`).
- **Hardware & Display Connectivity**: Status heartbeat monitor for barcode scanners, receipt printers, and waiting hall screens.
- **System Error & Audit Logs**: Component-level diagnostic logging.
- **Strict Privacy Isolation**: Technical maintainers have zero access to clinical diagnoses or patient medical notes.

### 7. Public Waiting Hall TV Display (`/display`)
- Dedicated full-screen interface designed for waiting hall TV screens.
- Prominent **NOW CALLING** hero board with high-visibility token and room counter display.
- **Voice Announcement Chime**: Integrated text-to-speech announcement for newly called or recalled tokens.
- **Recent Consultations Feed**: Displays recently called tokens and upcoming queue entries.
- **Disconnection Alert Banner**: Visual warning if network connectivity or server sync is lost.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, date-fns |
| **Routing & State** | React Router v6, React Context API (`AuthContext`, `RealtimeContext`) |
| **Backend & Database** | Supabase (PostgreSQL 15), Supabase Auth, Supabase Realtime |
| **Security** | PostgreSQL Row Level Security (RLS) policies on all tables |
| **Testing** | Vitest, Testing Library, JSDOM |

---

## 📁 Project Structure

```
├── .env.example                     # Environment variables template
├── index.html                       # HTML entry point
├── package.json                     # Node.js dependencies and scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite bundler configuration
├── tailwind.config.js               # Tailwind CSS theme settings
├── SYSTEM_ARCHITECTURE.md           # Deep-dive architectural specification
├── HOSPITAL_DECISION_RECORD.md      # Unresolved workflow decisions & policies
├── supabase/
│   ├── config.toml                  # Supabase local CLI configuration
│   ├── seed.sql                     # Realistic fictional test data
│   └── migrations/
│       ├── 20260211000001_initial_schema.sql    # Tables, Enums, Foreign Keys
│       ├── 20260211000002_rls_and_policies.sql  # Row Level Security Policies
│       └── 20260211000003_queue_functions.sql   # Transactional RPC functions
└── src/
    ├── types/database.ts            # Complete TypeScript database types
    ├── lib/
    │   ├── supabase.ts              # Supabase client with connectivity probe
    │   └── utils.ts                 # Date/time formatting & badge styling
    ├── services/
    │   ├── queueService.ts          # Queue transactions & state management
    │   ├── patientService.ts        # Patient search, register, records
    │   ├── clinicService.ts         # Clinic configuration & doctor lists
    │   ├── adminService.ts          # Staff provisioning & device health
    │   ├── hardwareService.ts       # Barcode scanner wedge & receipt printer
    │   ├── notificationService.ts   # In-app real-time notification engine
    │   └── mockDataStore.ts         # Interactive local seed store
    ├── context/
    │   ├── AuthContext.tsx          # Authentication, session, role switching
    │   └── RealtimeContext.tsx      # WebSocket channels, push permissions
    ├── components/
    │   ├── common/                  # Navbar, Sidebar, Badges, Modals
    │   ├── dashboards/              # Dashboards for all 6 roles
    │   └── display/                 # Public Waiting Room TV Screen
    ├── pages/                       # Login, Dashboard, Notifications, 403
    ├── test/                        # Vitest automated test suites
    ├── App.tsx                      # Application routes & ProtectedRoute guards
    └── main.tsx                     # DOM root mounting
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js (v18 or v20+)
- npm or pnpm

### 2. Installation
```bash
# Clone or navigate to the project directory
cd "Hospital Queue Management System"

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

If connecting to an active Supabase project:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
*(Note: If left as default placeholders, the application automatically runs in **Local Interactive Mode** with realistic fictional hospital data loaded so all 6 dashboards can be explored immediately!)*

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Automated Tests
```bash
npm test
```

### 6. Production Build
```bash
npm run build
```

---

## 🔐 Demo Accounts (Quick Role-Switching)

For quick demonstration and evaluation, the login page features direct one-click buttons for each role:

| Role | Demo Account Name | Email | Password |
|---|---|---|---|
| **Patient** | Kasun Bandara | `patient@idh.hospital.lk` | `Password123!` |
| **Doctor** | Dr. Aruni Senanayake | `doctor@idh.hospital.lk` | `Password123!` |
| **Receptionist** | Nimali Jayawardena | `reception@idh.hospital.lk` | `Password123!` |
| **Hospital Admin** | Director Sunil Fernando | `admin@idh.hospital.lk` | `Password123!` |
| **Clinic Head** | Dr. Priyantha Weerasinghe | `clinichead@idh.hospital.lk` | `Password123!` |
| **Technical Maintainer**| Ruwan Silva | `maintainer@idh.hospital.lk` | `Password123!` |

---

## 🗄️ Supabase Cloud Deployment Guide

To deploy the backend to a live Supabase project:

1. **Create Project**: Go to [https://app.supabase.com](https://app.supabase.com) and create a new project.
2. **Retrieve API Keys**: In your Supabase Dashboard, navigate to **Project Settings > API** to find:
   - `Project URL` -> Set as `VITE_SUPABASE_URL` in `.env`
   - `anon public key` -> Set as `VITE_SUPABASE_ANON_KEY` in `.env`
3. **Apply Database Migrations**:
   Run using Supabase CLI or paste into the Supabase SQL Editor in order:
   - `supabase/migrations/20260211000001_initial_schema.sql`
   - `supabase/migrations/20260211000002_rls_and_policies.sql`
   - `supabase/migrations/20260211000003_queue_functions.sql`
4. **Load Seed Data**:
   Execute `supabase/seed.sql` in the SQL Editor to populate sample clinics, doctors, receptionists, and initial queue records.
5. **Enable Realtime**:
   In the Supabase Dashboard, go to **Database > Replication** and verify that Realtime is enabled for `public.queue_entries` and `public.notifications`.
6. **Deploy Frontend**:
   Deploy the build output (`dist/`) to Vercel, Netlify, or any static hosting provider. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider's environment settings.
