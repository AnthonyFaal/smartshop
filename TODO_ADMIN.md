# SMARTSHOP ADMIN PHASE (Admin Module Only) — Implementation Tracker

- [ ] Admin Verification Center
  - [ ] Verification queue with seller/store, progress, status, trust score, risk score, registration date
  - [ ] Approve / Reject (reason required) / Manual review / Resubmission required
  - [ ] Decision audit history

- [ ] Ghana Card Review Panel
  - [ ] Front/back images access
  - [ ] Extracted OCR information
  - [ ] Verification scores + image checks (blur/edge/crop/brightness/glare/resolution)
  - [ ] Approve / Reject / Request resubmission (reject reason required)
  - [ ] Decision history + immutable audit logs

- [ ] GPS Verification Review
  - [ ] latitude/longitude/accuracy/timestamp + location history + accuracy validation result
  - [ ] Map view
  - [ ] Approve / Reject / Request resubmission
  - [ ] Verified coordinates cannot be edited
  - [ ] Immutable audit logs

- [ ] Escrow Admin Dashboard
  - [ ] Totals (held funds / pending / released / refunded / disputed)
  - [ ] Escrow transaction list + buyer/seller/order/payment details
  - [ ] Dispute resolution: release payment OR refund buyer
  - [ ] Immutable audit logs for all actions

- [ ] Paystack Payment Admin Panel
  - [ ] Payment timeline (ref/status/amount/buyer/seller/order)
  - [ ] Successful/failed/pending + refund records
  - [ ] Webhook verification + duplicate event prevention

- [ ] Admin Subscription Package Management
  - [ ] CRUD plans (name/description/price/currency/duration/maxProducts/features/isActive)
  - [ ] Disable/enable/delete + audit logs

- [ ] Seller Subscription Management
  - [ ] Active/expired/cancelled subscriptions
  - [ ] Payment history (ref/amount/start/expiry/status)

- [ ] Product Publishing Control
  - [ ] Gate seller publish based on: Phone verified, Ghana card approved, GPS approved, Store verified, Active subscription
  - [ ] Admin override with permission check + audit log

- [ ] Fraud Center
  - [ ] Filters: date/trust score/verification status/risk level
  - [ ] Tables: high risk/suspicious/high refunds/high disputes/failed verifications/AI risk score
  - [ ] Risk computation based on existing trust/dispute/payment metrics (no facial verification)

- [ ] Admin Audit Log Viewer (immutable)
  - [ ] Search/filter/pagination
  - [ ] Export
  - [ ] Tracks verification decisions, escrow actions, subscription changes, seller approvals, refund actions

- [ ] Database + Prisma updates (migrations required)
  - [ ] Add/align models:
    - [ ] SellerVerification (extend for phone/ghana/gps/store progression if needed)
    - [ ] VerificationChallenge (if applicable)
    - [ ] LocationVerification
    - [ ] EscrowAccount
    - [ ] EscrowTransaction
    - [ ] EscrowDispute
    - [ ] SubscriptionPlan
    - [ ] SellerSubscription
    - [ ] PaymentTransaction
    - [ ] AdminAuditLog (immutable schema matching required fields)
  - [ ] Relations, indexes, constraints

- [ ] Security hardening
  - [ ] Admin-only access via TRPC adminProcedure + route protection
  - [ ] Redis-backed rate limiting for /admin/* and admin TRPC endpoints
  - [ ] Signed URLs for private document URLs

- [ ] Paystack integration
  - [ ] Replace mock provider
  - [ ] Initiate payment
  - [ ] Verify webhook signature
  - [ ] Duplicate prevention (DB/Redis)
  - [ ] Map events into payment/escrow transaction state transitions

- [ ] Final verification
  - [ ] Typecheck
  - [ ] Lint
  - [ ] Run tests
  - [ ] End-to-end smoke tests for critical admin flows
