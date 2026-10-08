import "server-only";
import nodemailer from "nodemailer";

/**
 * Owner email notifications via SMTP (e.g. Gmail with an App Password) when SMTP_USER + SMTP_PASS are set.
 * Never throws — returns a result that is written to the delivery log.
 */

export type DeliveryResult = { success: boolean; detail: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailProvider(): { name: "smtp" | null; from: string } {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return { name: "smtp", from: process.env.EMAIL_FROM || `Lama Hotel & Lodge <${process.env.SMTP_USER}>` };
  }
  return { name: null, from: "" };
}

export function renderEmail(title: string, rows: [string, string][], footer: string, intro?: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#1b2433">
      <h2 style="margin:0 0 12px;color:#1e3460">${escapeHtml(title)}</h2>
      ${intro ? `<p style="margin:0 0 12px;white-space:pre-wrap">${escapeHtml(intro)}</p>` : ""}
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="vertical-align:top;color:#4f5b6b;white-space:nowrap"><strong>${escapeHtml(k)}</strong></td><td style="white-space:pre-wrap">${escapeHtml(v || "—")}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="color:#4f5b6b;margin-top:16px">${escapeHtml(footer)}</p>
    </div>`;
  const text = `${title}\n\n${intro ? `${intro}\n\n` : ""}${rows.map(([k, v]) => `${k}: ${v || "—"}`).join("\n")}\n\n${footer}`;
  return { html, text };
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<DeliveryResult> {
  const provider = emailProvider();
  if (!provider.name) return { success: false, detail: "Email sending is not configured (set SMTP_USER and SMTP_PASS in .env)." };
  if (!opts.to) return { success: false, detail: "No notification email address set." };

  try {
    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const info = await transport.sendMail({
      from: provider.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    return { success: info.accepted.length > 0, detail: info.accepted.length ? `Sent via SMTP (${info.messageId ?? "ok"})` : `Rejected: ${info.rejected.join(", ")}` };
  } catch (err) {
    return { success: false, detail: `Email failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown error"}` };
  }
}
