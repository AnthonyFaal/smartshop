# TODO - Email verification enforcement

## Step 1: Confirm schema support
- [x] `emailVerified` exists in `prisma/schema.prisma` (mapped from `email_verified`)

## Step 2: Implement email verification OTP support (end-to-end)
- [ ] Update `prisma/schema.prisma`
  - Add `EMAIL_VERIFICATION` to `OtpPurpose`
- [ ] Update `server/services/auth.service.ts`
  - Add `sendEmailVerification(...)`
  - Extend `verifyOtp(...)` to support `purpose=EMAIL_VERIFICATION`
- [ ] Update `server/services/auth.service.ts`
  - In `loginUser(...)`, block when `user.emailVerified === false`
  - Send verification code and throw a recognizable TRPC error
- [ ] Update `lib/auth/session.ts`
  - In `getSessionUser()` and `refreshSession()`, return `null` when `emailVerified=false`

## Step 3: TRPC endpoints for email verification
- [ ] Update `server/trpc/routers/auth.ts`
  - Add `sendEmailVerification` (resend)
  - Add `verifyEmailOtp`

## Step 4: Frontend redirect + verification UI
- [ ] Update `app/(auth)/login/page.tsx`
  - On `EMAIL_VERIFICATION_REQUIRED`, redirect to `/seller/verification`
- [ ] Create `app/seller/verify-email/page.tsx`
  - Input email verification code, call `trpc.auth.verifyEmailOtp`, then redirect

## Step 5: Thorough testing
- [ ] Critical-path testing:
  - login verified user ✅
  - login unverified user → blocks login, sends email code, redirects to verification page
  - resend email code (if implemented)
  - verify code → `emailVerified=true` and subsequent login works
  - existing session cookie should not keep unverified users authenticated
- [ ] Thorough testing:
  - all affected endpoints: auth.login, auth.me, new resend/verify endpoints
  - protected routes should be inaccessible until verified
  - error handling UX: wrong/expired code, resend cooldown edge cases
