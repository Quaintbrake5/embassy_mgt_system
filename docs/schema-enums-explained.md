# Embassy Management System — Schema Enums Explained

The schema defines **15 Prisma enums** across 6 domain groups. Below is each enum with its values, meaning, and the models that reference it.

---

## 1. UserStatus — Account lifecycle

```prisma
enum UserStatus {
  PENDING
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

| Value | Meaning |
|-------|---------|
| PENDING | Account created but not yet verified/activated |
| ACTIVE | Account fully verified and operational |
| INACTIVE | Account disabled by user action or prolonged inactivity |
| SUSPENDED | Account temporarily locked due to policy violation or security concern |

**Used by:** `User.status` (default: `PENDING`)

---

## 2. Gender — Demographic field for profiles

```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
}
```

| Value | Meaning |
|-------|---------|
| MALE | Male gender |
| FEMALE | Female gender |
| OTHER | Non-binary, undisclosed, or other gender identity |

**Used by:** `Profile.gender` (required)

---

## 3. VisaType — Categories of visa applications

```prisma
enum VisaType {
  TOURIST
  BUSINESS
  WORK
  STUDENT
  DIPLOMATIC
  TRANSIT
  MEDIA
  MEDICAL
  FAMILY_REUNION
}
```

| Value | Meaning |
|-------|---------|
| TOURIST | Short-term tourism/visit visa |
| BUSINESS | Business travel or commercial activities |
| WORK | Employment or labor visa |
| STUDENT | Academic study or research program |
| DIPLOMATIC | Diplomatic or official passport holders |
| TRANSIT | Airport/short-term transit through a country |
| MEDIA | Press, journalism, or film crews |
| MEDICAL | Medical treatment or health-related travel |
| FAMILY_REUNION | Family member joining a resident/citizen |

**Used by:** `VisaApplication.visaType` (required)

---

## 4. VisaStatus — Full lifecycle of a visa application

```prisma
enum VisaStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  MORE_INFO_REQUESTED
  APPROVED
  REJECTED
  ESCALATED
  ISSUED
}
```

| Value | Meaning |
|-------|---------|
| DRAFT | Applicant has started but not yet submitted |
| SUBMITTED | Application formally submitted, pending review |
| UNDER_REVIEW | Being actively assessed by a consular officer |
| MORE_INFO_REQUESTED | Officer requested additional documents/clarification |
| APPROVED | Application approved, visa can be issued |
| REJECTED | Application denied |
| ESCALATED | Sent to higher authority or headquarters for decision |
| ISSUED | Visa physically/stamp issued to applicant |

**Used by:** `VisaApplication.status` (default: `DRAFT`)

---

## 5. AppointmentStatus — Slot and check-in tracking

```prisma
enum AppointmentStatus {
  AVAILABLE
  BOOKED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

| Value | Meaning |
|-------|---------|
| AVAILABLE | Time slot is open for booking |
| BOOKED | Slot claimed by an applicant |
| CHECKED_IN | Applicant arrived on-site and checked in (QR/token) |
| IN_PROGRESS | Applicant currently being served at a window |
| COMPLETED | Service delivered, appointment closed |
| CANCELLED | Booking cancelled by applicant or admin |
| NO_SHOW | Applicant did not arrive for their slot |

**Used by:** `Appointment.status` (default: `AVAILABLE`)

---

## 6. ServiceCategory — Top-level classification of consular services

```prisma
enum ServiceCategory {
  PASSPORT
  CIVIL_REGISTRY
  EMERGENCY_ASSISTANCE
  DOCUMENT_LEGALIZATION
  VISA
  NOTARIAL
  CONSULAR_REPORT
}
```

| Value | Meaning |
|-------|---------|
| PASSPORT | Passport renewals, lost/stolen, emergency travel certificates |
| CIVIL_REGISTRY | Birth, marriage, death registrations in host country |
| EMERGENCY_ASSISTANCE | Crisis tracking, evacuation, welfare checks |
| DOCUMENT_LEGALIZATION | Apostille processing, document attestation, digital seals |
| VISA | All visa-related services (tourist, work, student, etc.) |
| NOTARIAL | Notarization of documents for official use |
| CONSULAR_REPORT | Official reports issued by the consulate |

**Used by:** `ServiceType.category` (required)

---

## 7. RequestStatus — Service request workflow

```prisma
enum RequestStatus {
  DRAFT
  SUBMITTED
  IN_PROGRESS
  COMPLETED
  CLOSED
  CANCELLED
}
```

| Value | Meaning |
|-------|---------|
| DRAFT | Request started, not yet submitted |
| SUBMITTED | Formally submitted and queued for processing |
| IN_PROGRESS | Currently being handled by embassy staff |
| COMPLETED | Service delivered, outcome available |
| CLOSED | Record archived after completion |
| CANCELLED | Request withdrawn or terminated before completion |

**Used by:** `ServiceRequest.status` (default: `DRAFT`)

---

## 8. DocumentType — Kinds of documents uploaded to the system

```prisma
enum DocumentType {
  PASSPORT
  BIOMETRIC
  PHOTOGRAPH
  NATIONAL_ID
  BIRTH_CERTIFICATE
  MARRIAGE_CERTIFICATE
  DEATH_CERTIFICATE
  TRAVEL_INSURANCE
  INVITATION_LETTER
  SUPPORTING_DOCUMENT
  OTHER
}
```

| Value | Meaning |
|-------|---------|
| PASSPORT | Passport data page scan |
| BIOMETRIC | Fingerprint/facial recognition data |
| PHOTOGRAPH | Passport-style photograph |
| NATIONAL_ID | National identity card scan |
| BIRTH_CERTIFICATE | Certified birth record |
| MARRIAGE_CERTIFICATE | Certified marriage record |
| DEATH_CERTIFICATE | Certified death record |
| TRAVEL_INSURANCE | Proof of travel/health insurance |
| INVITATION_LETTER | Letter of invitation from host |
| SUPPORTING_DOCUMENT | Any other supporting evidence |
| OTHER | Unclassified document type |

**Used by:** `VisaDocument.documentType` (required)

---

## 9. PaymentStatus — Financial transaction tracking

```prisma
enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}
```

| Value | Meaning |
|-------|---------|
| PENDING | Payment initiated but not yet confirmed |
| COMPLETED | Payment successfully processed |
| FAILED | Payment declined or transaction error |
| REFUNDED | Amount returned to payer |
| CANCELLED | Payment voided before processing |

**Used by:** `Payment.status` (default: `PENDING`)

---

## 10. DecisionType — Visa adjudication outcomes

```prisma
enum DecisionType {
  APPROVE
  REJECT
  REQUEST_MORE_INFO
  ESCALATE_TO_HQ
}
```

| Value | Meaning |
|-------|---------|
| APPROVE | Visa application granted by officer |
| REJECT | Visa application denied with rationale |
| REQUEST_MORE_INFO | Officer needs additional documents before deciding |
| ESCALATE_TO_HQ | Application sent to headquarters for high-level review |

**Used by:** `VisaDecision.decision` (required)

---

## 11. UrgencyLevel — Priority classification

```prisma
enum UrgencyLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

| Value | Meaning |
|-------|---------|
| LOW | Routine, no time pressure |
| MEDIUM | Standard priority, normal processing timeframe |
| HIGH | Expedited, requires prompt attention |
| CRITICAL | Immediate action required (life-threatening or diplomatic crisis) |

**Used by:**
- `EmergencyCase.urgency` (default: `MEDIUM`)
- `WatchlistEntry.riskLevel` (default: `MEDIUM`)

---

## 12. CheckStatus — Security vetting check outcomes

```prisma
enum CheckStatus {
  PENDING
  IN_PROGRESS
  CLEARED
  FLAGGED
  ERROR
}
```

| Value | Meaning |
|-------|---------|
| PENDING | Check queued and awaiting execution |
| IN_PROGRESS | Background/security check actively running |
| CLEARED | No adverse findings, applicant passes |
| FLAGGED | Match found on watchlist or adverse result |
| ERROR | Check could not be completed (system or data issue) |

**Used by:** `VerificationCheck.status` (default: `PENDING`)

---

## 13. CaseStatus — Emergency case lifecycle

```prisma
enum CaseStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

| Value | Meaning |
|-------|---------|
| OPEN | Emergency reported, not yet assigned |
| IN_PROGRESS | Consular staff actively working the case |
| RESOLVED | Emergency situation addressed, outcome documented |
| CLOSED | Case formally archived after resolution |

**Used by:** `EmergencyCase.status` (default: `OPEN`)

---

## 14. PouchStatus — Diplomatic pouch chain-of-custody

```prisma
enum PouchStatus {
  CREATED
  IN_TRANSIT
  RECEIVED
  CLOSED
  LOST
}
```

| Value | Meaning |
|-------|---------|
| CREATED | Pouch sealed and registered in the system |
| IN_TRANSIT | Pouch dispatched and en route to destination |
| RECEIVED | Pouch arrived and signed for at destination embassy |
| CLOSED | Pouch contents verified and chain-of-custody completed |
| LOST | Pouch missing during transit (trigger investigation) |

**Used by:** `DiplomaticPouch.status` (default: `CREATED`)

---

## 15. ClearanceLevel — Staff security tiers

```prisma
enum ClearanceLevel {
  LEVEL_1
  LEVEL_2
  LEVEL_3
  LEVEL_4
  LEVEL_5
}
```

| Value | Meaning (typical mapping) |
|-------|---------------------------|
| LEVEL_1 | Basic — administrative/back-office staff |
| LEVEL_2 | Standard — consular assistants, general officers |
| LEVEL_3 | Enhanced — visa adjudicators, case officers |
| LEVEL_4 | High — senior diplomats, security personnel |
| LEVEL_5 | Maximum — ambassador, head of station, classified ops |

**Used by:** `StaffClearance.clearanceLevel` (required)

---

## Quick Reference: Enum → Model Mapping

| Enum | Used On | Required | Default |
|------|---------|----------|---------|
| UserStatus | User.status | Y | PENDING |
| Gender | Profile.gender | Y | — |
| VisaType | VisaApplication.visaType | Y | — |
| VisaStatus | VisaApplication.status | Y | DRAFT |
| AppointmentStatus | Appointment.status | Y | AVAILABLE |
| ServiceCategory | ServiceType.category | Y | — |
| RequestStatus | ServiceRequest.status | Y | DRAFT |
| DocumentType | VisaDocument.documentType | Y | — |
| PaymentStatus | Payment.status | Y | PENDING |
| DecisionType | VisaDecision.decision | Y | — |
| UrgencyLevel | EmergencyCase.urgency, WatchlistEntry.riskLevel | Y | MEDIUM |
| CheckStatus | VerificationCheck.status | Y | PENDING |
| CaseStatus | EmergencyCase.status | Y | OPEN |
| PouchStatus | DiplomaticPouch.status | Y | CREATED |
| ClearanceLevel | StaffClearance.clearanceLevel | Y | — |
