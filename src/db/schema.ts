import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  preferredCity: text('preferred_city').notNull().default('Mumbai'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const movies = pgTable('movies', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  genre: text('genre').notNull(),
  language: text('language').notNull(),
  durationMin: integer('duration_min').notNull(),
  rating: text('rating').notNull().default('8.5'),
  certificate: text('certificate').notNull().default('UA 13+'),
  releaseDate: text('release_date').notNull(),
  status: text('status').notNull().default('now_showing'),
  isTrending: boolean('is_trending').notNull().default(false),
  posterUrl: text('poster_url').notNull(),
  backdropUrl: text('backdrop_url').notNull(),
  trailerUrl: text('trailer_url').notNull().default(''),
  director: text('director').notNull().default(''),
  castJson: text('cast_json').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const theatres = pgTable('theatres', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  amenitiesJson: text('amenities_json').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const screens = pgTable('screens', {
  id: serial('id').primaryKey(),
  theatreId: integer('theatre_id')
    .references(() => theatres.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  format: text('format').notNull().default('Dolby Atmos'),
  rowsCount: integer('rows_count').notNull().default(8),
  colsCount: integer('cols_count').notNull().default(12),
});

export const seats = pgTable(
  'seats',
  {
    id: serial('id').primaryKey(),
    screenId: integer('screen_id')
      .references(() => screens.id, { onDelete: 'cascade' })
      .notNull(),
    seatCode: text('seat_code').notNull(),
    rowLabel: text('row_label').notNull(),
    colNumber: integer('col_number').notNull(),
    category: text('category').notNull(), // 'Silver' | 'Gold' | 'Platinum'
    isAccessible: boolean('is_accessible').notNull().default(false),
    isBlocked: boolean('is_blocked').notNull().default(false),
  },
  (table) => [
    uniqueIndex('seats_screen_code_idx').on(table.screenId, table.seatCode),
  ]
);

export const shows = pgTable('shows', {
  id: serial('id').primaryKey(),
  movieId: integer('movie_id')
    .references(() => movies.id, { onDelete: 'cascade' })
    .notNull(),
  theatreId: integer('theatre_id')
    .references(() => theatres.id, { onDelete: 'cascade' })
    .notNull(),
  screenId: integer('screen_id')
    .references(() => screens.id, { onDelete: 'cascade' })
    .notNull(),
  showDate: text('show_date').notNull(), // YYYY-MM-DD
  showTime: text('show_time').notNull(), // HH:mm
  silverPrice: integer('silver_price').notNull().default(12),
  goldPrice: integer('gold_price').notNull().default(18),
  platinumPrice: integer('platinum_price').notNull().default(26),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingCode: text('booking_code').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  showId: integer('show_id')
    .references(() => shows.id, { onDelete: 'cascade' })
    .notNull(),
  seatsJson: text('seats_json').notNull(),
  subtotal: integer('subtotal').notNull(),
  convenienceFee: integer('convenience_fee').notNull(),
  taxes: integer('taxes').notNull(),
  totalAmount: integer('total_amount').notNull(),
  status: text('status').notNull().default('confirmed'), // 'confirmed' | 'cancelled'
  qrPayload: text('qr_payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookingSeats = pgTable(
  'booking_seats',
  {
    id: serial('id').primaryKey(),
    bookingId: integer('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    showId: integer('show_id')
      .references(() => shows.id, { onDelete: 'cascade' })
      .notNull(),
    seatId: integer('seat_id')
      .references(() => seats.id, { onDelete: 'cascade' })
      .notNull(),
    seatCode: text('seat_code').notNull(),
    price: integer('price').notNull(),
  },
  (table) => [
    uniqueIndex('booking_seats_show_seat_idx').on(table.showId, table.seatId),
  ]
);

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  method: text('method').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull(), // 'succeeded' | 'failed'
  transactionRef: text('transaction_ref').notNull(),
  demoMode: boolean('demo_mode').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  payments: many(payments),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  shows: many(shows),
}));

export const theatresRelations = relations(theatres, ({ many }) => ({
  screens: many(screens),
  shows: many(shows),
}));

export const screensRelations = relations(screens, ({ one, many }) => ({
  theatre: one(theatres, {
    fields: [screens.theatreId],
    references: [theatres.id],
  }),
  seats: many(seats),
  shows: many(shows),
}));

export const showsRelations = relations(shows, ({ one, many }) => ({
  movie: one(movies, {
    fields: [shows.movieId],
    references: [movies.id],
  }),
  theatre: one(theatres, {
    fields: [shows.theatreId],
    references: [theatres.id],
  }),
  screen: one(screens, {
    fields: [shows.screenId],
    references: [screens.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  show: one(shows, {
    fields: [bookings.showId],
    references: [shows.id],
  }),
  bookingSeats: many(bookingSeats),
  payments: many(payments),
}));
