export type AccountEmailContent =
  | { kind: 'sign-in'; url: string; code: string }
  | { kind: 'change-email'; url: string; newEmail: string }
  | { kind: 'verify-email'; url: string }
  | { kind: 'delete-account'; url: string }

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function emailCopy(content: AccountEmailContent) {
  switch (content.kind) {
    case 'sign-in':
      return {
        subject: 'Your Roastbook sign-in code',
        preview:
          'Your secure link and code are ready. They expire in 10 minutes.',
        title: 'Your journal is ready.',
        paragraphs: [
          'A good cup is worth remembering. Sign in to pick up where you left off.',
          'Use the code below, or open the secure link to continue on this device.',
        ],
        action: 'Sign in to Roastbook',
        note: 'Your code and link expire in 10 minutes and can only be used once.',
        safety:
          'Only continue if you requested this email. Never share your sign-in code or link. If this wasn’t you, you can safely ignore this email.',
      }
    case 'change-email':
      return {
        subject: 'Approve your Roastbook email change',
        preview: 'Confirm the new email address for your coffee journal.',
        title: 'A new address. Same journal.',
        paragraphs: [
          `You requested to change your Roastbook email address to ${content.newEmail}.`,
          'Approve this change from your current address. We’ll then ask you to verify the new address.',
        ],
        action: 'Approve email change',
        note: 'Your account keeps its current email until verification is complete.',
        safety:
          'If you didn’t request this change, don’t approve it. Your email address will stay the same.',
      }
    case 'verify-email':
      return {
        subject: 'Verify your Roastbook email',
        preview: 'One last step to verify your coffee journal’s email address.',
        title: 'Make yourself at home.',
        paragraphs: [
          'Confirm this email address to keep your Roastbook account secure.',
          'Open the secure link below to finish verification.',
        ],
        action: 'Verify email address',
        note: 'Use the most recent verification email if you requested more than one.',
        safety: 'If you didn’t request this email, you can safely ignore it.',
      }
    case 'delete-account':
      return {
        subject: 'Confirm deleting your Roastbook account',
        preview:
          'Review the request to permanently delete your coffee journal.',
        title: 'Before you close the book.',
        paragraphs: [
          'You requested to permanently delete your Roastbook account, coffee journal, and stored images.',
          'Open the link to review and confirm deletion while signed in. Opening this email or link does not delete anything.',
        ],
        action: 'Review account deletion',
        note: 'This link expires in 10 minutes. Confirmed deletion cannot be undone.',
        safety:
          'If you didn’t request this, ignore this email. Your account will remain active.',
      }
  }
}

// Async so a build extension can replace it with a renderer that awaits.
export async function renderAccountEmail(content: AccountEmailContent) {
  const link = new URL(content.url)
  if (
    !['https:', 'http:'].includes(link.protocol) ||
    link.username ||
    link.password
  )
    throw new Error('Invalid account email link')
  const copy = emailCopy(content)
  const url = escapeHtml(link.href)
  const paragraphs = copy.paragraphs
    .map(
      (paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph)}</p>`,
    )
    .join('')
  const code =
    content.kind === 'sign-in'
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fbf5eb;border:1px solid #ead9bf;border-radius:12px;"><tr><td align="center" style="padding:20px 8px;"><p style="margin:0 0 10px;font-size:14px;color:#7a6a58;">Your sign-in code</p><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:700;line-height:1.4;letter-spacing:5px;color:#3a2a1e;">${escapeHtml(content.code)}</p></td></tr></table>`
      : ''
  const buttonColor = content.kind === 'delete-account' ? '#9d3b26' : '#8a5a30'
  const text = [
    'Roastbook · Your coffee journal',
    copy.title,
    ...copy.paragraphs,
    ...(content.kind === 'sign-in'
      ? [`Your sign-in code is ${content.code}.`]
      : []),
    `${copy.action}:\n${link.href}`,
    copy.note,
    copy.safety,
    `Sent for your Roastbook instance at ${link.host}.`,
  ].join('\n\n')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(copy.subject)}</title>
<style>
@media (prefers-color-scheme:dark){.email-canvas{background:#241b17!important}.email-card{background:#332720!important;color:#ecdbc5!important;border-color:#6a5040!important}.email-heading,.email-brand{color:#ecdbc5!important}.email-muted{color:#c6af96!important}.email-rule{border-color:#6a5040!important}}
@media only screen and (max-width:480px){.email-gutter{padding:24px 12px!important}.email-content{padding:28px 24px!important}.email-heading{font-size:28px!important}}
</style>
</head>
<body class="email-canvas" style="margin:0;padding:0;background:#f6eddf;color:#3a2a1e;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;" aria-hidden="true">${escapeHtml(copy.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="email-gutter" align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;"><p class="email-brand" style="margin:0;font-size:28px;font-weight:800;letter-spacing:-1px;color:#3a2a1e;">Roastbook<span style="color:#aa612f;">.</span></p><p class="email-muted" style="margin:6px 0 0;font-size:14px;color:#7a6a58;">Your coffee journal</p></td></tr>
<tr><td class="email-card email-content" style="padding:36px;background:#ffffff;border:1px solid #ead9bf;border-top:4px solid ${buttonColor};border-radius:16px;color:#3a2a1e;font-size:16px;line-height:1.65;">
<h1 class="email-heading" style="margin:0 0 24px;font-size:32px;line-height:1.15;letter-spacing:-1px;font-weight:800;color:#3a2a1e;">${escapeHtml(copy.title)}</h1>
${paragraphs}${code}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;"><tr><td align="center" bgcolor="${buttonColor}" style="border-radius:10px;mso-padding-alt:16px 24px;"><a href="${url}" style="display:block;padding:16px 24px;color:#ffffff;font-size:16px;line-height:1.4;font-weight:700;text-align:center;text-decoration:none;border-radius:10px;">${escapeHtml(copy.action)}</a></td></tr></table>
<p class="email-muted" style="margin:0;font-size:14px;color:#7a6a58;">${escapeHtml(copy.note)}</p>
<div class="email-rule" style="margin:28px 0 20px;border-top:1px solid #ead9bf;"></div>
<p class="email-muted" style="margin:0;font-size:14px;color:#7a6a58;">${escapeHtml(copy.safety)}</p>
</td></tr>
<tr><td style="padding:24px 8px 0;"><p class="email-muted" style="margin:0;font-size:12px;line-height:1.7;color:#7a6a58;">Sent for your Roastbook instance at <span style="font-weight:600;">${escapeHtml(link.host)}</span>.<br>No reply is needed. This is an automated account email.</p></td></tr>
</table></td></tr></table>
</body></html>`
  return { subject: copy.subject, text, html }
}

export type AccountEmail = Awaited<ReturnType<typeof renderAccountEmail>>
