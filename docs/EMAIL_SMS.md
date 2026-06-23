Email & SMS configuration

- Development fallback: If SMTP is not configured, the server uses an Ethereal test account and logs a preview URL to the console. This allows end-to-end verification of flows without a real SMTP provider.

Environment variables:

- `SMTP_HOST` - (optional) SMTP host. If omitted, Ethereal is used in dev.
- `SMTP_PORT` - (optional) SMTP port. Defaults to `587`.
- `SMTP_USER` - (optional) SMTP username. If omitted, Ethereal is used in dev.
- `SMTP_PASSWORD` - (optional) SMTP password.
- `SMTP_FROM` - (optional) From address for emails. Defaults to `noreply@smartshop.gh`.

To enable real email sending in production, set the SMTP_* variables with values from your provider (Sendgrid, Mailgun, SES, etc.).

SMS

- `SMS_PROVIDER` - provider name (currently only `hubtel` is accepted logically; integration is TODO).
- `SMS_API_KEY` - API key for the SMS provider. If omitted, the server will log SMS messages instead of sending them.
- `SMS_SENDER_ID` - sender id to use for SMS.

Notes

- Email failures are intentionally non-fatal for auth flows to avoid leaking account existence and to keep UX consistent. Check logs for errors or the Ethereal preview URL during development.
- For production, ensure `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are configured and that `NODE_ENV` is set to `production`.
