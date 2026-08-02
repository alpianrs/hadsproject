import { PackageItem, PortfolioItem, Review, StudioSettings } from '../types';

export const INITIAL_PACKAGES: PackageItem[] = [
  {
    id: 'pkg-wedding-gold',
    name: 'Wedding Gold Luxury',
    price: 8500000,
    minDp: 1500000,
    duration: 'Full Day (Up to 12 Hours)',
    durationHours: 12,
    photoCount: 'Unlimited Photos (All High-Res Edited)',
    videoCount: '1 Cinematic Highlight (3-5 Min) + Teaser 1 Min',
    drone: true,
    album: '1 Exclusive Photobook Album 20x30 Box Leather',
    cetak: '2 Canvas Print 40x60cm + Frame Gold Minimalist',
    bonus: 'Flashdisk Custom Wooden 64GB + Mini Album Ortuk',
    coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    active: true,
    category: 'Wedding',
    description: 'Dokumentasi pernikahan terlengkap dengan estetika sinematik, aerial drone, dan album kemewahan.'
  },
  {
    id: 'pkg-prewedding-deluxe',
    name: 'Prewedding Cinematic',
    price: 3800000,
    minDp: 800000,
    duration: '6 Hours (2 Locations)',
    durationHours: 6,
    photoCount: '50 Edited High-Res Photos + All Raw Files',
    videoCount: '1 Cinematic Video Teaser (1-2 Min)',
    drone: true,
    album: '1 Magnetic Album 20x30cm',
    cetak: '2 Cetak Frame 12R (30x40cm)',
    bonus: 'Free Wardrobe Consult + Props Styling',
    coverUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    active: true,
    category: 'Prewedding',
    description: 'Sesi prewedding elegan outdoor/indoor dengan konsep storytelling masa kini.'
  },
  {
    id: 'pkg-graduation-premium',
    name: 'Graduation Studio & Outdoor',
    price: 1350000,
    minDp: 350000,
    duration: '2 Hours Session',
    durationHours: 2,
    photoCount: '30 Edited Photos + All Softcopy Google Drive',
    videoCount: 'Short Reels Video 30 Secs',
    drone: false,
    album: 'Softcover Magazine Photo Book',
    cetak: '1 Frame Minimalist 10R + 2 Cetak 4R',
    bonus: 'Free Family Group Photos (Max 5 Persons)',
    coverUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    active: true,
    category: 'Graduation',
    description: 'Momen wisuda berkesan bersama keluarga dan sahabat dengan lighting profesional.'
  },
  {
    id: 'pkg-family-warm',
    name: 'Family & Birthday Celebration',
    price: 2200000,
    minDp: 500000,
    duration: '3 Hours Session',
    durationHours: 3,
    photoCount: '40 Edited Photos + All Softcopy',
    videoCount: 'Highlight Video 1 Min',
    drone: false,
    album: '1 Compact Album 15x20cm',
    cetak: '1 Frame Canvas 30x40cm',
    bonus: 'Free Mini Photo Grid Canvas',
    coverUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
    active: true,
    category: 'Family',
    description: 'Kehangatan keluarga dan keseruan ulang tahun diabadikan dengan senyuman alami.'
  },
  {
    id: 'pkg-product-commercial',
    name: 'Product & Brand Commercial',
    price: 4500000,
    minDp: 1000000,
    duration: 'Full Day Commercial Studio Session',
    durationHours: 8,
    photoCount: '40 High-End Retouched Commercial Photos',
    videoCount: '2 Reels Commercial Video Ads (4K)',
    drone: false,
    album: 'Digital Asset Kit & Cloud Folder',
    cetak: 'Commercial Usage License Certificate',
    bonus: 'Props & Moodboard Concept Design',
    coverUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    active: true,
    category: 'Product',
    description: 'Foto dan video produk tingkat komersial premium untuk meningkatkan daya tarik brand Anda.'
  }
];

export const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'port-1',
    title: 'The Eternal Vows of Kevin & Amanda',
    category: 'Wedding',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    createdAt: '2026-06-12'
  },
  {
    id: 'port-2',
    title: 'Romantic Sunset Prewedding in Bali',
    category: 'Prewedding',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    createdAt: '2026-05-20'
  },
  {
    id: 'port-3',
    title: 'UI Graduation Day Excellence',
    category: 'Graduation',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    createdAt: '2026-07-01'
  },
  {
    id: 'port-4',
    title: 'Warm Harmony Family Session',
    category: 'Family',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    createdAt: '2026-04-15'
  },
  {
    id: 'port-5',
    title: 'Luxury Perfume Commercial Look',
    category: 'Product',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    createdAt: '2026-06-28'
  },
  {
    id: 'port-6',
    title: 'Tech Summit Corporate Gathering',
    category: 'Corporate',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    featured: false,
    createdAt: '2026-03-10'
  },
  {
    id: 'port-7',
    title: 'Royal Javanese Traditional Wedding',
    category: 'Wedding',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    featured: false,
    createdAt: '2026-07-18'
  },
  {
    id: 'port-8',
    title: 'Forest Prewedding Concept',
    category: 'Prewedding',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1200&q=80',
    featured: false,
    createdAt: '2026-07-22'
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    bookingId: 'bkg-demo-1',
    customerId: 'cust-1',
    customerName: 'Bagas & Sarah',
    customerPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    comment: 'Hasil foto wedding kami benar-benar luar biasa! Tim HadsProject sangat ramah, profesional, dan pintar mengarahkan gaya. Hasil videonya bikin terharu saat ditonton ulang.',
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    eventType: 'Wedding',
    createdAt: '2026-07-10',
    approved: true
  },
  {
    id: 'rev-2',
    bookingId: 'bkg-demo-2',
    customerId: 'cust-2',
    customerName: 'Dina Wijaya',
    customerPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    comment: 'Wisuda jadi makin memorable dengan HadsProject. Lighting-nya bagus banget, proses editing cepat, dan albumnya kualitas emas premium!',
    photoUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    eventType: 'Graduation',
    createdAt: '2026-07-15',
    approved: true
  },
  {
    id: 'rev-3',
    bookingId: 'bkg-demo-3',
    customerId: 'cust-3',
    customerName: 'Rizky & Maya',
    customerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    comment: 'Sesi prewedding outdoor di Bromo sangat memuaskan. Timnya full power walau cuaca dingin. Hasil foto dan video drone di atas ekspektasi kami!',
    photoUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    eventType: 'Prewedding',
    createdAt: '2026-06-25',
    approved: true
  }
];

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  qrisUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126580014ID.LINKAJA.WWW0118936009110000000000021520080210030310253033605802ID5911HadsProject6013Jakarta61051211062070703A016304C742',
  bankName: 'Bank Mandiri',
  bankAccount: '1330025480476',
  accountHolder: 'Ahmad Hudatul Jami',
  whatsappNumber: '085284206829',
  studioAddress: 'Jakarta Indonesia',
  studioEmail: 'creative.hadsproject@gmail.com',
  googleDriveFolderUrl: 'https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing'
};
