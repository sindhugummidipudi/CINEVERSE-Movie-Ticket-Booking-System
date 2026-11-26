import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Info,
  Landmark,
  Lock,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BookingRecord } from '../types';
import type { PendingCheckout } from './SeatSelectionView';

type PayMethod = 'phonepe' | 'gpay' | 'paytm' | 'upi' | 'card' | 'netbanking';

const UPI_METHODS: PayMethod[] = ['phonepe', 'gpay', 'paytm', 'upi'];

export function PaymentView({
  checkout,
  onBack,
  onOpenAuthModal,
  onSuccess,
  onError,
}: {
  checkout: PendingCheckout;
  onBack: () => void;
  onOpenAuthModal: () => void;
  onSuccess: (booking: BookingRecord) => void;
  onError: (msg: string) => void;
}) {
  const { isAuthenticated, profile, authFetch } = useAuth();
  const [method, setMethod] = useState<PayMethod>('phonepe');
  const [simulateOutcome, setSimulateOutcome] = useState<'success' | 'fail'>('success');

  // UPI / PhonePe / GPay / Paytm state
  const [upiId, setUpiId] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [upiQr, setUpiQr] = useState<{
    upiUri: string;
    qrDataUrl: string;
    merchantUpiId: string;
    merchantName: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Card / Bank state
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('09/29');
  const [cardCvc, setCardCvc] = useState('424');
  const [bankName, setBankName] = useState('HDFC Bank');

  // Ticket delivery info
  const [deliveryEmail, setDeliveryEmail] = useState(profile?.email || '');
  const [deliveryPhone, setDeliveryPhone] = useState(profile?.phone || '');

  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (!deliveryEmail) setDeliveryEmail(profile.email || '');
      if (!deliveryPhone) setDeliveryPhone(profile.phone || '');
    }
  }, [profile, deliveryEmail, deliveryPhone]);

  const isUpiMethod = UPI_METHODS.includes(method);
  const cleanUpiRef = upiReference.trim().replace(/[^a-zA-Z0-9-]/g, '');
  const upiReadyToIssue =
    !isUpiMethod ||
    simulateOutcome === 'fail' ||
    (cleanUpiRef.length >= 8 && paymentConfirmed);

  // Generate dynamic scannable UPI QR code right inside the website whenever user is signed in and selects PhonePe/GPay/Paytm/UPI
  useEffect(() => {
    if (!isAuthenticated || !isUpiMethod) return;
    let active = true;
    setQrLoading(true);
    authFetch('/api/payments/upi-qr', {
      method: 'POST',
      body: JSON.stringify({
        amount: checkout.totalAmount,
        reference: `SHOW-${checkout.payload.show.id}`,
        provider: method,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setUpiQr(data);
        }
      })
      .catch((err) => console.error('Failed to generate UPI QR:', err))
      .finally(() => {
        if (active) setQrLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, isUpiMethod, method, checkout.totalAmount, checkout.payload.show.id, authFetch]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }

    if (method === 'card' && cardNumber.replace(/\s+/g, '').length < 12) {
      setPaymentError('Please enter a valid demo card number.');
      return;
    }
    if (isUpiMethod && upiId.trim() && !upiId.includes('@')) {
      setPaymentError('Please enter a valid UPI ID (e.g., name@ybl or name@okaxis).');
      return;
    }
    if (isUpiMethod && simulateOutcome !== 'fail') {
      if (cleanUpiRef.length < 8) {
        setPaymentError('Please scan & pay first, then enter your 8+ character UPI UTR / Reference ID.');
        return;
      }
      if (!paymentConfirmed) {
        setPaymentError('Please confirm that you have transferred the ticket amount to the admin UPI ID.');
        return;
      }
    }

    setProcessing(true);
    try {
      const res = await authFetch('/api/bookings/checkout', {
        method: 'POST',
        body: JSON.stringify({
          showId: checkout.payload.show.id,
          seatIds: checkout.selectedSeats.map((s) => s.id),
          paymentMethod: method,
          simulateOutcome,
          deliveryEmail,
          deliveryPhone,
          upiReference: cleanUpiRef,
          paymentConfirmed,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errMsg = json.error || 'Payment failed. Please try again.';
        setPaymentError(errMsg);
        onError(errMsg);
        return;
      }

      onSuccess(json.booking);
    } catch (err) {
      console.error('Payment request failed:', err);
      setPaymentError('Network error while confirming reservation.');
      onError('Network error while confirming reservation.');
    } finally {
      setProcessing(false);
    }
  };

  const methodOptions: Array<{
    id: PayMethod;
    label: string;
    icon: typeof Smartphone;
  }> = [
    { id: 'phonepe', label: 'PhonePe', icon: Smartphone },
    { id: 'gpay', label: 'Google Pay', icon: Smartphone },
    { id: 'paytm', label: 'Paytm', icon: Smartphone },
    { id: 'upi', label: 'UPI QR', icon: QrCode },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'netbanking', label: 'Net Bank', icon: Landmark },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#C8C2B8] hover:text-[#D4AF37] mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Seat Map
        </button>
        <h1 className="font-display text-4xl font-semibold text-[#F5F2EB]">
          In-App Checkout & Ticket Delivery
        </h1>
      </div>

      {/* Explicit Demo / Merchant UPI Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#1A161D] border border-[#D4AF37]/35 text-sm text-[#E5DFD5]">
        <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-[#F5F2EB]">
            In-App UPI / PhonePe Checkout (Demo Settlement Mode)
          </p>
          <p className="mt-0.5 text-xs text-[#B5AEA4]">
            Scan the in-app UPI QR code or enter your UPI handle below. Automated
            bank webhook settlement is not connected in this preview, so bookings
            issue immediately in test mode or can simulate a declined attempt.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handlePay}
          className="lg:col-span-7 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-6"
        >
          <div>
            <p className="text-xs font-medium text-[#D4AF37] mb-3">
              Select Payment App or Method
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {methodOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      method === item.id
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-[#0C0B0E] border-white/10 text-[#C8C2B8] hover:border-white/25'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* In-App PhonePe / GPay / Paytm / UPI QR Flow */}
          {isUpiMethod && (
            <div className="p-4 rounded-xl bg-[#0C0B0E] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-36 h-36 rounded-xl bg-[#141216] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {!isAuthenticated ? (
                    <span className="text-[11px] text-[#9C958B] text-center px-3">
                      Login to load UPI QR
                    </span>
                  ) : qrLoading ? (
                    <div className="w-28 h-28 rounded bg-white/10 animate-pulse" />
                  ) : upiQr ? (
                    <img
                      src={upiQr.qrDataUrl}
                      alt="In-app UPI payment QR code"
                      className="w-32 h-32 rounded-lg"
                    />
                  ) : (
                    <QrCode className="w-10 h-10 text-[#D4AF37]" />
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-medium text-[#D4AF37]">
                    Step 1 · Scan & Pay to Admin UPI ({method === 'phonepe' ? 'PhonePe' : method === 'gpay' ? 'Google Pay' : method === 'paytm' ? 'Paytm' : 'UPI'})
                  </p>
                  <p className="font-mono tabular-nums text-lg font-semibold text-[#F5F2EB]">
                    ${checkout.totalAmount.toFixed(2)}
                  </p>
                  {upiQr && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#A9A299] break-all">
                        Pay To Admin UPI:{' '}
                        <span className="font-mono text-[#F5F2EB] font-semibold">
                          {upiQr.merchantUpiId}
                        </span>
                      </p>
                      {upiQr.upiUri.startsWith('upi://pay?') && (
                        <a
                          href={upiQr.upiUri}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-medium text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-colors"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Open UPI / PhonePe App
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-3">
                <p className="text-xs font-medium text-[#D4AF37]">
                  Step 2 · Enter Payment Reference to Issue Confirmation Ticket
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      UPI UTR / Transaction ID (Required)
                    </label>
                    <input
                      type="text"
                      value={upiReference}
                      onChange={(e) => setUpiReference(e.target.value)}
                      placeholder="e.g., 432198765432"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141216] border border-white/10 font-mono text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      Your UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="9876543210@ybl"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141216] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#D6D0C6] cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[#D4AF37]"
                  />
                  <span>
                    I have scanned the QR code and paid the exact amount to{' '}
                    <span className="font-mono text-[#D4AF37]">
                      {upiQr?.merchantUpiId || '6301719690@ybl'}
                    </span>
                    . Only issue my confirmation ticket after this payment.
                  </span>
                </label>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#B5AEA4] mb-1.5">
                  Card Number (Demo)
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 font-mono text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1.5">
                    Expiry
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 font-mono text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1.5">
                    Security Code
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 font-mono text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>
          )}

          {method === 'netbanking' && (
            <div>
              <label className="block text-xs text-[#B5AEA4] mb-1.5">
                Partner Bank
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              >
                <option>HDFC Bank</option>
                <option>ICICI Bank</option>
                <option>State Bank of India</option>
                <option>Axis Bank</option>
              </select>
            </div>
          )}

          {/* Ticket Delivery Details */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <p className="text-xs font-medium text-[#D4AF37]">
              Send Digital Ticket To
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#B5AEA4] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={deliveryEmail}
                  onChange={(e) => setDeliveryEmail(e.target.value)}
                  placeholder="patron@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B5AEA4] mb-1">
                  WhatsApp / Mobile Number
                </label>
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* Demo Test State Selector */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <span className="block text-xs text-[#A9A299]">
              Gateway Test Outcome
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulateOutcome('success')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  simulateOutcome === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-[#0C0B0E] border-white/10 text-[#A9A299]'
                }`}
              >
                Simulate Payment Success
              </button>
              <button
                type="button"
                onClick={() => setSimulateOutcome('fail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  simulateOutcome === 'fail'
                    ? 'bg-red-950/60 border-red-500/50 text-red-200'
                    : 'bg-[#0C0B0E] border-white/10 text-[#A9A299]'
                }`}
              >
                Simulate Declined Payment
              </button>
            </div>
          </div>

          {paymentError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{paymentError}</span>
            </div>
          )}

          {!isAuthenticated ? (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="w-full py-3.5 px-5 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150] transition-colors cursor-pointer"
            >
              Login / Create Account to Pay & Get Ticket
            </button>
          ) : (
            <button
              type="submit"
              disabled={processing || !upiReadyToIssue}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {processing
                ? 'Confirming Payment & Generating Ticket...'
                : !upiReadyToIssue
                  ? 'Scan QR, Enter UTR & Confirm Payment First'
                  : `Confirm Payment & Issue Ticket ($${checkout.totalAmount.toFixed(2)})`}
            </button>
          )}
        </form>

        {/* Order Summary */}
        <aside className="lg:col-span-5 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="border-b border-white/10 pb-4">
            <p className="text-xs text-[#D4AF37] font-medium">Order Review</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#F5F2EB]">
              {checkout.payload.movie.title}
            </h2>
            <p className="mt-1 text-xs text-[#A9A299]">
              {checkout.payload.theatre.name} · {checkout.payload.screen.name}
            </p>
            <p className="mt-1 font-mono tabular-nums text-xs text-[#D6D0C6]">
              {checkout.payload.show.showDate} at {checkout.payload.show.showTime}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#B5AEA4]">
              <span>Seats ({checkout.selectedSeats.length})</span>
              <span className="font-mono text-[#F5F2EB]">
                {checkout.selectedSeats.map((s) => s.seatCode).join(', ')}
              </span>
            </div>
            <div className="flex justify-between text-[#B5AEA4]">
              <span>Ticket Subtotal</span>
              <span className="font-mono tabular-nums">
                ${checkout.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[#B5AEA4]">
              <span>Convenience Fee</span>
              <span className="font-mono tabular-nums">
                ${checkout.convenienceFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[#B5AEA4]">
              <span>Applicable Taxes</span>
              <span className="font-mono tabular-nums">
                ${checkout.taxes.toFixed(2)}
              </span>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-between text-base font-semibold text-[#F5F2EB]">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums text-[#D4AF37]">
                ${checkout.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
