# Hospital Queue Management System (Project G05)
## System Architecture & Technical Specifications

**Hospital Context:** IDH / NIID Hospital Clinics (National Institute of Infectious Diseases)  
**Document Classification:** Technical Architecture & Database Design  
**Target Architecture:** Vite + React + TypeScript + Supabase (PostgreSQL, Auth, Realtime, RLS)

---

### 1. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|                                                                                       |
|  +--------------------+   +--------------------+   +--------------------+             |
|  |  Patient Portal    |   |  Doctor Console    |   | Reception Console  |             |
|  |  (Mobile & Web)    |   |  (Clinical Desk)   |   | (Check-in & Print) |             |
|  +--------------------+   +--------------------+   +--------------------+             |
|                                                                                       |
|  +--------------------+   +--------------------+   +--------------------+             |
|  | Hospital Admin     |   | Clinic Head        |   | Tech Maintainer    |             |
|  | (Staff & Config)   |   | (Flow & SLA)       |   | (Health & Display) |             |
|  +--------------------+   +--------------------+   +--------------------+             |
|                                                                                       |
|  +--------------------------------------------------------------------+               |
|  |                 Public Waiting Hall TV Displays                     |              |
|  |           (Full-Screen Real-Time Visual & Voice Chimes)            |              |
|  +--------------------------------------------------------------------+               |
+------------------------------------------+--------------------------------------------+
                                           |
                                 HTTPS / WSS (WebSocket)
                                           |
+------------------------------------------v--------------------------------------------+
|                                  SUPABASE BACKEND                                     |
|                                                                                       |
|   +--------------------+   +------------------------+   +-------------------------+   |
|   |   Supabase Auth    |   |   Supabase Realtime    |   |  Transactional Queue    |   |
|   |  (JWT & Sessions)  |   | (postgres_changes/ws)  |   |  Functions & RPCs       |   |
|   +--------------------+   +------------------------+   +-------------------------+   |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                     Row Level Security (RLS) Engine                           |   |
|   |    (Role-based isolation: Patient / Doctor / Reception / Admin / Head / Tech) |   |
|   +-------------------------------------------------------------------------------+   |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                             PostgreSQL Database                               |   |
|   | profiles  •  clinics  •  patients  •  appointments  •  visits  • queue_entries|   |
|   | queue_events • consultations • prescriptions • lab_reports • notifications     |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

### 2. Database Schema & Relational Model

The database is built on PostgreSQL inside Supabase, organized with relational integrity, foreign keys, timestamps, and indexes:

1. **`profiles`**: Central identity table linked to `auth.users(id)`.
   - Fields: `id`, `role` (`user_role` enum), `full_name`, `email`, `phone`, `national_id`, `staff_id`, `specialty`, `clinic_id`, `is_active`, `created_at`.
2. **`clinics`**: Outpatient department units.
   - Fields: `id`, `name`, `code` (e.g. `OPD`, `PED`, `CARD`), `department`, `rooms` (`TEXT[]`), `operating_hours` (`JSONB`), `is_active`, `max_daily_tokens`, `current_token_sequence`.
3. **`patients`**: Extended patient demographic details.
   - Fields: `id` (references `profiles.id`), `patient_id` (MRN, e.g. `PAT-2026-0042`), `date_of_birth`, `gender`, `blood_group`, `allergies`, `emergency_contact`, `address`.
4. **`appointments`**: Scheduled clinic visits.
   - Fields: `id`, `appointment_number`, `patient_id`, `clinic_id`, `doctor_id`, `appointment_date`, `appointment_time`, `status`, `reason`.
5. **`visits`**: Verified physical hospital appearances.
   - Fields: `id`, `visit_number`, `patient_id`, `clinic_id`, `doctor_id`, `appointment_id`, `visit_date`, `check_in_time`, `status`, `is_walk_in`, `check_in_by`.
6. **`queue_entries`**: Core transactional queue entity.
   - Fields: `id`, `token_number` (`OPD015`), `clinic_id`, `doctor_id`, `visit_id`, `patient_id`, `sequence_number`, `priority` (`normal`, `elderly`, `child`, `urgent`), `status` (`waiting`, `called`, `recalled`, `consulting`, `completed`, `cancelled`), `counter_or_room`, `checked_in_at`, `called_at`, `recalled_at`, `recall_count`, `consultation_started_at`, `completed_at`, `cancellation_reason`, `cancelled_by`.
7. **`queue_events`**: Immutable audit log of every token status transition.
8. **`consultations`**: Medical records created during doctor consultations.
   - Fields: `id`, `queue_entry_id`, `visit_id`, `patient_id`, `doctor_id`, `clinic_id`, `chief_complaint`, `symptoms`, `clinical_notes`, `diagnosis`, `vitals` (`JSONB`), `follow_up_date`, `consultation_start`, `consultation_end`.
9. **`prescriptions` & `prescription_items`**: Medications issued by doctors.
10. **`laboratory_reports`**: Lab investigations with authorized access flags.
11. **`notifications`**: Persistent in-app and push notification entity.
    - Fields: `id`, `recipient_id`, `type`, `title`, `message`, `related_entity_id`, `related_entity_type`, `is_read`, `read_at`, `created_at`.
12. **`devices`**: Status tracking for hardware peripherals (barcode scanners, thermal printers, hall displays).
13. **`system_health_logs`**: System connectivity, latency, and error tracking.

---

### 3. Server-Side Transactional Queue Workflow

All queue operations are executed through atomic PostgreSQL functions using row-level locking (`FOR UPDATE` and `FOR UPDATE SKIP LOCKED`) to eliminate race conditions when multiple staff members or doctors interact concurrently:

```
[Patient Arrival]
       │
       ▼
[Receptionist Desk] ─── Verifies appointment / Walk-in eligibility
       │
       ▼
`generate_queue_token()`
  • Locks clinic row (prevents sequence collisions)
  • Validates visit does not already have an active token (duplicate prevention)
  • Issues sequential token (e.g. OPD016)
  • Sets status to 'waiting'
  • Dispatches in-app notification to Patient & Doctor
  • Thermal Printer prints official ticket
       │
       ▼
[Doctor Console: `call_next_patient()`]
  • Selects next eligible patient with `SKIP LOCKED`
  • Priority weight: Urgent (1) > Elderly (2) > Child (3) > Normal (4)
  • Sub-sort: Sequence Number ASC / Check-in Time ASC
  • Sets status to 'called', records `called_at` & `counter_or_room`
  • Triggers Supabase Realtime broadcast -> TV display & Patient Notification
       │
       ├─── (If patient does not respond) ──► `recall_patient()`
       │                                        • Preserves token number
       │                                        • Increments `recall_count`
       │                                        • Updates TV screen & chimes
       │
       ▼
`start_consultation()`
  • Sets status to 'consulting'
  • Locks patient record to active doctor
       │
       ▼
`complete_consultation()`
  • Saves diagnosis, vitals, clinical notes, follow-up
  • Sets status to 'completed'
  • Discharges patient from active queue
  • Updates clinic operational KPIs
```

---

### 4. Row Level Security (RLS) & Access Governance

Security is enforced at the database layer through PostgreSQL Row Level Security:

| Role | View Own Profile | View Appointments | Register Patient | Generate Token | Medical Records / Notes | Call / Recall Queue | Staff Administration |
|---|---|---|---|---|---|---|---|
| **Patient** | Yes | Own only | No | No | Own authorized only | No | No |
| **Doctor** | Yes | Assigned clinic | No | No | Assigned patients | Yes | No |
| **Receptionist**| Yes | Operational | Yes | Yes | **NO (Forbidden)** | No | No |
| **Hospital Admin**| Yes | All summaries | Yes (Admin) | Configure rules | Aggregated only | No | **YES** |
| **Clinic Head** | Yes | Assigned clinic | No | Monitor | **NO (Forbidden)** | Exceptions only | No |
| **Tech Maintainer**| Yes | No clinical | No | No | **NO (Forbidden)** | No | System accounts only |

---

### 5. Hardware Peripheral Integration

1. **Barcode / QR Scanners**:
   - Implemented via a lightweight keyboard-wedge listener (`hardwareService.attachScannerListener`).
   - Detects rapid serial keystroke bursts (< 60ms latency between keys) ending in `Enter`.
   - Intercepts hospital MRN barcode stickers on patient cards without requiring custom browser plugins or Arduino dependencies.

2. **Thermal Receipt Printers (ESC/POS compatible)**:
   - Formats clean 80mm printable thermal slips (`hardwareService.printTokenReceipt`).
   - Automatically triggers standard browser print dialog directed to thermal receipt printer.

3. **Public Queue TV Displays**:
   - Dedicated kiosk route `/display` or `/display/:clinicId`.
   - Real-time updates via Supabase WebSocket channel.
   - Automatic disconnected/stale data warning banner when network or server heartbeats are interrupted.
   - Built-in speech chime announcement via Web Speech API.
