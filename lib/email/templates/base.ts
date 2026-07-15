export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] || character);
}

export function officialAppUrl() {
  const configured = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "");
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
    return url.origin;
  } catch {
    return "https://alfatecinvestpro.vercel.app";
  }
}

export function emailLayout(input: {
  preheader: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  details?: Array<{ label: string; value: string }>;
  publicNote?: string;
  actionLabel?: string;
  actionUrl?: string;
  securityNotice?: string;
}) {
  const appUrl = officialAppUrl();
  const logoUrl = appUrl + "/logo-alfatec-email.png";
  const details = (input.details || []).map((item) =>
    '<tr><td style="padding:8px 12px;color:#64748b;font-size:13px">' + escapeHtml(item.label) +
    '</td><td style="padding:8px 12px;color:#0f172a;font-size:13px;font-weight:700;text-align:right">' +
    escapeHtml(item.value) + "</td></tr>"
  ).join("");
  const paragraphs = input.paragraphs.map((paragraph) =>
    '<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.65">' + escapeHtml(paragraph) + "</p>"
  ).join("");
  const note = input.publicNote
    ? '<div style="margin:20px 0;padding:16px;border-radius:10px;background:#ecfeff;border:1px solid #a5f3fc"><strong style="display:block;margin-bottom:6px;color:#0e7490">Observação do administrador</strong><span style="color:#334155;font-size:14px;line-height:1.6">' + escapeHtml(input.publicNote) + "</span></div>"
    : "";
  const action = input.actionLabel && input.actionUrl
    ? '<p style="margin:24px 0;text-align:center"><a href="' + escapeHtml(input.actionUrl) + '" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#0891b2;color:#ffffff;text-decoration:none;font-weight:800">' + escapeHtml(input.actionLabel) + "</a></p>"
    : "";
  return [
    "<!doctype html><html><body style=\"margin:0;background:#f1f5f9;font-family:Arial,sans-serif\">",
    '<div style="display:none;max-height:0;overflow:hidden">' + escapeHtml(input.preheader) + "</div>",
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">',
    '<tr><td style="padding:24px;background:#020817;text-align:center"><img src="' + escapeHtml(logoUrl) + '" alt="AlfaTec Invest Pro" width="150" style="display:block;margin:0 auto;max-width:150px;height:auto;border:0"></td></tr>',
    '<tr><td style="padding:30px"><h1 style="margin:0 0 20px;color:#0f172a;font-size:24px;line-height:1.25">' + escapeHtml(input.title) + "</h1>",
    '<p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700">' + escapeHtml(input.greeting) + "</p>",
    paragraphs,
    details ? '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f8fafc;border-radius:10px">' + details + "</table>" : "",
    note,
    action,
    '<div style="margin-top:24px;padding:14px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:12px;line-height:1.55">' + escapeHtml(input.securityNotice || "A AlfaTec Invest Pro nunca solicita senha, código de segurança ou dados bancários por e-mail.") + "</div>",
    "</td></tr>",
    '<tr><td style="padding:18px 24px;background:#f8fafc;color:#64748b;font-size:11px;line-height:1.55;text-align:center">Mensagem automática da AlfaTec Invest Pro. Não responda com senhas, dados bancários ou informações de cartão.</td></tr>',
    "</table></td></tr></table></body></html>"
  ].join("");
}