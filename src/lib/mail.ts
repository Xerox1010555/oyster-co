/* Transactional email. With RESEND_API_KEY → Resend REST API.
   Without it → structured console delivery log (dev/demo transport). */

export type MailInput = { to: string; subject: string; html: string };

const FROM = 'OYSTER & CO. <concierge@oysterand.co>';

export async function sendMail({ to, subject, html }: MailInput): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[mail:console] to=${to} · subject=${subject} · ${html.length} chars (set RESEND_API_KEY to deliver)`);
    return { sent: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) console.error('[mail:resend]', await res.text());
    return { sent: res.ok };
  } catch (error) {
    console.error('[mail:error]', error);
    return { sent: false };
  }
}

/* ── Templates ───────────────────────────────────────────────────── */
function shell(title: string, body: string) {
  return `
  <div style="font-family:Georgia,serif;background:#0a0a0a;color:#f5f1e8;padding:32px">
    <div style="letter-spacing:.4em;color:#c9a961;font-size:12px;margin-bottom:24px">OYSTER &amp; CO. — GENEVA</div>
    <h1 style="font-weight:300;font-size:26px;margin:0 0 16px">${title}</h1>
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#cfcabd">${body}</div>
    <div style="margin-top:32px;border-top:1px solid rgba(201,169,97,.3);padding-top:14px;font-size:10px;font-family:Helvetica,Arial,sans-serif;color:#8d8878">
      Oyster &amp; Co. is a fictional, independent maison concept. Not affiliated with any Swiss luxury watch brand.
    </div>
  </div>`;
}

export function orderConfirmationMail(name: string, number: string, totalUsd: string, lines: string[]) {
  return {
    subject: `Order ${number} confirmed — OYSTER & CO.`,
    html: shell(
      'Your order is confirmed',
      `<p>Dear ${escapeHtml(name)},</p>
       <p>Order <strong style="color:#c9a961">${number}</strong> — total ${totalUsd}:</p>
       <ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
       <p>A concierge will contact you within 24 hours to arrange insured delivery.</p>`,
    ),
  };
}

export function appointmentMail(name: string, city: string, when: string, service: string) {
  return {
    subject: `Appointment requested — OYSTER & CO. ${city}`,
    html: shell(
      'Your private visit is requested',
      `<p>Dear ${escapeHtml(name)},</p>
       <p><strong>${escapeHtml(service)}</strong> — ${escapeHtml(city)}, ${escapeHtml(when)}.</p>
       <p>A boutique concierge will confirm within 24 hours.</p>`,
    ),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
}
