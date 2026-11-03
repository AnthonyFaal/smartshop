# SmartShop launch readiness

This is the remaining-work list, ordered by what can destroy trust or cash flow.
Items marked **implemented** exist in the application; an implementation is not a
substitute for assigning an owner and proving it in the pilot.

## 1. Money and fulfilment

- [x] **Implemented:** transparent subtotal, marketplace fee, delivery fee and
  seller payout are recorded separately per order.
- [x] **Implemented:** pickup codes, delivery zones, paid delivery tasks and an
  auditable runner hand-off state machine.
- [x] **Implemented:** a seller settlement ledger with a seven-day buyer-
  protection hold, operations queue and an explicit admin 'mark paid' action.
- [ ] **External owner: Finance + payment provider.** Reconcile Paystack
  settlements daily against SmartShop payments and settlement records. Do not
  bulk-payout sellers until the daily reconciliation sheet balances.
- [ ] **External owner: Operations.** Sign runner agreements, define pickup
  proof/delivery proof, cash handling rules and a response SLA before enabling
  campus delivery.
- [ ] **External owner: Product/Legal.** Publish the exact dispute window,
  refund eligibility and seller settlement timetable. Test the full refund path
  against a real provider sandbox.

## 2. Trust and safety

- [x] **Implemented:** reviews are now marked verified only for a buyer who has
  a delivered/completed order containing that product.
- [x] **Implemented:** OTP values are no longer written to application logs;
  rate limiting fails closed on Redis failure.
- [ ] **External owner: Compliance.** Register and operate as required by Ghana's
  Data Protection Commission; appoint the data-protection supervisor; approve a
  retention/deletion schedule for ID/selfie data.
- [ ] **External owner: Operations.** Manual Ghana Card/selfie review must use a
  two-person escalation process for suspicious applications. Do not advertise
  it as biometric or automated face matching.
- [ ] **Product rule.** Curate initial categories. Exclude high-value used
  electronics, medicines, weapons, counterfeits and regulated goods until the
  dispute and authenticity operation has evidence it can handle them.

## 3. Growth and economics

- [x] **Implemented:** the default Pilot Seller plan now supports 50 products
  and basic analytics; it does not force a merchant to pay before proving value.
- [ ] **Owner: Growth.** Recruit 20–40 reliable sellers personally; do not open
  unrestricted seller acquisition. Aim for in-stock, repeatable inventory.
- [ ] **Owner: Finance.** Maintain a weekly zone P&L: platform fee + delivery
  revenue − payment fee − runner cost − refunds/support − promotion subsidy.
- [ ] **Owner: Product.** Instrument and review: fulfilled orders, 30-day repeat
  purchase, promised-vs-actual delivery time, dispute rate, cancellation rate,
  GMV, take rate and contribution margin.
- [ ] **Decision gate.** Expand only after 100 weekly fulfilled orders, 25%+
  30-day repeat purchase, 90%+ on-time fulfilment, under 3% disputes and four
  positive contribution-margin weeks.

## 4. Technical release work

- [ ] **Owner: Engineering.** Replace the SMS development stub with a contracted
  provider integration, provider webhook validation and delivery-status logging.
- [ ] **Owner: Engineering.** Move payment-provider initiation out of the database
  transaction into an idempotent payment-intent workflow. This avoids holding
  database locks while waiting for a network request.
- [ ] **Owner: Engineering.** Add a visible admin operations screen for delivery
  and settlement queues, plus runner assignment controlled by a least-privilege
  staff role.
- [ ] **Owner: Engineering.** Add scheduled jobs for expiring payment sessions,
  releasing held settlements, delivery-SLA alerts and verified-document deletion.
- [ ] **Owner: Engineering.** Resolve the remaining lint warnings before launch
  and add integration tests for payment webhook → order → delivery → settlement.

## Business-model rule

During the pilot, SmartShop earns from a transparent marketplace fee and a
buyer-paid delivery fee. Seller subscriptions, paid promotion and advanced AI
tools are experiments only after the core loop is proven. Never use GMV,
registrations or listings as evidence of product-market fit; only repeated,
positive-margin fulfilled orders count.
