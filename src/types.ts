export type Role = 'customer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: Role;
  createdAt: string;
}

export interface PackageItem {
  id: string;
  name: string;
  price: number;
  minDp: number;
  duration: string;
  durationHours?: number;
  photoCount: string;
  videoCount: string;
  drone: boolean;
  album: string;
  cetak: string;
  bonus: string;
  coverUrl: string;
  active: boolean;
  category: EventType;
  description?: string;
}

export type EventType =
  | 'Wedding'
  | 'Prewedding'
  | 'Graduation'
  | 'Birthday'
  | 'Family'
  | 'Product'
  | 'Event'
  | 'Lainnya';

export type BookingStatus =
  | 'Menunggu DP'
  | 'Menunggu Verifikasi'
  | 'DP Diverifikasi'
  | 'DP Lunas'
  | 'Sedang Berlangsung'
  | 'Selesai'
  | 'Dibatalkan';

export interface PaymentProof {
  senderName: string;
  bankName: string;
  transferDate: string;
  nominal: number;
  refNumber: string;
  proofUrl?: string;
  uploadedAt: string;
  rejectionReason?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  packageId: string;
  packageName: string;
  eventType: EventType;
  location: string;
  date: string; // YYYY-MM-DD
  timeSlot: '09.00' | '11.00' | '13.00' | '15.00' | '17.00';
  notes?: string;
  totalPrice: number;
  dpAmount: number;
  remainingAmount: number;
  status: BookingStatus;
  paymentProof?: PaymentProof;
  invoiceNumber: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BlockedSlot {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot?: '09.00' | '11.00' | '13.00' | '15.00' | '17.00' | 'ALL';
  reason: string;
  isFullDay: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: EventType | 'Corporate';
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  featured?: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhoto?: string;
  rating: number; // 1 - 5
  comment: string;
  photoUrl?: string;
  eventType?: EventType;
  createdAt: string;
  approved: boolean;
}

export interface ChatMessage {
  id: string;
  customerId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file';
  fileName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'chat' | 'reminder';
  isRead: boolean;
  createdAt: string;
  bookingId?: string;
}

export interface StudioSettings {
  qrisUrl: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  whatsappNumber: string;
  studioAddress: string;
  studioEmail: string;
  googleDriveFolderUrl?: string;
  googleSheetsAppScriptUrl?: string;
  adminUsername?: string;
  adminPassword?: string;
}
