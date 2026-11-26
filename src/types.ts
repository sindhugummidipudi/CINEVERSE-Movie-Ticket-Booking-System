export interface CastMember {
  name: string;
  role: string;
}

export interface Movie {
  id: number;
  title: string;
  slug: string;
  description: string;
  genre: string;
  language: string;
  durationMin: number;
  rating: string;
  certificate: string;
  releaseDate: string;
  status: 'now_showing' | 'coming_soon';
  isTrending: boolean;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  director: string;
  cast: CastMember[];
  cities?: string[];
}

export interface ShowSummary {
  id: number;
  movieId: number;
  theatreId: number;
  screenId: number;
  showDate: string;
  showTime: string;
  silverPrice: number;
  goldPrice: number;
  platinumPrice: number;
  theatreName: string;
  theatreCity: string;
  theatreAddress?: string;
  theatreAmenities?: string[];
  screenName: string;
  screenFormat: string;
}

export interface MovieDetails extends Movie {
  shows: ShowSummary[];
}

export interface ScreenInfo {
  id: number;
  theatreId: number;
  name: string;
  format: string;
  rowsCount: number;
  colsCount: number;
}

export interface TheatreInfo {
  id: number;
  name: string;
  city: string;
  address: string;
  amenities: string[];
  screens: ScreenInfo[];
  shows: Array<
    ShowSummary & {
      movieTitle: string;
      moviePoster: string;
    }
  >;
}

export interface SeatItem {
  id: number;
  screenId: number;
  seatCode: string;
  rowLabel: string;
  colNumber: number;
  category: 'Silver' | 'Gold' | 'Platinum';
  isAccessible: boolean;
  isBlocked: boolean;
  price: number;
  isBooked: boolean;
}

export interface ShowSeatPayload {
  show: {
    id: number;
    movieId: number;
    theatreId: number;
    screenId: number;
    showDate: string;
    showTime: string;
    silverPrice: number;
    goldPrice: number;
    platinumPrice: number;
  };
  movie: Movie;
  theatre: {
    id: number;
    name: string;
    city: string;
    address: string;
    amenities: string[];
  };
  screen: ScreenInfo;
  seats: SeatItem[];
}

export interface BookedSeatSummary {
  seatId: number;
  seatCode: string;
  category: string;
  price: number;
}

export interface BookingRecord {
  id: number;
  bookingCode: string;
  userId: number;
  showId: number;
  seats: BookedSeatSummary[];
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  totalAmount: number;
  status: 'confirmed' | 'cancelled';
  qrDataUrl: string;
  movieTitle: string;
  posterUrl: string;
  theatreName: string;
  theatreCity: string;
  screenName: string;
  screenFormat: string;
  showDate: string;
  showTime: string;
  paymentMethod?: string;
  transactionRef?: string;
  deliveryEmail?: string;
  deliveryPhone?: string;
  deliveryStatus?: {
    email: 'sent' | 'not_configured' | 'failed' | 'skipped';
    whatsapp: 'sent' | 'not_configured' | 'failed' | 'skipped';
  };
  createdAt: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  phone: string;
  preferredCity: string;
  role: 'user' | 'admin';
  hasPassword?: boolean;
  createdAt?: string;
}

export interface PaymentTransaction {
  id: number;
  bookingId: number | null;
  userId: number;
  method: string;
  amount: number;
  status: string;
  transactionRef: string;
  demoMode: boolean;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

export interface AdminOverview {
  kpis: {
    totalRevenue: number;
    totalTickets: number;
    activeMovies: number;
    totalBookings: number;
    registeredUsers: number;
    totalTheatres: number;
  };
  revenueByMovie: Array<{ label: string; amount: number }>;
  revenueByDate: Array<{ date: string; amount: number }>;
  movies: Movie[];
  theatres: Array<{
    id: number;
    name: string;
    city: string;
    address: string;
    amenities: string[];
    screens: ScreenInfo[];
  }>;
  shows: Array<{
    id: number;
    movieId: number;
    theatreId: number;
    screenId: number;
    showDate: string;
    showTime: string;
    silverPrice: number;
    goldPrice: number;
    platinumPrice: number;
    movieTitle: string;
    theatreName: string;
    theatreCity: string;
    screenName: string;
  }>;
  bookings: Array<
    BookingRecord & {
      customerName: string;
      customerEmail: string;
    }
  >;
  users: UserProfile[];
  paymentSettings: {
    merchantUpiId: string;
    merchantName: string;
  };
  payments: PaymentTransaction[];
}

export type AppView =
  | 'home'
  | 'movies'
  | 'theatres'
  | 'movie-details'
  | 'seats'
  | 'payment'
  | 'confirmation'
  | 'bookings'
  | 'admin';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
