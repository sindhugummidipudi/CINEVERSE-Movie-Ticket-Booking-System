import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  bookingSeats,
  bookings,
  movies,
  payments,
  screens,
  seats,
  shows,
  theatres,
  users,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

function formatLocalDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function generateSeatsForScreen(
  screenId: number,
  rowsCount = 8,
  colsCount = 12
) {
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const rows: Array<{
    screenId: number;
    seatCode: string;
    rowLabel: string;
    colNumber: number;
    category: string;
    isAccessible: boolean;
    isBlocked: boolean;
  }> = [];

  for (let r = 0; r < rowsCount; r++) {
    const rowLabel = rowLetters[r];
    let category = 'Silver';
    if (r >= 3 && r <= 5) category = 'Gold';
    if (r >= 6) category = 'Platinum';

    for (let c = 1; c <= colsCount; c++) {
      const isAccessible = (r === 0 || r === 3) && (c === 1 || c === colsCount);
      rows.push({
        screenId,
        seatCode: `${rowLabel}${c}`,
        rowLabel,
        colNumber: c,
        category,
        isAccessible,
        isBlocked: false,
      });
    }
  }

  return db.insert(seats).values(rows).onConflictDoNothing().returning();
}

async function ensureRegionalReleases() {
  const existingMovies = await db.select().from(movies);

  const regionalCatalog = [
    {
      title: 'Amaran',
      slug: 'amaran-tamil',
      description:
        'An emotionally charged biographical war drama chronicling Major Mukund Varadarajan’s extraordinary courage in Kashmir and the enduring love story that anchored his life.',
      genre: 'Action Drama',
      language: 'Tamil',
      durationMin: 169,
      rating: '8.9',
      certificate: 'UA 13+',
      releaseDate: formatLocalDateOffset(-4),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_amaran_tamil_1795698337880.jpg',
      backdropUrl: '/src/assets/images/poster_amaran_tamil_1795698337880.jpg',
      trailerUrl: 'https://www.youtube.com/embed/hylIXfZeB4c',
      director: 'Rajkumar Periasamy',
      castJson: JSON.stringify([
        { name: 'Sivakarthikeyan', role: 'Major Mukund Varadarajan' },
        { name: 'Sai Pallavi', role: 'Indhu Rebecca Varghese' },
        { name: 'Bhuvan Arora', role: 'Sepoy Vikram Singh' },
      ]),
    },
    {
      title: 'Coolie',
      slug: 'coolie-tamil',
      description:
        'When a ruthless syndicate seizes control of Chennai’s maritime gold trade, a retired dockworker with a legendary past returns to dismantle their empire overnight.',
      genre: 'Action Thriller',
      language: 'Tamil',
      durationMin: 158,
      rating: '8.7',
      certificate: 'UA 16+',
      releaseDate: formatLocalDateOffset(-2),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_coolie_tamil_1795698338990.jpg',
      backdropUrl: '/src/assets/images/poster_coolie_tamil_1795698338990.jpg',
      trailerUrl: 'https://www.youtube.com/embed/TnhorwP9tcs',
      director: 'Lokesh Kanagaraj',
      castJson: JSON.stringify([
        { name: 'Rajinikanth', role: 'Deva' },
        { name: 'Nagarjuna', role: 'Simon' },
        { name: 'Shruti Haasan', role: 'Preethi' },
      ]),
    },
    {
      title: 'Pushpa 2: The Rule',
      slug: 'pushpa-2-the-rule',
      description:
        'Rising from the red sandalwood forests to global syndicates, Pushpa Raj defends his empire against relentless political foes and a vengeful superintendent.',
      genre: 'Action Drama',
      language: 'Telugu',
      durationMin: 182,
      rating: '8.8',
      certificate: 'UA 16+',
      releaseDate: formatLocalDateOffset(-5),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_pushpa_telugu_1795698339365.jpg',
      backdropUrl: '/src/assets/images/poster_pushpa_telugu_1795698339365.jpg',
      trailerUrl: 'https://www.youtube.com/embed/g3JUbgOHgdw',
      director: 'Sukumar',
      castJson: JSON.stringify([
        { name: 'Allu Arjun', role: 'Pushpa Raj' },
        { name: 'Rashmika Mandanna', role: 'Srivalli' },
        { name: 'Fahadh Faasil', role: 'Bhanwar Singh Shekhawat' },
      ]),
    },
    {
      title: 'Kalki 2898 AD',
      slug: 'kalki-2898-ad',
      description:
        'In a dystopian desert metropolis six millennia after the Kurukshetra war, a bounty hunter’s pursuit of a fugitive collides with an ancient prophecy.',
      genre: 'Sci-Fi Epic',
      language: 'Telugu',
      durationMin: 181,
      rating: '9.0',
      certificate: 'UA 13+',
      releaseDate: formatLocalDateOffset(-1),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_kalki_telugu_1795698339759.jpg',
      backdropUrl: '/src/assets/images/poster_kalki_telugu_1795698339759.jpg',
      trailerUrl: 'https://www.youtube.com/embed/y1-w1kUGuz8',
      director: 'Nag Ashwin',
      castJson: JSON.stringify([
        { name: 'Prabhas', role: 'Bhairava' },
        { name: 'Amitabh Bachchan', role: 'Ashwatthama' },
        { name: 'Deepika Padukone', role: 'SUM-80' },
        { name: 'Kamal Haasan', role: 'Supreme Yaskin' },
      ]),
    },
    {
      title: 'KA',
      slug: 'ka-kiran-abbavaram',
      description:
        'In the misty hillside village of Krishnagiri during the 1970s, a young postman with an uncanny gift for reading strangers’ letters uncovers a dark web of disappearances and a truth spanning lifetimes.',
      genre: 'Mystery Thriller',
      language: 'Telugu',
      durationMin: 151,
      rating: '8.9',
      certificate: 'UA 13+',
      releaseDate: formatLocalDateOffset(-3),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_ka_kiran_abbavaram_1795698736827.jpg',
      backdropUrl: '/src/assets/images/poster_ka_kiran_abbavaram_1795698736827.jpg',
      trailerUrl: 'https://www.youtube.com/embed/g92pM_IqOkE',
      director: 'Sujith & Sandeep',
      castJson: JSON.stringify([
        { name: 'Kiran Abbavaram', role: 'Abhinaya Vasudev' },
        { name: 'Nayan Sarika', role: 'Sathyabhama' },
        { name: 'Tanvi Ram', role: 'Radha' },
      ]),
    },
    {
      title: 'Daaku Maharaaj',
      slug: 'daaku-maharaaj-balayya',
      description:
        'When a ruthless mining syndicate terrorizes the Chambal valley and a mountain village’s lifeline, an enigmatic royal outlaw known as Daaku Maharaaj rides out to settle every debt.',
      genre: 'Action Drama',
      language: 'Telugu',
      durationMin: 155,
      rating: '8.8',
      certificate: 'UA 16+',
      releaseDate: formatLocalDateOffset(-2),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_daaku_maharaaj_balayya_1795698737195.jpg',
      backdropUrl: '/src/assets/images/poster_daaku_maharaaj_balayya_1795698737195.jpg',
      trailerUrl: 'https://www.youtube.com/embed/F__6F25Lif8',
      director: 'Bobby Kolli',
      castJson: JSON.stringify([
        { name: 'Nandamuri Balakrishna', role: 'Sitaram / Daaku Maharaaj' },
        { name: 'Bobby Deol', role: 'Balwant Singh Thakur' },
        { name: 'Pragya Jaiswal', role: 'Kaveri' },
        { name: 'Shraddha Srinath', role: 'Nandini' },
      ]),
    },
    {
      title: 'They Call Him OG',
      slug: 'they-call-him-og-pawan-kalyan',
      description:
        'After vanishing from Mumbai’s underworld for a decade, lethal mob strategist Ojas Gambheera returns to settle old scores and confront crime lord Omi Bhau in a storm of fire and steel.',
      genre: 'Action Crime',
      language: 'Telugu',
      durationMin: 162,
      rating: '9.1',
      certificate: 'A',
      releaseDate: formatLocalDateOffset(-10),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_og_pawan_kalyan_1795700904499.jpg',
      backdropUrl: '/src/assets/images/poster_og_pawan_kalyan_1795700904499.jpg',
      trailerUrl: 'https://www.youtube.com/embed/MfEzHbveJ1I',
      director: 'Sujeeth',
      castJson: JSON.stringify([
        { name: 'Pawan Kalyan', role: 'Ojas Gambheera (OG)' },
        { name: 'Emraan Hashmi', role: 'Omi Bhau' },
        { name: 'Priyanka Arul Mohan', role: 'Kanmani' },
        { name: 'Prakash Raj', role: 'Satya Dada' },
      ]),
    },
    {
      title: 'RRR',
      slug: 'rrr-telugu-classic',
      description:
        'A fearless Gond protector and a fiercely loyal British-era officer forge an unbreakable brotherhood in 1920s India before discovering they stand on opposite sides of revolution.',
      genre: 'Period Action Epic',
      language: 'Telugu',
      durationMin: 187,
      rating: '9.2',
      certificate: 'UA 13+',
      releaseDate: formatLocalDateOffset(-30),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_rrr_telugu_1795700905174.jpg',
      backdropUrl: '/src/assets/images/poster_rrr_telugu_1795700905174.jpg',
      trailerUrl: 'https://www.youtube.com/embed/f_iwBhUhSKQ',
      director: 'S. S. Rajamouli',
      castJson: JSON.stringify([
        { name: 'N. T. Rama Rao Jr.', role: 'Komaram Bheem' },
        { name: 'Ram Charan', role: 'Alluri Sitarama Raju' },
        { name: 'Alia Bhatt', role: 'Sita' },
        { name: 'Ajay Devgn', role: 'Venkata Rama Raju' },
      ]),
    },
    {
      title: 'Salaar: Part 1 – Ceasefire',
      slug: 'salaar-part-1-telugu',
      description:
        'Inside the blood-soaked dystopian city-state of Khansaar, a quiet exile returns when his childhood brother faces betrayal from every rival tribe vying for the throne.',
      genre: 'Action Thriller',
      language: 'Telugu',
      durationMin: 175,
      rating: '8.9',
      certificate: 'A',
      releaseDate: formatLocalDateOffset(-20),
      status: 'now_showing',
      isTrending: true,
      posterUrl: '/src/assets/images/poster_salaar_telugu_1795700905389.jpg',
      backdropUrl: '/src/assets/images/poster_salaar_telugu_1795700905389.jpg',
      trailerUrl: 'https://www.youtube.com/embed/4GPvYOBVkW4',
      director: 'Prashanth Neel',
      castJson: JSON.stringify([
        { name: 'Prabhas', role: 'Deva (Salaar)' },
        { name: 'Prithviraj Sukumaran', role: 'Varadha Raja Mannar' },
        { name: 'Shruti Haasan', role: 'Aadhya' },
        { name: 'Jagapathi Babu', role: 'Raja Mannar' },
      ]),
    },
  ];

  const existingBySlug = new Map(existingMovies.map((m) => [m.slug, m]));
  const newlyAddedMovies: Array<{ id: number; slug: string }> = [];
  for (const item of regionalCatalog) {
    const existing = existingBySlug.get(item.slug);
    if (!existing) {
      const [inserted] = await db
        .insert(movies)
        .values(item)
        .onConflictDoNothing()
        .returning({ id: movies.id, slug: movies.slug });
      if (inserted) {
        newlyAddedMovies.push(inserted);
      }
    } else if (existing.trailerUrl !== item.trailerUrl) {
      await db
        .update(movies)
        .set({ trailerUrl: item.trailerUrl })
        .where(eq(movies.id, existing.id));
    }
  }

  // Ensure Chennai flagship theatre exists
  const allTheatres = await db.select().from(theatres);
  let chennaiTheatre = allTheatres.find((t) => t.city === 'Chennai');
  if (!chennaiTheatre) {
    const [createdChennai] = await db
      .insert(theatres)
      .values({
        name: 'Cineverse Anna Nagar IMAX',
        city: 'Chennai',
        address: '2nd Avenue, Anna Nagar West, Chennai 600040',
        amenitiesJson: JSON.stringify(['IMAX Laser', 'Dolby Atmos', 'Valet Parking', 'Filter Coffee Lounge']),
      })
      .returning();
    chennaiTheatre = createdChennai;

    const createdScreens = await db
      .insert(screens)
      .values([
        {
          theatreId: chennaiTheatre.id,
          name: 'Audi 1 · IMAX Laser',
          format: 'IMAX Laser',
          rowsCount: 8,
          colsCount: 12,
        },
        {
          theatreId: chennaiTheatre.id,
          name: 'Audi 2 · Dolby Atmos',
          format: 'Dolby Atmos',
          rowsCount: 8,
          colsCount: 12,
        },
      ])
      .returning();

    for (const sc of createdScreens) {
      await generateSeatsForScreen(sc.id, sc.rowsCount, sc.colsCount);
    }
  }

  if (newlyAddedMovies.length === 0) {
    return;
  }

  const refreshedTheatres = await db.select().from(theatres);
  const refreshedScreens = await db.select().from(screens);
  const dates = [0, 1, 2, 3].map(formatLocalDateOffset);

  const hyderabadTheatre = refreshedTheatres.find((t) => t.city === 'Hyderabad');
  const bengaluruTheatre = refreshedTheatres.find((t) => t.city === 'Bengaluru');
  const mumbaiTheatre = refreshedTheatres.find((t) => t.city === 'Mumbai');

  const chennaiScreens = refreshedScreens.filter((s) => s.theatreId === chennaiTheatre!.id);
  const hyderabadScreens = hyderabadTheatre
    ? refreshedScreens.filter((s) => s.theatreId === hyderabadTheatre.id)
    : [];
  const bengaluruScreens = bengaluruTheatre
    ? refreshedScreens.filter((s) => s.theatreId === bengaluruTheatre.id)
    : [];
  const mumbaiScreens = mumbaiTheatre
    ? refreshedScreens.filter((s) => s.theatreId === mumbaiTheatre.id)
    : [];

  const regionalShowRows: Array<{
    movieId: number;
    theatreId: number;
    screenId: number;
    showDate: string;
    showTime: string;
    silverPrice: number;
    goldPrice: number;
    platinumPrice: number;
  }> = [];

  for (const showDate of dates) {
    for (const mv of newlyAddedMovies) {
      const isTamil = mv.slug.includes('tamil');
      if (chennaiTheatre && chennaiScreens[0]) {
        regionalShowRows.push(
          {
            movieId: mv.id,
            theatreId: chennaiTheatre.id,
            screenId: isTamil ? chennaiScreens[0].id : (chennaiScreens[1]?.id || chennaiScreens[0].id),
            showDate,
            showTime: isTamil ? '18:30' : '21:15',
            silverPrice: 12,
            goldPrice: 18,
            platinumPrice: 26,
          },
          {
            movieId: mv.id,
            theatreId: chennaiTheatre.id,
            screenId: chennaiScreens[0].id,
            showDate,
            showTime: isTamil ? '14:45' : '16:15',
            silverPrice: 11,
            goldPrice: 16,
            platinumPrice: 24,
          }
        );
      }

      if (hyderabadTheatre && hyderabadScreens[0]) {
        regionalShowRows.push({
          movieId: mv.id,
          theatreId: hyderabadTheatre.id,
          screenId: hyderabadScreens[0].id,
          showDate,
          showTime: isTamil ? '15:15' : '19:45',
          silverPrice: 13,
          goldPrice: 19,
          platinumPrice: 28,
        });
      }

      if (bengaluruTheatre && bengaluruScreens[0]) {
        regionalShowRows.push({
          movieId: mv.id,
          theatreId: bengaluruTheatre.id,
          screenId: bengaluruScreens[0].id,
          showDate,
          showTime: isTamil ? '17:30' : '20:15',
          silverPrice: 14,
          goldPrice: 20,
          platinumPrice: 28,
        });
      }

      if (mumbaiTheatre && mumbaiScreens[0]) {
        regionalShowRows.push({
          movieId: mv.id,
          theatreId: mumbaiTheatre.id,
          screenId: mumbaiScreens[1]?.id || mumbaiScreens[0].id,
          showDate,
          showTime: isTamil ? '16:00' : '22:00',
          silverPrice: 14,
          goldPrice: 20,
          platinumPrice: 29,
        });
      }
    }
  }

  if (regionalShowRows.length > 0) {
    await db.insert(shows).values(regionalShowRows);
  }
}

async function runSeed() {
  const [{ value: movieCount }] = await db.select({ value: count() }).from(movies);
  if (movieCount === 0) {
    const insertedMovies = await db
      .insert(movies)
      .values([
        {
          title: 'Solstice Protocol',
          slug: 'solstice-protocol',
          description:
            'When a stationary solar eclipse halts tidal telemetry across the North Atlantic Basin, archivist-engineer Mara Vance descends into a submerged orbital array to recover the final black-box transmission before the magnetosphere collapses.',
          genre: 'Sci-Fi Thriller',
          language: 'English',
          durationMin: 148,
          rating: '9.1',
          certificate: 'UA 13+',
          releaseDate: formatLocalDateOffset(-12),
          status: 'now_showing',
          isTrending: true,
          posterUrl: '/src/assets/images/poster_solstice_protocol_1795697501721.jpg',
          backdropUrl: '/src/assets/images/hero_solstice_protocol_1795697501019.jpg',
          trailerUrl: 'https://www.youtube.com/embed/YoHD9XEInc0',
          director: 'Elena Rostova',
          castJson: JSON.stringify([
            { name: 'Clara Lindqvist', role: 'Dr. Mara Vance' },
            { name: 'Dev Patel', role: 'Commander Tariq Noor' },
            { name: 'Stellan Voss', role: 'Director Halvorsen' },
            { name: 'Nadia Takahashi', role: 'Kira Sato' },
          ]),
        },
        {
          title: 'Velvet Nocturne',
          slug: 'velvet-nocturne',
          description:
            'Inside a shuttered 1940s art-deco cinema slated for demolition, a restoration projectionist discovers an uncatalogued nitrate reel linking the city’s mayor to a three-decade-old disappearance.',
          genre: 'Mystery Thriller',
          language: 'English',
          durationMin: 126,
          rating: '8.7',
          certificate: 'A',
          releaseDate: formatLocalDateOffset(-6),
          status: 'now_showing',
          isTrending: true,
          posterUrl: '/src/assets/images/poster_velvet_nocturne_1795697500788.jpg',
          backdropUrl: '/src/assets/images/hero_solstice_protocol_1795697501019.jpg',
          trailerUrl: 'https://www.youtube.com/embed/mqqft2x_Aa4',
          director: 'Julian Mercer',
          castJson: JSON.stringify([
            { name: 'Rory Gallagher', role: 'Arthur Bell' },
            { name: 'Camille Moreau', role: 'Sylvie Laurent' },
            { name: 'Kenji Watanabe', role: 'Inspector Sato' },
          ]),
        },
        {
          title: 'Monsoon Raga',
          slug: 'monsoon-raga',
          description:
            'Over seven rain-drenched evenings in Udaipur, an estranged classical sarangi virtuoso and his architect daughter reconcile past silences while preparing a centuries-old palace courtyard for its final concert.',
          genre: 'Musical Drama',
          language: 'Hindi',
          durationMin: 139,
          rating: '8.9',
          certificate: 'U',
          releaseDate: formatLocalDateOffset(-3),
          status: 'now_showing',
          isTrending: true,
          posterUrl: '/src/assets/images/poster_monsoon_raga_1795697503257.jpg',
          backdropUrl: '/src/assets/images/poster_monsoon_raga_1795697503257.jpg',
          trailerUrl: 'https://www.youtube.com/embed/6ZfuNTqbHE8',
          director: 'Aarav Kulkarni',
          castJson: JSON.stringify([
            { name: 'Vikramaditya Sen', role: 'Ustad Raghavendra' },
            { name: 'Meera Krishnan', role: 'Ananya Sen' },
            { name: 'Rohan Deshmukh', role: 'Kabir Malhotra' },
          ]),
        },
        {
          title: 'Iron Meridian',
          slug: 'iron-meridian',
          description:
            'In the winter of 1911, an armored trans-alpine express carrying sovereign bullion through an uncharted mountain pass becomes a rolling chessboard between rival cartographers and mercenaries.',
          genre: 'Historical Action',
          language: 'English',
          durationMin: 154,
          rating: '8.6',
          certificate: 'UA 13+',
          releaseDate: formatLocalDateOffset(-18),
          status: 'now_showing',
          isTrending: false,
          posterUrl: '/src/assets/images/poster_iron_meridian_1795697502259.jpg',
          backdropUrl: '/src/assets/images/poster_iron_meridian_1795697502259.jpg',
          trailerUrl: 'https://www.youtube.com/embed/EXeTwQWrcwY',
          director: 'Henrik Lindholm',
          castJson: JSON.stringify([
            { name: 'Lucas Vance', role: 'Captain Emile Frost' },
            { name: 'Freya Lindstrom', role: 'Astrid Berg' },
            { name: 'Omar Sharif Jr.', role: 'Dr. Farouk' },
          ]),
        },
        {
          title: 'Kuroshio Drift',
          slug: 'kuroshio-drift',
          description:
            'A young cartographer boards a wooden oceanographic schooner riding the Kuroshio Current to chart phantom bioluminescent islands whispered about in maritime journals.',
          genre: 'Animated Adventure',
          language: 'Japanese',
          durationMin: 118,
          rating: '9.0',
          certificate: 'U',
          releaseDate: formatLocalDateOffset(14),
          status: 'coming_soon',
          isTrending: true,
          posterUrl: '/src/assets/images/poster_kuroshio_drift_1795697503153.jpg',
          backdropUrl: '/src/assets/images/poster_kuroshio_drift_1795697503153.jpg',
          trailerUrl: 'https://www.youtube.com/embed/ByXuk9QqQkk',
          director: 'Haruka Shinkai',
          castJson: JSON.stringify([
            { name: 'Yuki Kaji', role: 'Renji Mizuno' },
            { name: 'Aoi Yuuki', role: 'Captain Fumiko' },
          ]),
        },
        {
          title: 'The Glass Orchard',
          slug: 'the-glass-orchard',
          description:
            'Inside a frost-covered botanical conservatory, a botanist reconstructing an extinct alpine orchid uncovers coded correspondence hidden beneath the glasshouse stonework.',
          genre: 'Psychological Drama',
          language: 'English',
          durationMin: 132,
          rating: '8.4',
          certificate: 'UA 16+',
          releaseDate: formatLocalDateOffset(25),
          status: 'coming_soon',
          isTrending: false,
          posterUrl: '/src/assets/images/poster_glass_orchard_1795697502927.jpg',
          backdropUrl: '/src/assets/images/poster_glass_orchard_1795697502927.jpg',
          trailerUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E',
          director: 'Soren Bjerre',
          castJson: JSON.stringify([
            { name: 'Isabelle Huppert', role: 'Dr. Helena Novak' },
            { name: 'Toby Jones', role: 'Curator Ellis' },
          ]),
        },
      ])
      .onConflictDoNothing()
      .returning();

    const insertedTheatres = await db
      .insert(theatres)
      .values([
        {
          name: 'Cineverse Maison IMAX',
          city: 'Mumbai',
          address: 'Colaba Heritage Pier, Apollo Bunder, Mumbai 400001',
          amenitiesJson: JSON.stringify(['IMAX Laser', 'Dolby Atmos', 'Valet Parking', 'Espresso Lounge']),
        },
        {
          name: 'Cineverse Indiranagar',
          city: 'Bengaluru',
          address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
          amenitiesJson: JSON.stringify(['Dolby Cinema', '4K Laser', 'Artisan Concessions']),
        },
        {
          name: 'Cineverse Chanakyapuri',
          city: 'New Delhi',
          address: 'Diplomatic Enclave, Satya Marg, New Delhi 110021',
          amenitiesJson: JSON.stringify(['Dolby Atmos', 'Recliner Balcony', 'Accessible Seating']),
        },
        {
          name: 'Cineverse Jubilee Hills',
          city: 'Hyderabad',
          address: 'Road No. 45, Jubilee Hills, Hyderabad 500033',
          amenitiesJson: JSON.stringify(['IMAX 2D', 'Dolby Atmos', 'Private Screening Suites']),
        },
      ])
      .returning();

    const screenSpecs = [
      { theatreId: insertedTheatres[0].id, name: 'Audi 1 · IMAX Laser', format: 'IMAX Laser', rowsCount: 8, colsCount: 12 },
      { theatreId: insertedTheatres[0].id, name: 'Audi 2 · Velvet Atmos', format: 'Dolby Atmos', rowsCount: 8, colsCount: 12 },
      { theatreId: insertedTheatres[1].id, name: 'Hall 1 · Dolby Cinema', format: 'Dolby Atmos', rowsCount: 8, colsCount: 12 },
      { theatreId: insertedTheatres[1].id, name: 'Hall 2 · Premiere 4K', format: 'Laser 4K', rowsCount: 8, colsCount: 12 },
      { theatreId: insertedTheatres[2].id, name: 'Grand Auditorium', format: 'Dolby Atmos', rowsCount: 8, colsCount: 12 },
      { theatreId: insertedTheatres[3].id, name: 'Flagship IMAX', format: 'IMAX 2D', rowsCount: 8, colsCount: 12 },
    ];

    const insertedScreens = await db.insert(screens).values(screenSpecs).returning();

    const screenSeatsMap = new Map<number, Array<{ id: number; seatCode: string; category: string }>>();
    for (const screen of insertedScreens) {
      const createdSeats = await generateSeatsForScreen(
        screen.id,
        screen.rowsCount,
        screen.colsCount
      );
      screenSeatsMap.set(screen.id, createdSeats);
    }

    const nowShowing = insertedMovies.filter((m) => m.status === 'now_showing');
    const dates = [0, 1, 2, 3].map(formatLocalDateOffset);
    const showRows: Array<{
      movieId: number;
      theatreId: number;
      screenId: number;
      showDate: string;
      showTime: string;
      silverPrice: number;
      goldPrice: number;
      platinumPrice: number;
    }> = [];

    for (const showDate of dates) {
      showRows.push(
        {
          movieId: nowShowing[0].id,
          theatreId: insertedTheatres[0].id,
          screenId: insertedScreens[0].id,
          showDate,
          showTime: '14:15',
          silverPrice: 14,
          goldPrice: 20,
          platinumPrice: 28,
        },
        {
          movieId: nowShowing[0].id,
          theatreId: insertedTheatres[0].id,
          screenId: insertedScreens[0].id,
          showDate,
          showTime: '19:30',
          silverPrice: 16,
          goldPrice: 22,
          platinumPrice: 32,
        },
        {
          movieId: nowShowing[1].id,
          theatreId: insertedTheatres[0].id,
          screenId: insertedScreens[1].id,
          showDate,
          showTime: '17:00',
          silverPrice: 12,
          goldPrice: 18,
          platinumPrice: 26,
        },
        {
          movieId: nowShowing[2].id,
          theatreId: insertedTheatres[0].id,
          screenId: insertedScreens[1].id,
          showDate,
          showTime: '21:15',
          silverPrice: 13,
          goldPrice: 19,
          platinumPrice: 27,
        },
        {
          movieId: nowShowing[0].id,
          theatreId: insertedTheatres[1].id,
          screenId: insertedScreens[2].id,
          showDate,
          showTime: '18:45',
          silverPrice: 14,
          goldPrice: 20,
          platinumPrice: 28,
        },
        {
          movieId: nowShowing[2].id,
          theatreId: insertedTheatres[1].id,
          screenId: insertedScreens[3].id,
          showDate,
          showTime: '16:10',
          silverPrice: 12,
          goldPrice: 18,
          platinumPrice: 25,
        },
        {
          movieId: nowShowing[3].id,
          theatreId: insertedTheatres[1].id,
          screenId: insertedScreens[3].id,
          showDate,
          showTime: '20:30',
          silverPrice: 12,
          goldPrice: 18,
          platinumPrice: 26,
        },
        {
          movieId: nowShowing[1].id,
          theatreId: insertedTheatres[2].id,
          screenId: insertedScreens[4].id,
          showDate,
          showTime: '15:30',
          silverPrice: 12,
          goldPrice: 18,
          platinumPrice: 25,
        },
        {
          movieId: nowShowing[2].id,
          theatreId: insertedTheatres[2].id,
          screenId: insertedScreens[4].id,
          showDate,
          showTime: '19:45',
          silverPrice: 14,
          goldPrice: 20,
          platinumPrice: 28,
        },
        {
          movieId: nowShowing[0].id,
          theatreId: insertedTheatres[3].id,
          screenId: insertedScreens[5].id,
          showDate,
          showTime: '16:45',
          silverPrice: 13,
          goldPrice: 19,
          platinumPrice: 27,
        },
        {
          movieId: nowShowing[3].id,
          theatreId: insertedTheatres[3].id,
          screenId: insertedScreens[5].id,
          showDate,
          showTime: '20:50',
          silverPrice: 13,
          goldPrice: 19,
          platinumPrice: 27,
        }
      );
    }

    const insertedShows = await db.insert(shows).values(showRows).returning();

    const [sampleGuest] = await db
      .insert(users)
      .values({
        uid: 'seed-patron-01',
        email: 'patron@cineverse.example',
        name: 'Arjun Mehta',
        preferredCity: 'Mumbai',
        role: 'user',
      })
      .onConflictDoNothing()
      .returning();

    if (sampleGuest && insertedShows.length >= 2) {
      const primeShow = insertedShows[1];
      const screenSeats = screenSeatsMap.get(primeShow.screenId) || [];
      const targetSeats = screenSeats.filter((s) =>
        ['E5', 'E6', 'E7', 'G6', 'G7'].includes(s.seatCode)
      );

      if (targetSeats.length > 0) {
        const subtotal = targetSeats.reduce(
          (acc, s) =>
            acc + (s.category === 'Platinum' ? primeShow.platinumPrice : primeShow.goldPrice),
          0
        );
        const convenienceFee = targetSeats.length * 2;
        const taxes = Math.round(subtotal * 0.1);
        const totalAmount = subtotal + convenienceFee + taxes;
        const bookingCode = 'CV-2026-48102';

        const [seededBooking] = await db
          .insert(bookings)
          .values({
            bookingCode,
            userId: sampleGuest.id,
            showId: primeShow.id,
            seatsJson: JSON.stringify(
              targetSeats.map((s) => ({
                seatId: s.id,
                seatCode: s.seatCode,
                category: s.category,
                price: s.category === 'Platinum' ? primeShow.platinumPrice : primeShow.goldPrice,
              }))
            ),
            subtotal,
            convenienceFee,
            taxes,
            totalAmount,
            status: 'confirmed',
            qrPayload: JSON.stringify({
              bookingCode,
              showId: primeShow.id,
              seats: targetSeats.map((s) => s.seatCode),
            }),
          })
          .returning();

        await db
          .insert(bookingSeats)
          .values(
            targetSeats.map((s) => ({
              bookingId: seededBooking.id,
              showId: primeShow.id,
              seatId: s.id,
              seatCode: s.seatCode,
              price: s.category === 'Platinum' ? primeShow.platinumPrice : primeShow.goldPrice,
            }))
          )
          .onConflictDoNothing();

        await db.insert(payments).values({
          bookingId: seededBooking.id,
          userId: sampleGuest.id,
          method: 'card',
          amount: totalAmount,
          status: 'succeeded',
          transactionRef: 'TXN-DEMO-48102',
          demoMode: true,
        });
      }
    }
  }

  // Always verify Tamil & Telugu recently released titles + Chennai IMAX theatre are present
  await ensureRegionalReleases();
}

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
