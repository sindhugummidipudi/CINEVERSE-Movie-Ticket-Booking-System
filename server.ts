import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import QRCode from 'qrcode';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  appSettings,
  bookingSeats,
  bookings,
  movies,
  payments,
  screens,
  seats,
  shows,
  theatres,
  users,
} from './src/db/schema.ts';
import { ensureSeeded, generateSeatsForScreen } from './src/db/seed.ts';
import {
  findUserByEmail,
  registerEmailUser,
  sanitizeUser,
  updateUserProfile,
} from './src/db/users.ts';
import {
  getAdminBootstrapStatus,
  verifyOrClaimAdminPasscode,
} from './src/lib/admin-auth.ts';
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
} from './src/lib/session-auth.ts';
import { dispatchAutomaticTicketNotifications } from './src/lib/ticket-delivery.ts';
import {
  type AuthRequest,
  requireAdmin,
  requireAuth,
} from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
app.use(express.json({ limit: '1mb' }));

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `film-${Date.now()}`
  );
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cineverse-api' });
});

// Public Catalog: Movies + filter support
app.get('/api/movies', async (req, res) => {
  try {
    await ensureSeeded();
    const { status, trending, genre, language, city, q } = req.query as Record<
      string,
      string | undefined
    >;

    const allMovies = await db.select().from(movies).orderBy(asc(movies.id));
    const allShows = await db.select().from(shows);
    const allTheatres = await db.select().from(theatres);
    const theatreCityMap = new Map(allTheatres.map((t) => [t.id, t.city]));

    const movieCitiesMap = new Map<number, Set<string>>();
    for (const show of allShows) {
      const c = theatreCityMap.get(show.theatreId);
      if (!c) continue;
      if (!movieCitiesMap.has(show.movieId)) {
        movieCitiesMap.set(show.movieId, new Set());
      }
      movieCitiesMap.get(show.movieId)!.add(c);
    }

    const filtered = allMovies.filter((m) => {
      if (status && status !== 'all' && m.status !== status) return false;
      if (trending === 'true' && !m.isTrending) return false;
      if (genre && genre !== 'All' && !m.genre.toLowerCase().includes(genre.toLowerCase())) {
        return false;
      }
      if (language && language !== 'All' && m.language.toLowerCase() !== language.toLowerCase()) {
        return false;
      }
      if (city && city !== 'All Cities') {
        const citiesForMovie = movieCitiesMap.get(m.id);
        if (m.status === 'now_showing' && (!citiesForMovie || !citiesForMovie.has(city))) {
          return false;
        }
      }
      if (q && q.trim()) {
        const needle = q.trim().toLowerCase();
        const haystack = `${m.title} ${m.genre} ${m.language} ${m.director} ${m.description}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    res.json(
      filtered.map((m) => ({
        ...m,
        cast: JSON.parse(m.castJson || '[]'),
        cities: Array.from(movieCitiesMap.get(m.id) || []),
      }))
    );
  } catch (error) {
    console.error('Failed to fetch movies:', error);
    res.status(500).json({ error: 'Unable to load movies right now.' });
  }
});

// Public: Single Movie Details + Available Theatres, Dates & Shows
app.get('/api/movies/:id', async (req, res) => {
  try {
    await ensureSeeded();
    const movieId = Number(req.params.id);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      return res.status(400).json({ error: 'Invalid movie ID.' });
    }

    const [movie] = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found.' });
    }

    const movieShows = await db
      .select()
      .from(shows)
      .where(eq(shows.movieId, movieId))
      .orderBy(asc(shows.showDate), asc(shows.showTime));

    const allTheatres = await db.select().from(theatres);
    const allScreens = await db.select().from(screens);
    const theatreMap = new Map(allTheatres.map((t) => [t.id, t]));
    const screenMap = new Map(allScreens.map((s) => [s.id, s]));

    const enrichedShows = movieShows.map((s) => {
      const theatre = theatreMap.get(s.theatreId);
      const screen = screenMap.get(s.screenId);
      return {
        ...s,
        theatreName: theatre?.name || 'Cinema Hall',
        theatreCity: theatre?.city || '',
        theatreAddress: theatre?.address || '',
        theatreAmenities: JSON.parse(theatre?.amenitiesJson || '[]'),
        screenName: screen?.name || 'Screen 1',
        screenFormat: screen?.format || 'Dolby Atmos',
      };
    });

    res.json({
      ...movie,
      cast: JSON.parse(movie.castJson || '[]'),
      shows: enrichedShows,
    });
  } catch (error) {
    console.error('Failed to fetch movie details:', error);
    res.status(500).json({ error: 'Unable to load movie details.' });
  }
});

// Public: Theatres Directory with Screens & Upcoming Shows
app.get('/api/theatres', async (req, res) => {
  try {
    await ensureSeeded();
    const { city } = req.query as Record<string, string | undefined>;
    const allTheatres = await db.select().from(theatres).orderBy(asc(theatres.id));
    const allScreens = await db.select().from(screens);
    const allShows = await db.select().from(shows).orderBy(asc(shows.showDate), asc(shows.showTime));
    const allMovies = await db.select().from(movies);
    const movieMap = new Map(allMovies.map((m) => [m.id, m]));

    const filtered = allTheatres.filter(
      (t) => !city || city === 'All Cities' || t.city.toLowerCase() === city.toLowerCase()
    );

    res.json(
      filtered.map((t) => ({
        ...t,
        amenities: JSON.parse(t.amenitiesJson || '[]'),
        screens: allScreens.filter((sc) => sc.theatreId === t.id),
        shows: allShows
          .filter((sh) => sh.theatreId === t.id)
          .slice(0, 12)
          .map((sh) => {
            const mv = movieMap.get(sh.movieId);
            const sc = allScreens.find((scr) => scr.id === sh.screenId);
            return {
              ...sh,
              movieTitle: mv?.title || 'Feature Film',
              moviePoster: mv?.posterUrl || '',
              screenName: sc?.name || 'Screen 1',
              screenFormat: sc?.format || 'Dolby Atmos',
            };
          }),
      }))
    );
  } catch (error) {
    console.error('Failed to fetch theatres:', error);
    res.status(500).json({ error: 'Unable to load theatres.' });
  }
});

// Public: Show Details + Real-time Seat Map
app.get('/api/shows/:id/seats', async (req, res) => {
  try {
    await ensureSeeded();
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) || showId <= 0) {
      return res.status(400).json({ error: 'Invalid show ID.' });
    }

    const [show] = await db.select().from(shows).where(eq(shows.id, showId)).limit(1);
    if (!show) {
      return res.status(404).json({ error: 'Showtime not found.' });
    }

    const [[movie], [theatre], [screen], screenSeats, bookedRows] = await Promise.all([
      db.select().from(movies).where(eq(movies.id, show.movieId)).limit(1),
      db.select().from(theatres).where(eq(theatres.id, show.theatreId)).limit(1),
      db.select().from(screens).where(eq(screens.id, show.screenId)).limit(1),
      db.select().from(seats).where(eq(seats.screenId, show.screenId)).orderBy(asc(seats.rowLabel), asc(seats.colNumber)),
      db.select().from(bookingSeats).where(eq(bookingSeats.showId, showId)),
    ]);

    const bookedSeatIds = new Set(bookedRows.map((b) => b.seatId));

    const seatsWithAvailability = screenSeats.map((s) => {
      const price =
        s.category === 'Platinum'
          ? show.platinumPrice
          : s.category === 'Gold'
            ? show.goldPrice
            : show.silverPrice;

      return {
        ...s,
        price,
        isBooked: bookedSeatIds.has(s.id),
      };
    });

    res.json({
      show,
      movie,
      theatre: theatre
        ? { ...theatre, amenities: JSON.parse(theatre.amenitiesJson || '[]') }
        : null,
      screen,
      seats: seatsWithAvailability,
    });
  } catch (error) {
    console.error('Failed to fetch seats for show:', error);
    res.status(500).json({ error: 'Unable to load seat layout.' });
  }
});

// Public: Create Account (Email + Password)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, preferredCity } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = await registerEmailUser({
      name,
      email,
      passwordHash: hashPassword(password),
      phone: typeof phone === 'string' ? phone : '',
      preferredCity: typeof preferredCity === 'string' ? preferredCity : 'Mumbai',
    });

    const token = signSessionToken(user.id, user.email);
    res.status(201).json({ token, user });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Unable to create account right now.' });
  }
});

// Public: Email + Password Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRecord = await findUserByEmail(email);
    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!userRecord.passwordHash) {
      return res.status(401).json({
        error: 'This account uses Google Sign-In. Please click Continue with Google.',
      });
    }
    if (!verifyPassword(password, userRecord.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = sanitizeUser(userRecord);
    const token = signSessionToken(user.id, user.email);
    res.json({ token, user });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

// Authenticated: User Profile
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.dbUser);
});

app.put('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone, preferredCity } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name.' });
    }
    const updated = await updateUserProfile(req.dbUser!.id, {
      name: name.trim().slice(0, 80),
      phone: typeof phone === 'string' ? phone.trim().slice(0, 24) : '',
      preferredCity:
        typeof preferredCity === 'string' && preferredCity.trim()
          ? preferredCity.trim().slice(0, 40)
          : 'Mumbai',
    });
    res.json(updated);
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Unable to update profile.' });
  }
});

async function getMerchantPaymentSettings() {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, ['merchant_upi_id', 'merchant_name']));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    merchantUpiId: map.get('merchant_upi_id') || '6301719690@ybl',
    merchantName: map.get('merchant_name') || 'CINEVERSE Theatres',
  };
}

// Public: Merchant UPI display settings for in-app QR checkout
app.get('/api/payment-settings', async (_req, res) => {
  try {
    const settings = await getMerchantPaymentSettings();
    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch payment settings:', error);
    res.status(500).json({ error: 'Unable to load payment settings.' });
  }
});

// Authenticated: Generate in-app UPI / PhonePe / GPay / Paytm QR Code for exact amount
app.post('/api/payments/upi-qr', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { amount, reference, provider } = req.body || {};
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount.' });
    }
    const settings = await getMerchantPaymentSettings();
    const note = `CINEVERSE ${String(provider || 'UPI').toUpperCase()} ${String(reference || 'TICKET').slice(0, 24)}`;
    const upiUri = `upi://pay?pa=${encodeURIComponent(settings.merchantUpiId)}&pn=${encodeURIComponent(settings.merchantName)}&am=${numAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: { dark: '#0A090C', light: '#F5F2EB' },
    });

    res.json({
      upiUri,
      qrDataUrl,
      merchantUpiId: settings.merchantUpiId,
      merchantName: settings.merchantName,
    });
  } catch (error) {
    console.error('Failed to generate UPI QR:', error);
    res.status(500).json({ error: 'Unable to generate payment QR code.' });
  }
});

// Authenticated: Atomic Transactional Booking & In-App Payment Processing
app.post('/api/bookings/checkout', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const {
      showId,
      seatIds,
      paymentMethod,
      simulateOutcome,
      deliveryEmail,
      deliveryPhone,
      upiReference,
      paymentConfirmed,
    } = req.body || {};

    const parsedShowId = Number(showId);
    if (!Number.isInteger(parsedShowId) || parsedShowId <= 0) {
      return res.status(400).json({ error: 'Invalid showtime selection.' });
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0 || seatIds.length > 10) {
      return res
        .status(400)
        .json({ error: 'Please select between 1 and 10 seats.' });
    }

    const cleanSeatIds = Array.from(
      new Set(seatIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
    );
    if (cleanSeatIds.length !== seatIds.length) {
      return res.status(400).json({ error: 'Invalid seat IDs submitted.' });
    }

    const allowedMethods = [
      'phonepe',
      'gpay',
      'paytm',
      'upi',
      'card',
      'netbanking',
      'wallet',
    ];
    const method = allowedMethods.includes(paymentMethod) ? paymentMethod : 'phonepe';
    const isUpiMethod = ['phonepe', 'gpay', 'paytm', 'upi'].includes(method);
    const cleanUpiRef = String(upiReference || '')
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toUpperCase()
      .slice(0, 32);

    if (isUpiMethod && simulateOutcome !== 'fail') {
      if (!paymentConfirmed) {
        return res.status(400).json({
          error: 'Please scan the UPI QR, pay the admin UPI ID, and confirm your transfer before issuing the ticket.',
        });
      }
      if (cleanUpiRef.length < 8) {
        return res.status(400).json({
          error: 'Please enter a valid 8+ character UPI UTR / Transaction Reference from your payment app.',
        });
      }
    }

    // Load show & requested seats to validate pricing and compute totals server-side
    const [show] = await db.select().from(shows).where(eq(shows.id, parsedShowId)).limit(1);
    if (!show) {
      return res.status(404).json({ error: 'Selected showtime no longer exists.' });
    }

    const selectedSeats = await db
      .select()
      .from(seats)
      .where(and(eq(seats.screenId, show.screenId), inArray(seats.id, cleanSeatIds)));

    if (selectedSeats.length !== cleanSeatIds.length) {
      return res.status(400).json({ error: 'One or more seats do not belong to this screen.' });
    }

    const blocked = selectedSeats.filter((s) => s.isBlocked);
    if (blocked.length > 0) {
      return res.status(409).json({
        error: `Seat ${blocked.map((s) => s.seatCode).join(', ')} is temporarily unavailable.`,
      });
    }

    const seatBreakdown = selectedSeats.map((s) => {
      const price =
        s.category === 'Platinum'
          ? show.platinumPrice
          : s.category === 'Gold'
            ? show.goldPrice
            : show.silverPrice;
      return {
        seatId: s.id,
        seatCode: s.seatCode,
        category: s.category,
        price,
      };
    });

    const subtotal = seatBreakdown.reduce((sum, s) => sum + s.price, 0);
    const convenienceFee = seatBreakdown.length * 2;
    const taxes = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + convenienceFee + taxes;

    // Handle explicit demo payment failure simulation
    if (simulateOutcome === 'fail') {
      const failedRef = `TXN-DECLINED-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await db.insert(payments).values({
        bookingId: null,
        userId: req.dbUser!.id,
        method,
        amount: totalAmount,
        status: 'failed',
        transactionRef: failedRef,
        demoMode: true,
      });

      return res.status(402).json({
        error: 'Demo payment was declined by the simulated issuer. No seats were reserved.',
        transactionRef: failedRef,
      });
    }

    const bookingCode = `CV-${new Date().getFullYear()}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
    const transactionRef =
      isUpiMethod && cleanUpiRef
        ? `UTR-${cleanUpiRef}`
        : `TXN-DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const cleanDeliveryEmail = String(deliveryEmail || req.dbUser!.email || '')
      .trim()
      .slice(0, 120);
    const cleanDeliveryPhone = String(deliveryPhone || req.dbUser!.phone || '')
      .trim()
      .slice(0, 24);

    const qrPayload = JSON.stringify({
      bookingCode,
      showId: show.id,
      seats: seatBreakdown.map((s) => s.seatCode),
      totalAmount,
      deliveryEmail: cleanDeliveryEmail,
      deliveryPhone: cleanDeliveryPhone,
      issuedAt: new Date().toISOString(),
    });

    // Atomic transaction with unique index guard on (show_id, seat_id)
    const created = await db.transaction(async (tx) => {
      const existingAllocations = await tx
        .select()
        .from(bookingSeats)
        .where(
          and(
            eq(bookingSeats.showId, parsedShowId),
            inArray(bookingSeats.seatId, cleanSeatIds)
          )
        );

      if (existingAllocations.length > 0) {
        const takenCodes = existingAllocations.map((a) => a.seatCode).join(', ');
        const conflictErr = new Error(`Seat(s) ${takenCodes} were just booked by another patron.`);
        (conflictErr as Error & { statusCode?: number }).statusCode = 409;
        throw conflictErr;
      }

      const [newBooking] = await tx
        .insert(bookings)
        .values({
          bookingCode,
          userId: req.dbUser!.id,
          showId: parsedShowId,
          seatsJson: JSON.stringify(seatBreakdown),
          subtotal,
          convenienceFee,
          taxes,
          totalAmount,
          status: 'confirmed',
          qrPayload,
        })
        .returning();

      await tx.insert(bookingSeats).values(
        seatBreakdown.map((s) => ({
          bookingId: newBooking.id,
          showId: parsedShowId,
          seatId: s.seatId,
          seatCode: s.seatCode,
          price: s.price,
        }))
      );

      const [newPayment] = await tx
        .insert(payments)
        .values({
          bookingId: newBooking.id,
          userId: req.dbUser!.id,
          method,
          amount: totalAmount,
          status: 'succeeded',
          transactionRef,
          demoMode: true,
        })
        .returning();

      return { newBooking, newPayment };
    });

    const [[movie], [theatre], [screen], qrDataUrl] = await Promise.all([
      db.select().from(movies).where(eq(movies.id, show.movieId)).limit(1),
      db.select().from(theatres).where(eq(theatres.id, show.theatreId)).limit(1),
      db.select().from(screens).where(eq(screens.id, show.screenId)).limit(1),
      QRCode.toDataURL(qrPayload, {
        width: 240,
        margin: 1,
        color: { dark: '#0A090C', light: '#F5F2EB' },
      }),
    ]);

    const deliveryStatus = await dispatchAutomaticTicketNotifications({
      bookingCode,
      movieTitle: movie?.title || 'Feature Film',
      theatreName: theatre?.name || 'Cinema Hall',
      theatreCity: theatre?.city || '',
      screenName: screen?.name || 'Screen 1',
      showDate: show.showDate,
      showTime: show.showTime,
      seats: seatBreakdown.map((s) => s.seatCode),
      totalAmount,
      paymentMethod: method,
      transactionRef,
      deliveryEmail: cleanDeliveryEmail,
      deliveryPhone: cleanDeliveryPhone,
    });

    res.status(201).json({
      booking: {
        ...created.newBooking,
        seats: seatBreakdown,
        qrDataUrl,
        movieTitle: movie?.title || 'Feature Film',
        posterUrl: movie?.posterUrl || '',
        theatreName: theatre?.name || 'Cinema Hall',
        theatreCity: theatre?.city || '',
        screenName: screen?.name || 'Screen 1',
        screenFormat: screen?.format || 'Dolby Atmos',
        showDate: show.showDate,
        showTime: show.showTime,
        paymentMethod: method,
        transactionRef,
        deliveryEmail: cleanDeliveryEmail,
        deliveryPhone: cleanDeliveryPhone,
        deliveryStatus,
      },
      payment: created.newPayment,
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number; code?: string };
    if (err.statusCode === 409 || err.code === '23505') {
      return res.status(409).json({
        error: err.message || 'One or more selected seats are already booked.',
      });
    }
    console.error('Checkout failed:', error);
    res.status(500).json({ error: 'Booking could not be completed. Please try again.' });
  }
});

// Authenticated: Booking History
app.get('/api/bookings/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, req.dbUser!.id))
      .orderBy(desc(bookings.createdAt));

    if (userBookings.length === 0) {
      return res.json([]);
    }

    const [allShows, allMovies, allTheatres, allScreens, userPayments] = await Promise.all([
      db.select().from(shows),
      db.select().from(movies),
      db.select().from(theatres),
      db.select().from(screens),
      db.select().from(payments).where(eq(payments.userId, req.dbUser!.id)),
    ]);

    const showMap = new Map(allShows.map((s) => [s.id, s]));
    const movieMap = new Map(allMovies.map((m) => [m.id, m]));
    const theatreMap = new Map(allTheatres.map((t) => [t.id, t]));
    const screenMap = new Map(allScreens.map((sc) => [sc.id, sc]));
    const paymentMap = new Map(userPayments.map((p) => [p.bookingId, p]));

    const enriched = await Promise.all(
      userBookings.map(async (b) => {
        const sh = showMap.get(b.showId);
        const mv = sh ? movieMap.get(sh.movieId) : undefined;
        const th = sh ? theatreMap.get(sh.theatreId) : undefined;
        const sc = sh ? screenMap.get(sh.screenId) : undefined;
        const pay = paymentMap.get(b.id);
        const qrDataUrl = await QRCode.toDataURL(b.qrPayload, {
          width: 220,
          margin: 1,
          color: { dark: '#0A090C', light: '#F5F2EB' },
        });
        let parsedQr: { deliveryEmail?: string; deliveryPhone?: string } = {};
        try {
          parsedQr = JSON.parse(b.qrPayload || '{}');
        } catch {
          parsedQr = {};
        }
        return {
          ...b,
          seats: JSON.parse(b.seatsJson || '[]'),
          qrDataUrl,
          movieTitle: mv?.title || 'Feature Film',
          posterUrl: mv?.posterUrl || '',
          theatreName: th?.name || 'Cinema Hall',
          theatreCity: th?.city || '',
          screenName: sc?.name || 'Screen 1',
          screenFormat: sc?.format || 'Dolby Atmos',
          showDate: sh?.showDate || '',
          showTime: sh?.showTime || '',
          paymentMethod: pay?.method || 'card',
          transactionRef: pay?.transactionRef || '',
          deliveryEmail: parsedQr.deliveryEmail || req.dbUser!.email || '',
          deliveryPhone: parsedQr.deliveryPhone || req.dbUser!.phone || '',
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Failed to load booking history:', error);
    res.status(500).json({ error: 'Unable to fetch your bookings.' });
  }
});

// Authenticated: Cancel Booking (releases seat locks)
app.post('/api/bookings/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: 'Invalid booking ID.' });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, req.dbUser!.id)))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking is already cancelled.' });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ status: 'cancelled' })
        .where(eq(bookings.id, bookingId));
      await tx.delete(bookingSeats).where(eq(bookingSeats.bookingId, bookingId));
    });

    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    res.status(500).json({ error: 'Unable to cancel booking.' });
  }
});

// Admin Bootstrap & Passcode Elevation
app.get('/api/admin/bootstrap-status', requireAuth, async (_req, res) => {
  try {
    const status = await getAdminBootstrapStatus();
    res.json(status);
  } catch (error) {
    console.error('Bootstrap status failed:', error);
    res.status(500).json({ error: 'Unable to check admin status.' });
  }
});

app.post('/api/admin/elevate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { passcode } = req.body || {};
    const result = await verifyOrClaimAdminPasscode(req.dbUser!.id, String(passcode || ''));
    if (!result.ok) {
      return res.status(403).json({ error: result.error });
    }
    res.json({ success: true, role: 'admin' });
  } catch (error) {
    console.error('Admin elevation failed:', error);
    res.status(500).json({ error: 'Unable to verify admin access.' });
  }
});

// Admin Dashboard Overview + Analytics + Full Lists
app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await ensureSeeded();
    const [
      allMovies,
      allTheatres,
      allScreens,
      allShows,
      allBookings,
      allUsers,
      allPayments,
      paymentSettings,
    ] = await Promise.all([
      db.select().from(movies).orderBy(asc(movies.id)),
      db.select().from(theatres).orderBy(asc(theatres.id)),
      db.select().from(screens).orderBy(asc(screens.id)),
      db.select().from(shows).orderBy(asc(shows.showDate), asc(shows.showTime)),
      db.select().from(bookings).orderBy(desc(bookings.createdAt)),
      db.select().from(users).orderBy(desc(users.createdAt)),
      db.select().from(payments).orderBy(desc(payments.createdAt)),
      getMerchantPaymentSettings(),
    ]);

    const confirmedBookings = allBookings.filter((b) => b.status === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTickets = confirmedBookings.reduce((sum, b) => {
      const parsed = JSON.parse(b.seatsJson || '[]');
      return sum + (Array.isArray(parsed) ? parsed.length : 0);
    }, 0);

    const movieMap = new Map(allMovies.map((m) => [m.id, m]));
    const theatreMap = new Map(allTheatres.map((t) => [t.id, t]));
    const screenMap = new Map(allScreens.map((sc) => [sc.id, sc]));
    const showMap = new Map(allShows.map((sh) => [sh.id, sh]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const revenueByMovieMap = new Map<string, number>();
    const revenueByDateMap = new Map<string, number>();

    for (const b of confirmedBookings) {
      const sh = showMap.get(b.showId);
      const mv = sh ? movieMap.get(sh.movieId) : undefined;
      const title = mv?.title || 'Other';
      revenueByMovieMap.set(title, (revenueByMovieMap.get(title) || 0) + b.totalAmount);

      const dateKey = sh?.showDate || 'Recent';
      revenueByDateMap.set(dateKey, (revenueByDateMap.get(dateKey) || 0) + b.totalAmount);
    }

    res.json({
      kpis: {
        totalRevenue,
        totalTickets,
        activeMovies: allMovies.filter((m) => m.status === 'now_showing').length,
        totalBookings: confirmedBookings.length,
        registeredUsers: allUsers.length,
        totalTheatres: allTheatres.length,
      },
      revenueByMovie: Array.from(revenueByMovieMap.entries()).map(([label, amount]) => ({
        label,
        amount,
      })),
      revenueByDate: Array.from(revenueByDateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({ date, amount })),
      movies: allMovies.map((m) => ({
        ...m,
        cast: JSON.parse(m.castJson || '[]'),
      })),
      theatres: allTheatres.map((t) => ({
        ...t,
        amenities: JSON.parse(t.amenitiesJson || '[]'),
        screens: allScreens.filter((sc) => sc.theatreId === t.id),
      })),
      shows: allShows.map((sh) => ({
        ...sh,
        movieTitle: movieMap.get(sh.movieId)?.title || 'Movie',
        theatreName: theatreMap.get(sh.theatreId)?.name || 'Theatre',
        theatreCity: theatreMap.get(sh.theatreId)?.city || '',
        screenName: screenMap.get(sh.screenId)?.name || 'Screen',
      })),
      bookings: allBookings.map((b) => {
        const sh = showMap.get(b.showId);
        const u = userMap.get(b.userId);
        return {
          ...b,
          seats: JSON.parse(b.seatsJson || '[]'),
          customerName: u?.name || 'Guest',
          customerEmail: u?.email || '',
          movieTitle: sh ? movieMap.get(sh.movieId)?.title || 'Movie' : 'Movie',
          theatreName: sh ? theatreMap.get(sh.theatreId)?.name || 'Theatre' : 'Theatre',
          showDate: sh?.showDate || '',
          showTime: sh?.showTime || '',
        };
      }),
      users: allUsers.map((u) => sanitizeUser(u)),
      paymentSettings,
      payments: allPayments.map((p) => {
        const u = userMap.get(p.userId);
        return {
          ...p,
          customerName: u?.name || 'Patron',
          customerEmail: u?.email || '',
        };
      }),
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Unable to load admin dashboard.' });
  }
});

// Admin: Cancel/Reject an unverified booking and release its seats
app.post('/api/admin/bookings/:id/cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: 'Invalid booking ID.' });
    }
    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ status: 'cancelled' })
        .where(eq(bookings.id, bookingId));
      await tx.delete(bookingSeats).where(eq(bookingSeats.bookingId, bookingId));
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Admin cancel booking failed:', error);
    res.status(500).json({ error: 'Unable to cancel booking.' });
  }
});

// Admin: Configure Merchant UPI ID & Name for In-App Payments
app.put('/api/admin/payment-settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { merchantUpiId, merchantName } = req.body || {};
    if (!merchantUpiId || !String(merchantUpiId).includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. business@okaxis).' });
    }
    const cleanUpi = String(merchantUpiId).trim().slice(0, 80);
    const cleanName = String(merchantName || 'CINEVERSE Theatres').trim().slice(0, 80);

    await db
      .insert(appSettings)
      .values({ key: 'merchant_upi_id', value: cleanUpi })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: cleanUpi, updatedAt: new Date() },
      });

    await db
      .insert(appSettings)
      .values({ key: 'merchant_name', value: cleanName })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: cleanName, updatedAt: new Date() },
      });

    res.json({ merchantUpiId: cleanUpi, merchantName: cleanName });
  } catch (error) {
    console.error('Failed to update payment settings:', error);
    res.status(500).json({ error: 'Unable to save payment settings.' });
  }
});

// Admin: Add Movie
app.post('/api/admin/movies', requireAuth, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.description || !b.genre || !b.language) {
      return res.status(400).json({ error: 'Title, description, genre, and language are required.' });
    }
    const slug = `${slugify(b.title)}-${crypto.randomBytes(2).toString('hex')}`;
    const [created] = await db
      .insert(movies)
      .values({
        title: String(b.title).trim(),
        slug,
        description: String(b.description).trim(),
        genre: String(b.genre).trim(),
        language: String(b.language).trim(),
        durationMin: Math.max(40, Number(b.durationMin) || 120),
        rating: String(b.rating || '8.5').trim(),
        certificate: String(b.certificate || 'UA 13+').trim(),
        releaseDate: String(b.releaseDate || new Date().toISOString().slice(0, 10)),
        status: b.status === 'coming_soon' ? 'coming_soon' : 'now_showing',
        isTrending: Boolean(b.isTrending),
        posterUrl:
          String(b.posterUrl || '').trim() ||
          '/src/assets/images/poster_solstice_protocol_1795697501721.jpg',
        backdropUrl:
          String(b.backdropUrl || '').trim() ||
          '/src/assets/images/hero_solstice_protocol_1795697501019.jpg',
        trailerUrl: String(b.trailerUrl || '').trim(),
        director: String(b.director || 'Cineverse Originals').trim(),
        castJson: JSON.stringify(Array.isArray(b.cast) ? b.cast : []),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Admin add movie failed:', error);
    res.status(500).json({ error: 'Unable to add movie.' });
  }
});

// Admin: Edit Movie
app.put('/api/admin/movies/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid movie ID.' });
    }
    const b = req.body || {};
    const [updated] = await db
      .update(movies)
      .set({
        title: String(b.title || '').trim(),
        description: String(b.description || '').trim(),
        genre: String(b.genre || '').trim(),
        language: String(b.language || '').trim(),
        durationMin: Math.max(40, Number(b.durationMin) || 120),
        rating: String(b.rating || '8.5').trim(),
        certificate: String(b.certificate || 'UA 13+').trim(),
        releaseDate: String(b.releaseDate || new Date().toISOString().slice(0, 10)),
        status: b.status === 'coming_soon' ? 'coming_soon' : 'now_showing',
        isTrending: Boolean(b.isTrending),
        director: String(b.director || '').trim(),
      })
      .where(eq(movies.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Movie not found.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Admin edit movie failed:', error);
    res.status(500).json({ error: 'Unable to update movie.' });
  }
});

// Admin: Delete Movie
app.delete('/api/admin/movies/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid movie ID.' });
    }
    await db.delete(movies).where(eq(movies.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete movie failed:', error);
    res.status(500).json({ error: 'Unable to delete movie.' });
  }
});

// Admin: Add Theatre (+ default screen & 96 seats)
app.post('/api/admin/theatres', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, city, address, screenName, screenFormat } = req.body || {};
    if (!name || !city || !address) {
      return res.status(400).json({ error: 'Theatre name, city, and address are required.' });
    }
    const [createdTheatre] = await db
      .insert(theatres)
      .values({
        name: String(name).trim(),
        city: String(city).trim(),
        address: String(address).trim(),
        amenitiesJson: JSON.stringify([screenFormat || 'Dolby Atmos', 'Laser 4K', 'Accessible Seating']),
      })
      .returning();

    const [createdScreen] = await db
      .insert(screens)
      .values({
        theatreId: createdTheatre.id,
        name: String(screenName || 'Audi 1').trim(),
        format: String(screenFormat || 'Dolby Atmos').trim(),
        rowsCount: 8,
        colsCount: 12,
      })
      .returning();

    await generateSeatsForScreen(createdScreen.id, 8, 12);

    res.status(201).json({
      ...createdTheatre,
      screens: [createdScreen],
    });
  } catch (error) {
    console.error('Admin add theatre failed:', error);
    res.status(500).json({ error: 'Unable to create theatre.' });
  }
});

app.delete('/api/admin/theatres/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid theatre ID.' });
    }
    await db.delete(theatres).where(eq(theatres.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete theatre failed:', error);
    res.status(500).json({ error: 'Unable to delete theatre.' });
  }
});

// Admin: Create Show Schedule
app.post('/api/admin/shows', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      movieId,
      theatreId,
      screenId,
      showDate,
      showTime,
      silverPrice,
      goldPrice,
      platinumPrice,
    } = req.body || {};

    if (!movieId || !theatreId || !screenId || !showDate || !showTime) {
      return res.status(400).json({ error: 'Movie, theatre, screen, date, and time are required.' });
    }

    const [created] = await db
      .insert(shows)
      .values({
        movieId: Number(movieId),
        theatreId: Number(theatreId),
        screenId: Number(screenId),
        showDate: String(showDate),
        showTime: String(showTime),
        silverPrice: Math.max(1, Number(silverPrice) || 12),
        goldPrice: Math.max(1, Number(goldPrice) || 18),
        platinumPrice: Math.max(1, Number(platinumPrice) || 26),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Admin add show failed:', error);
    res.status(500).json({ error: 'Unable to schedule show.' });
  }
});

// Admin: Update Show Pricing/Time
app.put('/api/admin/shows/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { showTime, silverPrice, goldPrice, platinumPrice } = req.body || {};
    const [updated] = await db
      .update(shows)
      .set({
        showTime: String(showTime || '19:00'),
        silverPrice: Math.max(1, Number(silverPrice) || 12),
        goldPrice: Math.max(1, Number(goldPrice) || 18),
        platinumPrice: Math.max(1, Number(platinumPrice) || 26),
      })
      .where(eq(shows.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    console.error('Admin update show failed:', error);
    res.status(500).json({ error: 'Unable to update show.' });
  }
});

app.delete('/api/admin/shows/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(shows).where(eq(shows.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete show failed:', error);
    res.status(500).json({ error: 'Unable to delete show.' });
  }
});

// Admin: Inspect & Manage Seats for a Screen
app.get('/api/admin/screens/:id/seats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const screenId = Number(req.params.id);
    const list = await db
      .select()
      .from(seats)
      .where(eq(seats.screenId, screenId))
      .orderBy(asc(seats.rowLabel), asc(seats.colNumber));
    res.json(list);
  } catch (error) {
    console.error('Admin fetch screen seats failed:', error);
    res.status(500).json({ error: 'Unable to fetch screen seats.' });
  }
});

app.put('/api/admin/seats/:id/toggle-block', requireAuth, requireAdmin, async (req, res) => {
  try {
    const seatId = Number(req.params.id);
    const [current] = await db.select().from(seats).where(eq(seats.id, seatId)).limit(1);
    if (!current) {
      return res.status(404).json({ error: 'Seat not found.' });
    }
    const [updated] = await db
      .update(seats)
      .set({ isBlocked: !current.isBlocked })
      .where(eq(seats.id, seatId))
      .returning();
    res.json(updated);
  } catch (error) {
    console.error('Admin toggle seat block failed:', error);
    res.status(500).json({ error: 'Unable to update seat status.' });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Only start listening when executed directly (allows Vercel serverless import of `app`)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`CINEVERSE server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
