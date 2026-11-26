export type ChannelDeliveryStatus =
  | 'sent'
  | 'not_configured'
  | 'failed'
  | 'skipped';

export interface TicketDeliverySummary {
  email: ChannelDeliveryStatus;
  whatsapp: ChannelDeliveryStatus;
}

interface TicketDeliveryPayload {
  bookingCode: string;
  movieTitle: string;
  theatreName: string;
  theatreCity: string;
  screenName: string;
  showDate: string;
  showTime: string;
  seats: string[];
  totalAmount: number;
  paymentMethod: string;
  transactionRef: string;
  deliveryEmail: string;
  deliveryPhone: string;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeWhatsAppPhone(phone: string): string {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

function buildTicketMessageText(p: TicketDeliveryPayload): string {
  return [
    `CINEVERSE E-TICKET CONFIRMED`,
    `Booking ID: ${p.bookingCode}`,
    `Movie: ${p.movieTitle}`,
    `Theatre: ${p.theatreName} (${p.theatreCity}) · ${p.screenName}`,
    `Showtime: ${p.showDate} at ${p.showTime}`,
    `Seats: ${p.seats.join(', ')}`,
    `Total Paid: $${p.totalAmount.toFixed(2)} (${p.paymentMethod.toUpperCase()})`,
    `Txn Ref: ${p.transactionRef}`,
    `Show your Booking ID or QR pass at the auditorium entry gate.`,
  ].join('\n');
}

async function sendEmailViaResend(
  p: TicketDeliveryPayload
): Promise<ChannelDeliveryStatus> {
  if (!p.deliveryEmail) return 'skipped';
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return 'not_configured';

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'CINEVERSE Tickets <onboarding@resend.dev>';

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0a090c;color:#f5f2eb;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#141216;border:1px solid #d4af37;border-radius:14px;padding:24px;">
        <div style="font-size:12px;letter-spacing:2px;color:#d4af37;font-weight:bold;">CINEVERSE ADMIT ONE</div>
        <h2 style="margin:8px 0 4px;color:#f5f2eb;">${escapeHtml(p.movieTitle)}</h2>
        <p style="margin:0 0 16px;color:#b5aea4;font-size:14px;">${escapeHtml(p.theatreName)} (${escapeHtml(p.theatreCity)}) · ${escapeHtml(p.screenName)}</p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #2b2730;border-bottom:1px solid #2b2730;margin:16px 0;">
          <tr>
            <td style="padding:10px 0;color:#9c958b;font-size:12px;">Booking ID</td>
            <td style="padding:10px 0;color:#d4af37;font-weight:bold;text-align:right;">${escapeHtml(p.bookingCode)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9c958b;font-size:12px;">Date & Time</td>
            <td style="padding:10px 0;color:#f5f2eb;text-align:right;">${escapeHtml(p.showDate)} at ${escapeHtml(p.showTime)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9c958b;font-size:12px;">Seats</td>
            <td style="padding:10px 0;color:#f5f2eb;font-weight:bold;text-align:right;">${escapeHtml(p.seats.join(', '))}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9c958b;font-size:12px;">Total Paid</td>
            <td style="padding:10px 0;color:#f5f2eb;text-align:right;">$${p.totalAmount.toFixed(2)} (${escapeHtml(p.paymentMethod.toUpperCase())})</td>
          </tr>
        </table>
        <p style="font-size:12px;color:#9c958b;margin:0;">Transaction Ref: ${escapeHtml(p.transactionRef)}. Present this booking code or your QR pass in My Bookings at the auditorium entrance.</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [p.deliveryEmail],
        subject: `Your CINEVERSE Ticket: ${p.movieTitle} (${p.bookingCode})`,
        html,
        text: buildTicketMessageText(p),
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('Resend email delivery failed:', res.status, errBody);
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.error('Resend email delivery error:', err);
    return 'failed';
  }
}

async function sendWhatsAppViaCloudApi(
  p: TicketDeliveryPayload
): Promise<ChannelDeliveryStatus> {
  const digits = normalizeWhatsAppPhone(p.deliveryPhone);
  if (!digits) return 'skipped';

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return 'not_configured';

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: digits,
          type: 'text',
          text: { body: buildTicketMessageText(p) },
        }),
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('WhatsApp Cloud API delivery failed:', res.status, errBody);
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.error('WhatsApp Cloud API delivery error:', err);
    return 'failed';
  }
}

export async function dispatchAutomaticTicketNotifications(
  payload: TicketDeliveryPayload
): Promise<TicketDeliverySummary> {
  const [email, whatsapp] = await Promise.all([
    sendEmailViaResend(payload),
    sendWhatsAppViaCloudApi(payload),
  ]);
  return { email, whatsapp };
}
