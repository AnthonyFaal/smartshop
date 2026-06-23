

export interface EmailTemplateOptions {
  title: string;
  subtitle: string;
  paragraphs: string[];
  code?: string;
  codeSubtitle?: string;
  alertTitle?: string;
  alertText?: string;
}

const APP_NAME = process.env.APP_NAME || "SmartShop";
const SECURITY_NOTICE_TEXT = "Do not share this code with anyone. If you didn't initiate this action, please ignore this notice and secure your parameters if you suspect malicious activity.";

/**
 * Universal layout wrapper that compiles design tokens into standard HTML email tables.
 */
export function compileHtmlEmail(options: EmailTemplateOptions): string {
  const currentYear = new Date().getFullYear();

  const codeSection = options.code
    ? `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:28px 20px; margin:30px 0; text-align:center;">
        <div style="font-size:42px; font-weight:800; letter-spacing:10px; color:#0f172a; font-family:Arial,Helvetica,sans-serif;">
          ${options.code}
        </div>
        ${options.codeSubtitle ? `<p style="margin:12px 0 0; color:#64748b; font-size:14px;">${options.codeSubtitle}</p>` : ""}
      </div>
    `
    : "";

  const alertSection = options.alertText
    ? `
      <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:14px; padding:18px; margin-top:25px; color:#9a3412; font-size:14px; line-height:22px;">
        ${options.alertTitle ? `<div style="font-weight:700; margin-bottom:8px; color:#7c2d12;">${options.alertTitle}</div>` : ""}
        ${options.alertText}
      </div>
    `
    : "";

  const paragraphsHtml = options.paragraphs
    .map(p => `<p style="color:#475569; font-size:15px; line-height:26px; margin:0 0 18px;">${p}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 20px 45px rgba(15,23,42,.08);">
          <tr>
            <td style="background:#0f172a; padding:35px; text-align:center;">
              <h1 style="margin:0; font-size:28px; color:white; font-weight:800;">
                ${APP_NAME}<span style="color:#38bdf8">.</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px; font-size:24px; color:#0f172a;">${options.subtitle}</h2>
              ${paragraphsHtml}
              ${codeSection}
              ${alertSection}
              <p style="margin-top:30px; font-size:13px; color:#94a3b8; line-height:20px;">
                If you did not request this action, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc; padding:25px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#94a3b8;">© ${currentYear} ${APP_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Clean plain text generators for non-HTML channels (SMS, Logs, In-App Push alerts).
 */
export const getPlainNotificationText = {
  emailVerification: (code: string) => 
    `Welcome to ${APP_NAME}! Your verification code is ${code}.`,
  
  phoneVerification: (code: string) => 
    `Your ${APP_NAME} identity confirmation verification token is: ${code}.`,
  
  passwordReset: (code: string) => 
    `We received a request to reset your ${APP_NAME} password. Your code is: ${code}`,
  
  passwordUpdated: () => 
    `Your ${APP_NAME} account security credentials have been changed successfully.`,
  
  phoneVerified: () => 
    `Your mobile data line has been completely configured into your profile parameters successfully.`,
  
  loginVerified: () => 
    `Session entry approved. Welcome back to your workspace.`
};

/**
 * Pre-compiled layout presets for your notification engine.
 */
export const getHtmlTemplates = {
  emailVerification: (code: string, expiryText: string) =>
    compileHtmlEmail({
      title: "Verify your email",
      subtitle: "Welcome to SmartShop!",
      paragraphs: ["Enter the verification code below to confirm your email address and activate your SmartShop account."],
      code,
      codeSubtitle: `This token remains valid for ${expiryText}.`,
      alertTitle: "⚠️ Security Notice",
      alertText: SECURITY_NOTICE_TEXT
    }),

  phoneVerification: (code: string, expiryText: string) =>
    compileHtmlEmail({
      title: "Your verification code",
      subtitle: "Identity Checkpoint Validation",
      paragraphs: [`Your ${APP_NAME} secondary context validation token has been successfully multiplexed. Provide this inside your configuration gateway interface.`],
      code,
      codeSubtitle: `Valid for ${expiryText}.`,
      alertTitle: "⚠️ Security Notice",
      alertText: SECURITY_NOTICE_TEXT
    }),

  passwordReset: (code: string, expiryText: string) =>
    compileHtmlEmail({
      title: "Password Reset request",
      subtitle: "Password Reset Authorization",
      paragraphs: [`We received a request to reset your ${APP_NAME} password. Use the code below to continue.`],
      code,
      codeSubtitle: `This tracking token expires in ${expiryText}.`,
      alertTitle: "⚠️ Security Notice",
      alertText: "If you did not execute this update framework action, disregard this message completely. Your profile security architecture remains locked."
    }),

  passwordUpdated: () =>
    compileHtmlEmail({
      title: "Password updated successfully",
      subtitle: "✔️ Password Restored Successfully",
      paragraphs: [
        `Your ${APP_NAME} account encryption credentials have been changed successfully.`,
        "Your changes have synced globally across our authorization modules. You can now use your credentials to log into the application core interface."
      ],
      alertTitle: "⚠️ Did you not make this modification?",
      alertText: "If you did not execute this update action, open an emergency verification ticket with our infrastructure support team immediately."
    }),

  changePassword: () =>
    compileHtmlEmail({
      title: "Password Updated",
      subtitle: "🔑 Credentials Update Complete",
      paragraphs: [
        "Your core authentication credentials have been securely overridden.",
        "Any lingering sessions or cached authentications on unfamiliar devices have updated validation queues automatically."
      ],
      alertTitle: "⚠️ Profile Audit Notice",
      alertText: "If you did not request this structural adjustment parameter, change your account profile layouts from your configuration gateway setup immediately."
    }),

  otpVerificationComplete: (purpose: string) => {
    const descriptions: Record<string, { title: string; subtitle: string; text: string }> = {
      PHONE_VERIFICATION: {
        title: "Phone Verified",
        subtitle: "📱 Device Handshake Confirmed",
        text: "Your mobile data endpoint line has been completely bound and configured into your validation properties profile layers safely."
      },
      PASSWORD_RESET: {
        title: "Verification Complete",
        subtitle: "🛡️ Challenge Validation Passed",
        text: "Your security gateway challenge matrix has passed inspection parameters safely. You can now clear and assign your fresh encryption layer keys."
      },
      LOGIN: {
        title: "Login Verified",
        subtitle: "🔓 Session Access Approved",
        text: "Multi-factor framework configuration has authorized entry node access. Transferring engine context straight to your defaults workspace management desk."
      },
      EMAIL_VERIFICATION: {
        title: "Email Verified",
        subtitle: "✉️ Communication Channel Validated",
        text: "Your electronic messaging channel endpoint has been successfully attached to our processing pipelines safely. Welcome aboard!"
      }
    };

    const match = descriptions[purpose] || descriptions.EMAIL_VERIFICATION;
    return compileHtmlEmail({
      title: match.title,
      subtitle: match.subtitle,
      paragraphs: [match.text, "Full runtime platform features have been unlocked and scaled on this device identity scope."],
      alertTitle: "Security Context",
      alertText: "If this state integration update was unexpected, audit active terminal links within your platform workspace settings parameters directly."
    });
  }
};