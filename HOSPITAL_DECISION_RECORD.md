# Project G05: Hospital Queue Management System
## Architectural Decision Record (ADR) & Hospital Policy Baseline

This document formally records architectural decisions made to resolve ambiguities identified in the requirement specification document (`Hospital_Queue_Management_System_Role_Requirements.pdf`, Sections 8, 9, and 11) for IDH/NIID Hospital Clinics.

---

### Decision 1: Token Generation Trigger & Authority

* **Ambiguity:** Can tokens be generated automatically upon appointment booking or self-service by patients?
* **Resolution:** 
  - **Tokens are generated strictly by authorized Receptionists upon physical in-person check-in.**
  - Rationale: Patients often book appointments days in advance; issuing queue tokens before physical hospital arrival corrupts active waiting hall sequencing.
  - Patients can view their appointments in the Patient Portal, but the official queue token is only provisioned after reception identity verification.
  - Configuration flexibility: Stored in `visits.check_in_time` and `queue_entries.checked_in_at`.

---

### Decision 2: Multi-Tier Queue Priority & Ordering Policy

* **Ambiguity:** What deterministic rules determine which token is called next when multiple categories exist?
* **Resolution:**
  - Implemented an atomic sorting hierarchy in `call_next_patient`:
    1. **Priority Categorization:**
       - `urgent` (Weight 1 - Fast-track triage)
       - `elderly` (Weight 2 - Senior citizen courtesy)
       - `child` (Weight 3 - Pediatric care)
       - `normal` (Weight 4 - Standard outpatient arrival)
    2. **Chronological Sub-sort:**
       - Within the same priority tier, entries are strictly ordered by `sequence_number ASC` (and `checked_in_at ASC`).
  - Rationale: Ensures clinical emergencies and vulnerable patients receive prioritized access while preserving fair FIFO (First-In, First-Out) within tiers.

---

### Decision 3: Patient Recall Policy

* **Ambiguity:** Can doctors recall only the current patient, or also patients who missed their initial call? How are tokens handled?
* **Resolution:**
  - Recall maintains the **original token number** and preserves complete queue history.
  - Never generates a new token number.
  - Automatically increments `recall_count` and timestamps `recalled_at`.
  - Fires an alert to the waiting hall TV board (visual badge + speech chime) and dispatches an in-app urgent notification to the patient.

---

### Decision 4: Medical History Privacy Boundaries

* **Ambiguity:** Which hospital roles may inspect clinical consultation notes and laboratory diagnostic summaries?
* **Resolution:**
  - **Patient:** Own authorized records only (`auth.uid() = patient_id`).
  - **Doctor:** Active consultation patients only.
  - **Receptionist:** Restricted to demographic and contact data (Name, Phone, NIC, Address, Emergency Contact). **Forbidden from viewing clinical notes, diagnoses, and lab results.**
  - **Hospital Admin & Clinic Head:** Aggregated operational metrics (throughput, average wait times, cancellation rates) without patient-identifiable clinical notes.
  - **Technical Maintainer:** Restricted to infrastructure, hardware, and server logs. **Forbidden from accessing clinical files.**

---

### Decision 5: Hardware Scanner & Printer Architecture

* **Ambiguity:** Are physical hardware bridges or custom microcontrollers required?
* **Resolution:**
  - Adopted standard **USB Keyboard Wedge** protocol for 1D/2D Barcode Scanners.
  - Adopted standard **80mm ESC/POS Browser Print Dialog** for Thermal Receipt Printers.
  - Rationale: Zero hardware drivers or Arduino microcontrollers needed; works natively on modern browsers and standard hospital POS receipt printers.
