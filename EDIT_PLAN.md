# Edit plan

## Information gathered
- The “email exists → send reset/verification email” logic is already correct in:
  - `server/services/auth.service.ts` `requestPasswordReset(email)`
  - It returns early when user doesn’t exist; only creates OTP + calls `createNotification` (with `channels` containing `EMAIL`) when user exists.
- The actual failure (`Mail command failed: 530 Authentication required`) occurs in:
  - `lib/notifications/service.ts` `sendEmail()` when calling `nodemailer`.
- As written, `sendEmail()` does not catch SMTP errors, so TRPC mutation fails with HTTP 500, even though the existence-check was correct.

## Plan
1. Update `lib/notifications/service.ts`:
   - Remove the hardcoded SMTP host/port (currently `smtp.gmail.com:587`) so it uses env values.
   - Wrap `transport.sendMail(...)` in `try/catch`.
   - On SMTP failure: `console.error(...)` and return without throwing.
2. Keep behavior for non-existing users unchanged.

## Dependent files
- `lib/notifications/service.ts`

## Followup steps
- Re-run the forgot-password request flow.
- Confirm TRPC no longer returns 500 when SMTP fails.

