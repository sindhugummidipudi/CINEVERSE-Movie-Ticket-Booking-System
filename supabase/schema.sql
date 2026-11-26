-- CINEVERSE PostgreSQL / Supabase Compatible Schema
-- Tables: users, movies, theatres, screens, seats, shows, bookings, booking_seats, payments, app_settings

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  preferred_city TEXT NOT NULL DEFAULT 'Mumbai',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  language TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  rating TEXT NOT NULL DEFAULT '8.5',
  certificate TEXT NOT NULL DEFAULT 'UA 13+',
  release_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'now_showing',
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  poster_url TEXT NOT NULL,
  backdrop_url TEXT NOT NULL,
  trailer_url TEXT NOT NULL DEFAULT '',
  director TEXT NOT NULL DEFAULT '',
  cast_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS theatres (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  amenities_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screens (
  id SERIAL PRIMARY KEY,
  theatre_id INTEGER NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'Dolby Atmos',
  rows_count INTEGER NOT NULL DEFAULT 8,
  cols_count INTEGER NOT NULL DEFAULT 12
);

CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  screen_id INTEGER NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  seat_code TEXT NOT NULL,
  row_label TEXT NOT NULL,
  col_number INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS seats_screen_code_idx ON seats (screen_id, seat_code);

CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  theatre_id INTEGER NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  screen_id INTEGER NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  show_date TEXT NOT NULL,
  show_time TEXT NOT NULL,
  silver_price INTEGER NOT NULL DEFAULT 12,
  gold_price INTEGER NOT NULL DEFAULT 18,
  platinum_price INTEGER NOT NULL DEFAULT 26,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seats_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  convenience_fee INTEGER NOT NULL,
  taxes INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  qr_payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  seat_code TEXT NOT NULL,
  price INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_seats_show_seat_idx ON booking_seats (show_id, seat_id);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  transaction_ref TEXT NOT NULL,
  demo_mode BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
