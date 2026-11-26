import { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  ArrowLeft,
  Ban,
  Check,
  Ticket,
} from 'lucide-react';
import type { SeatItem, ShowSeatPayload } from '../types';

export interface PendingCheckout {
  payload: ShowSeatPayload;
  selectedSeats: SeatItem[];
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  totalAmount: number;
}

export function SeatSelectionView({
  showId,
  onBack,
  onProceedToPayment,
  onError,
}: {
  showId: number;
  onBack: () => void;
  onProceedToPayment: (checkout: PendingCheckout) => void;
  onError: (msg: string) => void;
}) {
  const [data, setData] = useState<ShowSeatPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelectedIds([]);
    fetch(`/api/shows/${showId}/seats`)
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load seat layout');
        return res.json();
      })
      .then((payload: ShowSeatPayload) => {
        if (active) setData(payload);
      })
      .catch((err) => {
        console.error(err);
        onError('Could not load seats for this showtime.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showId, onError]);

  const rowsByTier = useMemo(() => {
    if (!data?.seats) return [];
    const grouped = new Map<string, SeatItem[]>();
    for (const seat of data.seats) {
      if (!grouped.has(seat.rowLabel)) grouped.set(seat.rowLabel, []);
      grouped.get(seat.rowLabel)!.push(seat);
    }
    return Array.from(grouped.entries()).map(([rowLabel, seats]) => ({
      rowLabel,
      category: seats[0]?.category || 'Silver',
      price: seats[0]?.price || 12,
      seats: seats.sort((a, b) => a.colNumber - b.colNumber),
    }));
  }, [data]);

  const selectedSeats = useMemo(() => {
    if (!data?.seats) return [];
    const idSet = new Set(selectedIds);
    return data.seats.filter((s) => idSet.has(s.id));
  }, [data, selectedIds]);

  const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = selectedSeats.length * 2;
  const taxes = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + convenienceFee + taxes;

  const toggleSeat = (seat: SeatItem) => {
    if (seat.isBooked || seat.isBlocked) return;
    setSelectedIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 10) {
        onError('Maximum 10 seats can be reserved per booking.');
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  const handleConfirm = () => {
    if (!data || selectedSeats.length === 0) return;
    onProceedToPayment({
      payload: data,
      selectedSeats,
      subtotal,
      convenienceFee,
      taxes,
      totalAmount: grandTotal,
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-[540px] rounded-2xl bg-[#141216] border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg text-[#F5F2EB]">Showtime could not be loaded.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A090C] text-sm font-semibold"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-8">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#C8C2B8] hover:text-[#D4AF37] mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Showtime
          </button>
          <h1 className="font-display text-3xl font-semibold text-[#F5F2EB]">
            {data.movie.title}
          </h1>
          <p className="mt-1 text-sm text-[#B5AEA4]">
            {data.theatre.name} <span aria-hidden="true">·</span> {data.screen.name}{' '}
            <span aria-hidden="true">·</span>{' '}
            <span className="font-mono tabular-nums text-[#D4AF37]">
              {data.show.showDate} at {data.show.showTime}
            </span>
          </p>
        </div>

        {/* Seat Legend (Icon + Text + Color, accessible) */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#C8C2B8]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-white/25 bg-[#1B1820]" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-[#D4AF37] text-[#0A090C] inline-flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
            Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-[#3A1B22] border border-[#8B1E2E]/60 text-red-200 inline-flex items-center justify-center">
              <Ban className="w-2.5 h-2.5" />
            </span>
            Occupied
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-sky-400/50 bg-sky-950/50 text-sky-300 inline-flex items-center justify-center">
              <Accessibility className="w-3 h-3" />
            </span>
            Accessible
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Auditorium Seat Map */}
        <div className="lg:col-span-8 bg-[#141216] border border-white/10 rounded-2xl p-5 sm:p-8 overflow-x-auto">
          <div className="min-w-[540px] space-y-6">
            {/* Curved Cinema Screen */}
            <div className="flex flex-col items-center pb-6">
              <div className="w-4/5 h-3 rounded-t-[100%] border-t-4 border-[#D4AF37]/80 bg-gradient-to-b from-[#D4AF37]/20 to-transparent" />
              <span className="mt-2 text-[11px] tracking-[0.25em] uppercase text-[#9C958B]">
                Cinema Screen This Way
              </span>
            </div>

            {/* Rows grouped by Silver -> Gold -> Platinum */}
            <div className="space-y-2.5">
              {rowsByTier.map((row, idx) => {
                const prevCat = idx > 0 ? rowsByTier[idx - 1].category : null;
                const showTierHeader = prevCat !== row.category;

                return (
                  <div key={row.rowLabel} className="space-y-2">
                    {showTierHeader && (
                      <div className="pt-3 pb-1 flex items-center justify-between border-b border-white/10 text-xs">
                        <span className="font-medium text-[#D4AF37]">
                          {row.category} Tier
                        </span>
                        <span className="font-mono tabular-nums text-[#A9A299]">
                          ${row.price} per seat
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2">
                      <span className="w-6 text-xs font-mono text-[#9C958B] text-right pr-1">
                        {row.rowLabel}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {row.seats.map((seat) => {
                          const isSelected = selectedIds.includes(seat.id);
                          const isUnavailable = seat.isBooked || seat.isBlocked;
                          const addAisleGap = seat.colNumber === 7;

                          return (
                            <button
                              key={seat.id}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => toggleSeat(seat)}
                              aria-label={`Seat ${seat.seatCode}, ${seat.category}, $${seat.price}, ${
                                seat.isBooked
                                  ? 'Occupied'
                                  : seat.isBlocked
                                    ? 'Unavailable'
                                    : isSelected
                                      ? 'Selected'
                                      : seat.isAccessible
                                        ? 'Accessible Available'
                                        : 'Available'
                              }`}
                              className={`${addAisleGap ? 'ml-5' : ''} w-8 h-8 rounded-md text-[11px] font-mono tabular-nums flex items-center justify-center transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                                seat.isBooked || seat.isBlocked
                                  ? 'bg-[#2C161B] border border-[#6E2230]/50 text-[#8F656D] cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#D4AF37] text-[#0A090C] font-semibold scale-105 shadow-md'
                                    : seat.isAccessible
                                      ? 'bg-sky-950/40 border border-sky-400/50 text-sky-200 hover:border-[#D4AF37] cursor-pointer'
                                      : seat.category === 'Platinum'
                                        ? 'bg-[#1F1A24] border border-[#D4AF37]/30 text-[#E5DFD5] hover:border-[#D4AF37] cursor-pointer'
                                        : 'bg-[#18161C] border border-white/15 text-[#C8C2B8] hover:border-[#D4AF37] cursor-pointer'
                              }`}
                            >
                              {seat.isBooked || seat.isBlocked ? (
                                <Ban className="w-3 h-3" />
                              ) : isSelected ? (
                                seat.colNumber
                              ) : seat.isAccessible ? (
                                <Accessibility className="w-3.5 h-3.5" />
                              ) : (
                                seat.colNumber
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <span className="w-6 text-xs font-mono text-[#9C958B] text-left pl-1">
                        {row.rowLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Booking Summary */}
        <aside className="lg:col-span-4 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="border-b border-white/10 pb-4">
            <p className="text-xs text-[#D4AF37] font-medium">Booking Summary</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#F5F2EB]">
              {data.movie.title}
            </h2>
            <p className="mt-1 text-xs text-[#A9A299]">
              {data.theatre.name} · {data.show.showDate} · {data.show.showTime}
            </p>
          </div>

          {selectedSeats.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#9C958B]">
              Select one or more available seats from the auditorium map to view
              itemized pricing.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A9A299]">
                  <span>Selected Seats ({selectedSeats.length})</span>
                  <span className="font-mono text-[#F5F2EB]">
                    {selectedSeats.map((s) => s.seatCode).join(', ')}
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                  {selectedSeats.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-xs text-[#D6D0C6]"
                    >
                      <span>
                        Seat {s.seatCode} ({s.category})
                      </span>
                      <span className="font-mono tabular-nums">${s.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-sm">
                <div className="flex items-center justify-between text-[#B5AEA4]">
                  <span>Tickets Subtotal</span>
                  <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[#B5AEA4]">
                  <span>Convenience Fee ($2 × {selectedSeats.length})</span>
                  <span className="font-mono tabular-nums">
                    ${convenienceFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#B5AEA4]">
                  <span>Applicable Taxes (10%)</span>
                  <span className="font-mono tabular-nums">${taxes.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-base font-semibold text-[#F5F2EB]">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums text-[#D4AF37]">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={selectedSeats.length === 0}
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            Confirm Booking ({selectedSeats.length})
          </button>
        </aside>
      </div>
    </div>
  );
}
