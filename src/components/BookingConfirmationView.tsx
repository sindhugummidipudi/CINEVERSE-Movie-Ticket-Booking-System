import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Ticket,
} from 'lucide-react';
import type { BookingRecord } from '../types';

export function formatTicketPassText(booking: BookingRecord): string {
  return [
    `CINEVERSE E-TICKET`,
    `Booking ID: ${booking.bookingCode}`,
    `Movie: ${booking.movieTitle}`,
    `Theatre: ${booking.theatreName} (${booking.theatreCity}) · ${booking.screenName}`,
    `Showtime: ${booking.showDate} at ${booking.showTime}`,
    `Seats: ${booking.seats.map((s) => s.seatCode).join(', ')}`,
    `Total Paid: $${booking.totalAmount.toFixed(2)} (${(booking.paymentMethod || 'upi').toUpperCase()})`,
    booking.transactionRef ? `Txn Ref: ${booking.transactionRef}` : '',
    `Present this booking code at the cinema auditorium entrance.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppTicketUrl(
  booking: BookingRecord,
  phoneOverride?: string
): string {
  const raw = (phoneOverride ?? booking.deliveryPhone ?? '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  const text = encodeURIComponent(formatTicketPassText(booking));
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildEmailTicketUrl(
  booking: BookingRecord,
  emailOverride?: string
): string {
  const email = (emailOverride ?? booking.deliveryEmail ?? '').trim();
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    `Your CINEVERSE Ticket: ${booking.movieTitle} (${booking.bookingCode})`
  )}&body=${encodeURIComponent(formatTicketPassText(booking))}`;
}

export function downloadTicketHtml(booking: BookingRecord) {
  const safe = (v: string) =>
    String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Cineverse Ticket ${safe(booking.bookingCode)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a090c; color: #f5f2eb; padding: 32px; }
  .ticket { max-width: 560px; margin: 0 auto; background: #141216; border: 1px solid #d4af37; border-radius: 16px; padding: 28px; }
  .brand { font-size: 13px; letter-spacing: 0.2em; color: #d4af37; font-weight: 700; }
  h1 { margin: 8px 0 4px; font-size: 28px; }
  .meta { color: #b5aea4; font-size: 14px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; border-top: 1px solid rgba(255,255,255,0.12); border-bottom: 1px solid rgba(255,255,255,0.12); padding: 16px 0; margin: 16px 0; }
  .label { font-size: 11px; text-transform: uppercase; color: #9c958b; }
  .val { font-size: 15px; font-weight: 600; margin-top: 2px; }
  .qr { text-align: center; margin-top: 18px; }
  .qr img { width: 180px; height: 180px; border-radius: 8px; }
</style>
</head>
<body>
  <div class="ticket">
    <div class="brand">CINEVERSE ADMIT ONE</div>
    <h1>${safe(booking.movieTitle)}</h1>
    <div class="meta">${safe(booking.theatreName)} · ${safe(booking.screenName)}</div>
    <div class="grid">
      <div><div class="label">Booking ID</div><div class="val">${safe(booking.bookingCode)}</div></div>
      <div><div class="label">Total Paid</div><div class="val">$${Number(booking.totalAmount).toFixed(2)}</div></div>
      <div><div class="label">Date & Time</div><div class="val">${safe(booking.showDate)} · ${safe(booking.showTime)}</div></div>
      <div><div class="label">Seats</div><div class="val">${safe(booking.seats.map((s) => s.seatCode).join(', '))}</div></div>
    </div>
    <div class="qr">
      <img src="${booking.qrDataUrl}" alt="Ticket QR Code" />
      <p style="font-size:12px;color:#9c958b;margin-top:8px;">Present this QR code at the cinema auditorium entrance.</p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cineverse-ticket-${booking.bookingCode}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BookingConfirmationView({
  booking,
  onViewMyBookings,
  onBackHome,
}: {
  booking: BookingRecord;
  onViewMyBookings: () => void;
  onBackHome: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(booking.deliveryPhone || '');
  const [recipientEmail, setRecipientEmail] = useState(booking.deliveryEmail || '');

  const ticketText = formatTicketPassText(booking);

  const handleCopyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const whatsappHref = buildWhatsAppTicketUrl(booking, whatsappNumber);
  const mailtoHref = buildEmailTicketUrl(booking, recipientEmail);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20">
      <div className="bg-[#141216] border border-[#D4AF37]/40 rounded-2xl p-6 sm:p-10 space-y-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#D4AF37]">
                Reservation Confirmed & Ticket Issued
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#F5F2EB]">
                Your Digital Ticket
              </h1>
              {(recipientEmail || whatsappNumber) && (
                <p className="mt-1 text-xs text-[#B5AEA4]">
                  Prepared for {recipientEmail || 'guest'}
                  {whatsappNumber ? ` · ${whatsappNumber}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-[#9C958B]">Booking ID</p>
            <p className="font-mono tabular-nums text-base font-semibold text-[#D4AF37]">
              {booking.bookingCode}
            </p>
            {booking.transactionRef && (
              <p className="text-[11px] font-mono text-[#9C958B] mt-0.5">
                {booking.transactionRef}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 space-y-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                {booking.movieTitle}
              </h2>
              <p className="mt-1 text-sm text-[#B5AEA4]">
                {booking.theatreName} ({booking.theatreCity}) · {booking.screenName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div>
                <p className="text-xs text-[#9C958B]">Show Date</p>
                <p className="mt-0.5 font-mono tabular-nums text-[#F5F2EB]">
                  {booking.showDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9C958B]">Showtime</p>
                <p className="mt-0.5 font-mono tabular-nums text-[#F5F2EB]">
                  {booking.showTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9C958B]">Reserved Seats</p>
                <p className="mt-0.5 font-mono text-[#D4AF37] font-semibold">
                  {booking.seats.map((s) => s.seatCode).join(', ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9C958B]">Total Paid</p>
                <p className="mt-0.5 font-mono tabular-nums text-[#F5F2EB] font-semibold">
                  ${booking.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-xl bg-[#0C0B0E] border border-white/10">
            {booking.qrDataUrl && (
              <img
                src={booking.qrDataUrl}
                alt={`QR Ticket for ${booking.bookingCode}`}
                className="w-44 h-44 rounded-lg"
              />
            )}
            <p className="mt-3 text-[11px] text-[#9C958B] text-center">
              Scan at auditorium entry gate
            </p>
          </div>
        </div>

        {/* Send Ticket to WhatsApp or Email */}
        <div className="p-5 rounded-xl bg-[#0C0B0E] border border-white/10 space-y-4">
          <div>
            <p className="text-xs font-medium text-[#D4AF37]">
              Send Ticket to WhatsApp or Email
            </p>
            {booking.deliveryStatus && (
              <div className="mt-1.5 space-y-1 text-[11px]">
                {booking.deliveryStatus.email === 'sent' && (
                  <p className="text-emerald-400">
                    Ticket automatically emailed to {booking.deliveryEmail}.
                  </p>
                )}
                {booking.deliveryStatus.whatsapp === 'sent' && (
                  <p className="text-emerald-400">
                    Ticket automatically sent on WhatsApp to {booking.deliveryPhone}.
                  </p>
                )}
                {(booking.deliveryStatus.email === 'not_configured' ||
                  booking.deliveryStatus.whatsapp === 'not_configured' ||
                  booking.deliveryStatus.email === 'failed' ||
                  booking.deliveryStatus.whatsapp === 'failed') && (
                  <p className="text-[#B5AEA4]">
                    Automated background email/WhatsApp dispatch requires server
                    API keys (Resend / WhatsApp Cloud API). Tap WhatsApp or Send
                    Email below to deliver your ticket immediately.
                  </p>
                )}
              </div>
            )}
            {!booking.deliveryStatus && (
              <p className="mt-0.5 text-[11px] text-[#9C958B]">
                Enter a WhatsApp mobile number or email address to open your app
                pre-filled with your complete ticket pass.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                aria-label="WhatsApp number for ticket delivery"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#141216] border border-white/10 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="name@example.com"
                aria-label="Email address for ticket delivery"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#141216] border border-white/10 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-colors whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                Send Email
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => downloadTicketHtml(booking)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#0A090C] text-xs font-semibold hover:bg-[#E5C150] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Ticket
            </button>
            <button
              type="button"
              onClick={handleCopyTicket}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F1A22] border border-white/15 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37]/60 cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-[#D4AF37]" />
              )}
              {copied ? 'Ticket Copied' : 'Copy Ticket Pass'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onViewMyBookings}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F1A22] border border-white/15 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37]/60"
            >
              <Ticket className="w-4 h-4 text-[#D4AF37]" />
              My Bookings
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="px-3 py-2.5 rounded-xl text-xs text-[#B5AEA4] hover:text-white"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
