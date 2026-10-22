// Generates Replex's Supabase Auth email templates into supabase/templates/.
// Paste each file into Supabase → Authentication → Emails → Templates.
//
// Email-client constraints: table layout, inline styles, no web fonts or
// external CSS, a light background (most clients force their own dark mode),
// a bulletproof button, and a plain-text fallback link.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'templates');
mkdirSync(out, { recursive: true });

const C = {
  bg: '#f4f4f7',
  card: '#ffffff',
  border: '#e6e6ec',
  ink: '#16161d',
  muted: '#5b5b6b',
  subtle: '#8a8a99',
  accent: '#5b4ff0',
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

function layout({ preheader, title, intro, cta, url, after, code }) {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td style="padding:0 4px 20px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;border-radius:8px;background:${C.accent};background-image:linear-gradient(135deg,#8b7cff,#4f46e5);color:#ffffff;font:700 17px/32px ${FONT};">R</td>
                <td style="padding-left:10px;font:600 17px/32px ${FONT};color:${C.ink};letter-spacing:-0.2px;">Replex</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:36px 32px;">
            <h1 style="margin:0 0 12px 0;font:600 22px/30px ${FONT};color:${C.ink};letter-spacing:-0.3px;">${title}</h1>
            <p style="margin:0 0 28px 0;font:400 15px/24px ${FONT};color:${C.muted};">${intro}</p>
            ${
              code
                ? `<p style="margin:0 0 8px 0;font:500 13px/20px ${FONT};color:${C.subtle};">Your code</p>
            <p style="margin:0 0 28px 0;font:600 28px/36px ${MONO};color:${C.ink};letter-spacing:6px;">${code}</p>`
                : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
              <tr>
                <td align="center" bgcolor="${C.ink}" style="border-radius:8px;">
                  <a href="${url}" target="_blank" style="display:inline-block;padding:12px 22px;font:600 15px/20px ${FONT};color:#ffffff;text-decoration:none;border-radius:8px;">${cta}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px 0;font:400 13px/20px ${FONT};color:${C.subtle};">Or paste this link into your browser:</p>
            <p style="margin:0 0 4px 0;font:400 12px/18px ${MONO};color:${C.accent};word-break:break-all;"><a href="${url}" style="color:${C.accent};text-decoration:underline;">${url}</a></p>`
            }
            ${after ? `<p style="margin:24px 0 0 0;padding-top:20px;border-top:1px solid ${C.border};font:400 13px/20px ${FONT};color:${C.subtle};">${after}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 4px 0 4px;font:400 12px/18px ${FONT};color:${C.subtle};">
            Replex — find any repository and hand it to your agents.<br>
            You received this because an action was requested for {{ .Email }}.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

const LINK_EXPIRY = 'This link expires in 1 hour and can only be used once.';
const NOT_YOU = 'Didn’t request this? You can safely ignore this email — nothing will change.';

const templates = {
  'confirm-signup.html': layout({
    preheader: 'Confirm your email to finish setting up Replex.',
    title: 'Confirm your email',
    intro: 'Welcome to Replex. Confirm this address and you can start searching GitHub, saving collections and connecting your agents.',
    cta: 'Confirm email',
    url: '{{ .ConfirmationURL }}',
    after: `${LINK_EXPIRY} ${NOT_YOU}`,
  }),
  'magic-link.html': layout({
    preheader: 'Your Replex sign-in link.',
    title: 'Sign in to Replex',
    intro: 'Use the button below to sign in. No password needed.',
    cta: 'Sign in',
    url: '{{ .ConfirmationURL }}',
    after: `${LINK_EXPIRY} ${NOT_YOU}`,
  }),
  'invite.html': layout({
    preheader: 'You’ve been invited to Replex.',
    title: 'You’re invited to Replex',
    intro: 'Replex searches all of GitHub live, shows what’s rising, and gives your coding agents a private line into your library. Accept the invite to create your account.',
    cta: 'Accept invite',
    url: '{{ .ConfirmationURL }}',
    after: 'This invite expires in 24 hours.',
  }),
  'change-email.html': layout({
    preheader: 'Confirm your new Replex email address.',
    title: 'Confirm your new email',
    intro: 'Confirm that you want to change your Replex email from {{ .Email }} to <strong style="color:#16161d;">{{ .NewEmail }}</strong>.',
    cta: 'Confirm new email',
    url: '{{ .ConfirmationURL }}',
    after: `${LINK_EXPIRY} If you didn’t ask for this change, ignore this email and your address stays the same.`,
  }),
  'reset-password.html': layout({
    preheader: 'Reset your Replex password.',
    title: 'Reset your password',
    intro: 'Someone asked to reset the password for {{ .Email }}. Choose a new one with the button below.',
    cta: 'Choose a new password',
    url: '{{ .ConfirmationURL }}',
    after: `${LINK_EXPIRY} ${NOT_YOU}`,
  }),
  'reauthentication.html': layout({
    preheader: 'Your Replex verification code.',
    title: 'Confirm it’s you',
    intro: 'Enter this code in Replex to confirm a sensitive change to your account.',
    code: '{{ .Token }}',
    after: `The code expires shortly. ${NOT_YOU}`,
  }),
};

const SUBJECTS = {
  'confirm-signup.html': 'Confirm your email for Replex',
  'magic-link.html': 'Your Replex sign-in link',
  'invite.html': 'You’re invited to Replex',
  'change-email.html': 'Confirm your new email for Replex',
  'reset-password.html': 'Reset your Replex password',
  'reauthentication.html': 'Your Replex verification code',
};

for (const [file, html] of Object.entries(templates)) writeFileSync(join(out, file), html);
writeFileSync(join(out, 'subjects.json'), JSON.stringify(SUBJECTS, null, 2) + '\n');
console.log(`Wrote ${Object.keys(templates).length} templates to ${out}`);
