import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, CreditCard, MessageSquare, Bell, Star, FileText, Download, Copy, CheckCircle2, AlertCircle, Send, Image as ImageIcon, Paperclip, Clock, MapPin, Camera, Sparkles, User, ChevronRight, X, ExternalLink } from 'lucide-react';
import { Booking, UserProfile, StudioSettings, ChatMessage, AppNotification, Review } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from '../lib/firebase';
import { generateInvoicePDF } from '../lib/generateInvoice';
import { sendToGoogleSheets } from '../lib/googleSheets';

interface CustomerDashboardProps {
  currentUser: UserProfile;
  settings?: StudioSettings;
  onOpenBooking: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  currentUser,
  settings,
  onOpenBooking
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'payment' | 'chat' | 'notifications' | 'review'>('overview');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Transfer Proof Form States
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [senderName, setSenderName] = useState(currentUser.displayName || '');
  const [senderBank, setSenderBank] = useState('BCA');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [nominal, setNominal] = useState<number>(0);
  const [refNumber, setRefNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Realtime Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [chatMediaUrl, setChatMediaUrl] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Review Form States
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Calendar View States
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Listen to Customer Bookings
  useEffect(() => {
    if (!currentUser.uid && !currentUser.email) return;

    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bList: Booking[] = [];
      const userUid = currentUser.uid;
      const userEmail = (currentUser.email || '').toLowerCase().trim();

      snapshot.forEach((docSnap) => {
        const b = { ...docSnap.data() as Booking, id: docSnap.id };
        const matchUid = b.customerId === userUid;
        const matchEmail = !!userEmail && !!b.customerEmail && b.customerEmail.toLowerCase().trim() === userEmail;

        if (matchUid || matchEmail) {
          bList.push(b);
        }
      });

      // Sort by date ascending
      bList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setBookings(bList);
      if (bList.length > 0 && !selectedBooking) {
        setSelectedBooking(bList[0]);
        setNominal(bList[0].status.includes('DP') || bList[0].status === 'Menunggu DP' ? bList[0].dpAmount : bList[0].remainingAmount);
      }
    });

    return () => unsubscribe();
  }, [currentUser.uid, currentUser.email]);

  // Listen to Chat Messages
  useEffect(() => {
    if (!currentUser.uid) return;

    const q = query(
      collection(db, 'chats'),
      where('customerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mList: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        mList.push({ ...docSnap.data() as ChatMessage, id: docSnap.id });
      });
      mList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(mList);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  // Listen to Notifications
  useEffect(() => {
    if (!currentUser.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nList: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        nList.push({ ...docSnap.data() as AppNotification, id: docSnap.id });
      });
      nList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(nList);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Copy Bank Account Number
  const handleCopyAccount = () => {
    const accNum = settings?.bankAccount || '8835091244';
    navigator.clipboard.writeText(accNum);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  // Handle File Upload to Base64 Image Data URL
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Payment Proof (DP or Pelunasan)
  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setPaymentSubmitting(true);
    try {
      const isPelunasanMode =
        selectedBooking.status === 'DP Diverifikasi' ||
        selectedBooking.status === 'DP Lunas' ||
        selectedBooking.status === 'Menunggu Pelunasan' ||
        selectedBooking.status === 'Menunggu Verifikasi Pelunasan';

      const proofObj = {
        senderName,
        bankName: senderBank,
        transferDate,
        nominal,
        refNumber,
        proofUrl: proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        uploadedAt: new Date().toISOString()
      };

      const newStatus = isPelunasanMode ? 'Menunggu Verifikasi Pelunasan' : 'Menunggu Verifikasi DP';

      const updatedData: Partial<Booking> = {
        status: newStatus as any,
        ...(isPelunasanMode
          ? { fullPaymentProof: proofObj }
          : { paymentProof: proofObj })
      };

      await updateDoc(doc(db, 'bookings', selectedBooking.id), updatedData);

      const updatedFullBooking = {
        ...selectedBooking,
        ...updatedData
      };

      if (settings?.googleSheetsAppScriptUrl) {
        sendToGoogleSheets(settings.googleSheetsAppScriptUrl, 'sync_booking', updatedFullBooking);
      }

      // Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: isPelunasanMode ? 'Bukti Transfer Pelunasan Diterima' : 'Bukti Transfer DP Diterima',
        message: `${currentUser.displayName} telah mengunggah bukti transfer ${isPelunasanMode ? 'Pelunasan' : 'DP'} Rp ${nominal.toLocaleString('id-ID')} untuk booking ${selectedBooking.packageName}.`,
        type: 'payment',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: selectedBooking.id
      });

      setShowTransferForm(false);
      alert(`Bukti transfer ${isPelunasanMode ? 'Pelunasan' : 'DP'} berhasil dikirim! Admin HadsProject akan melakukan verifikasi.`);
    } catch (err) {
      console.error('Payment error:', err);
      alert('Gagal mengirim bukti transfer.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() && !chatMediaUrl) return;

    try {
      const msg: Omit<ChatMessage, 'id'> = {
        customerId: currentUser.uid,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Customer',
        senderRole: 'customer',
        text: newMessageText,
        mediaUrl: chatMediaUrl || undefined,
        mediaType: chatMediaUrl ? 'image' : undefined,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'chats'), msg);
      setNewMessageText('');
      setChatMediaUrl('');
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      const newReview: Omit<Review, 'id'> = {
        bookingId: selectedBooking.id,
        customerId: currentUser.uid,
        customerName: currentUser.displayName || 'Customer',
        customerPhoto: currentUser.photoURL,
        rating: reviewRating,
        comment: reviewComment,
        photoUrl: reviewPhotoUrl || undefined,
        eventType: selectedBooking.eventType,
        createdAt: new Date().toISOString(),
        approved: true
      };

      await addDoc(collection(db, 'reviews'), newReview);
      setReviewSubmitted(true);
    } catch (err) {
      console.error('Review submit error:', err);
    }
  };

  const nextBooking = bookings.find((b) => b.status !== 'Dibatalkan' && b.status !== 'Selesai') || bookings[0];

  return (
    <div className="min-h-screen bg-black text-neutral-100 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 border-b border-amber-500/20 mb-8 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Portal Pelanggan</span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-amber-200">
            Selamat Datang, {currentUser.displayName || 'Customer'}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Kelola jadwal sesi foto, konfirmasi DP, unduh invoice, dan berdiskusi dengan tim HadsProject
          </p>
        </div>

        <button
          onClick={onOpenBooking}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center space-x-2"
        >
          <Camera className="w-4 h-4" />
          <span>Buat Reservasi Baru</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 pb-6 border-b border-white/10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'overview'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'calendar'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Kalender Booking</span>
        </button>

        <button
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'payment'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Menu Payment & DP</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat Admin</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'notifications'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifikasi & Reminder</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'review'
              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Ulasan & Testimoni</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="mt-8">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-xs text-neutral-400">Total Booking Saya</span>
                <p className="text-3xl font-bold font-serif text-amber-300">{bookings.length}</p>
              </div>

              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-xs text-neutral-400">Booking Aktif</span>
                <p className="text-3xl font-bold font-serif text-emerald-400">
                  {bookings.filter((b) => b.status !== 'Selesai' && b.status !== 'Dibatalkan').length}
                </p>
              </div>

              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-xs text-neutral-400">Status Pembayaran Terakhir</span>
                <p className="text-lg font-bold text-amber-400">
                  {nextBooking ? nextBooking.status : 'Belum ada booking'}
                </p>
              </div>
            </div>

            {/* Next Booking Highlight Card */}
            {nextBooking ? (
              <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-amber-500/40 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-amber-400 pointer-events-none">
                  <Camera className="w-40 h-40" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-neutral-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Jadwal Sesi Berikutnya</span>
                      <h3 className="text-xl font-bold text-amber-100 font-serif">{nextBooking.packageName}</h3>
                    </div>
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      STATUS: {nextBooking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-300">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4 text-amber-400" />
                      <span>Tanggal: <strong>{nextBooking.date}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Jam Slot: <strong>{nextBooking.timeSlot} WIB</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <span className="truncate">Lokasi: {nextBooking.location}</span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Total Paket: Rp {nextBooking.totalPrice.toLocaleString('id-ID')}</span>
                      <span className="text-amber-300 font-bold block">
                        DP Minimal: Rp {nextBooking.dpAmount.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(nextBooking);
                          setActiveTab('payment');
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition-colors"
                      >
                        Pembayaran DP & QRIS
                      </button>

                      <button
                        onClick={() => generateInvoicePDF(nextBooking, settings)}
                        className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-300 hover:border-amber-400 transition-colors"
                        title="Unduh Invoice PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                <p className="text-sm text-neutral-400 mb-4">Anda belum memiliki jadwal booking terdaftar.</p>
                <button
                  onClick={onOpenBooking}
                  className="px-6 py-2.5 rounded-full bg-amber-400 text-neutral-950 font-bold text-xs"
                >
                  Pilih Paket & Booking Sekarang
                </button>
              </div>
            )}

            {/* All Bookings Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Riwayat Booking Saya</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">No. Invoice</th>
                      <th className="p-3">Paket</th>
                      <th className="p-3">Tanggal & Jam</th>
                      <th className="p-3">Total Harga</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-400">{b.invoiceNumber || 'INV-HADS-' + b.id.slice(0, 6)}</td>
                        <td className="p-3 font-semibold text-neutral-200">{b.packageName}</td>
                        <td className="p-3">{b.date} ({b.timeSlot})</td>
                        <td className="p-3 font-bold">Rp {b.totalPrice.toLocaleString('id-ID')}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            b.status === 'DP Lunas' || b.status === 'Selesai'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 flex items-center space-x-2">
                          <button
                            onClick={() => generateInvoicePDF(b, settings)}
                            className="p-1.5 rounded-lg bg-neutral-950 text-amber-300 hover:text-amber-200"
                            title="Unduh Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setActiveTab('payment');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-bold text-[10px]"
                          >
                            Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. KALENDER BOOKING TAB */}
        {activeTab === 'calendar' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold font-serif text-amber-200">Kalender Interaktif Google-Style</h3>
                <p className="text-xs text-neutral-400">Tinjau ketersediaan slot tanggal dan jam sesi foto HadsProject</p>
              </div>
              <input
                type="date"
                value={selectedCalendarDate}
                onChange={(e) => setSelectedCalendarDate(e.target.value)}
                className="px-3 py-2 bg-neutral-950 border border-amber-500/40 rounded-xl text-xs text-amber-300"
              />
            </div>

            {/* Time Slot Availability Checker */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-300 block">
                Ketersediaan Slot Jam Pada Tanggal: {selectedCalendarDate}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {['08.00 - 12.00', '12.00 - 16.00', '16.00 - 20.00', '20.00 - 24.00', 'Full Day (08.00 - 24.00)'].map((slot) => {
                  const bkgOnDate = bookings.find((b) => {
                    if (b.date !== selectedCalendarDate) return false;
                    if (b.timeSlot === slot) return true;
                    if (b.timeSlot?.toLowerCase().includes('full day')) return true;
                    return false;
                  });
                  const isFullDay = bkgOnDate?.timeSlot?.toLowerCase().includes('full day');

                  return (
                    <div
                      key={slot}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center ${
                        bkgOnDate
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">{slot}</span>
                      <span className="text-[10px] uppercase tracking-wider mt-1 font-semibold">
                        {bkgOnDate
                          ? isFullDay
                            ? 'Full Day Booked'
                            : `Terisi (${bkgOnDate.packageName})`
                          : 'Tersedia'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. MENU PAYMENT TAB */}
        {activeTab === 'payment' && (
          <div className="space-y-8">
            
            {/* Booking Selector */}
            {bookings.length > 1 && (
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center space-x-3 text-xs">
                <span className="text-neutral-400">Pilih Booking untuk Dikonfirmasi:</span>
                <select
                  value={selectedBooking?.id || ''}
                  onChange={(e) => {
                    const found = bookings.find((b) => b.id === e.target.value);
                    if (found) {
                      setSelectedBooking(found);
                      setNominal(found.dpAmount);
                    }
                  }}
                  className="px-3 py-1.5 bg-neutral-950 border border-amber-500/40 rounded-xl text-amber-300 font-bold"
                >
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.packageName} — {b.date} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedBooking ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Card: Payment Financial Summary & BCA Account */}
                <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 space-y-6 shadow-xl">
                  <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Rincian Pembayaran</span>
                      <h3 className="text-lg font-bold text-neutral-100 font-serif">{selectedBooking.packageName}</h3>
                    </div>
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      {selectedBooking.status}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Harga Paket:</span>
                      <span className="font-bold text-neutral-200">Rp {selectedBooking.totalPrice.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-neutral-400">Down Payment Minimal (DP):</span>
                      <span className="font-bold text-amber-400 text-sm">Rp {selectedBooking.dpAmount.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-neutral-800">
                      <span className="text-neutral-400">Sisa Pembayaran Pelunasan:</span>
                      <span className="font-bold text-red-400">Rp {selectedBooking.remainingAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Mandiri Bank Box */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#D4AF37]">Rekening Resmi Studio ({settings?.bankName || 'Bank Mandiri'})</span>
                      {copyToast && (
                        <span className="text-[10px] text-emerald-400 font-bold animate-pulse">✓ Rekening Disalin!</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Nomor Rekening {settings?.bankName || 'Bank Mandiri'}</span>
                        <span className="font-mono font-bold text-base text-[#D4AF37]">{settings?.bankAccount || '1330025480476'}</span>
                        <span className="block text-[11px] text-neutral-300">a.n {settings?.accountHolder || 'Ahmad Hudatul Jami'}</span>
                      </div>

                      <button
                        onClick={handleCopyAccount}
                        className="px-3 py-2 rounded-xl bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 text-xs font-bold flex items-center space-x-1 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Rekening</span>
                      </button>
                    </div>
                  </div>

                  {/* Google Drive Upload Storage Card */}
                  <div className="p-4 bg-gradient-to-r from-blue-950/50 to-neutral-950 border border-blue-500/30 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-300">Google Drive Studio Storage</span>
                      <a
                        href={settings?.googleDriveFolderUrl || 'https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase rounded-lg flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Drive Studio</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Anda dapat mengunggah struk bukti transfer atau file ke Folder Google Drive HadsProject di atas, lalu tempelkan link berkasnya ke form konfirmasi.
                    </p>
                  </div>

                  {/* Google Drive Result Photos Link (If Admin attached it) */}
                  {selectedBooking.googleDriveResultUrl && (
                    <div className="p-4 bg-gradient-to-r from-emerald-950 to-neutral-950 border border-emerald-500/50 rounded-2xl space-y-3">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Link Hasil Foto & Video Google Drive</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        Admin telah mengunggah hasil foto/video untuk pesanan ini ke Google Drive.
                      </p>
                      <a
                        href={selectedBooking.googleDriveResultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Buka & Unduh Hasil Foto di Google Drive</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Card: Transfer Confirmation Form (DP & Pelunasan) */}
                <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="pb-3 border-b border-neutral-800">
                    <h3 className="text-lg font-bold font-serif text-amber-200">
                      {selectedBooking.status === 'DP Diverifikasi' || selectedBooking.status === 'DP Lunas' || selectedBooking.status === 'Menunggu Pelunasan' || selectedBooking.status === 'Menunggu Verifikasi Pelunasan'
                        ? 'Konfirmasi Pembayaran Pelunasan'
                        : 'Konfirmasi Pembayaran DP'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {selectedBooking.status === 'DP Diverifikasi' || selectedBooking.status === 'DP Lunas' || selectedBooking.status === 'Menunggu Pelunasan'
                        ? `DP telah dikonfirmasi. Sisa pembayaran pelunasan: Rp ${selectedBooking.remainingAmount.toLocaleString('id-ID')}`
                        : `Minimal pembayaran DP: Rp ${selectedBooking.dpAmount.toLocaleString('id-ID')}`}
                    </p>
                  </div>

                  {(selectedBooking.status === 'Menunggu Verifikasi' || selectedBooking.status === 'Menunggu Verifikasi DP') && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 space-y-1">
                      <p className="font-bold">✓ Bukti Transfer DP Dalam Proses Verifikasi Admin</p>
                      <p className="text-neutral-400 text-[11px]">
                        Admin HadsProject sedang memeriksa transfer DP Anda. Status akan diperbarui begitu diverifikasi.
                      </p>
                    </div>
                  )}

                  {selectedBooking.status === 'Menunggu Verifikasi Pelunasan' && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs text-blue-300 space-y-1">
                      <p className="font-bold">✓ Bukti Transfer Pelunasan Dalam Verifikasi Admin</p>
                      <p className="text-neutral-400 text-[11px]">
                        Admin HadsProject sedang memeriksa bukti pelunasan Anda. Status booking akan berubah menjadi LUNAS setelah diverifikasi.
                      </p>
                    </div>
                  )}

                  {selectedBooking.status === 'Lunas' || selectedBooking.status === 'Selesai' ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 space-y-2">
                      <div className="flex items-center space-x-2 font-bold text-sm text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Pembayaran 100% LUNAS</span>
                      </div>
                      <p className="text-neutral-300 text-[11px]">
                        Terima kasih! Seluruh pembayaran untuk paket <strong>{selectedBooking.packageName}</strong> telah LUNAS.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitPaymentProof} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-neutral-400 mb-1">Nama Pengirim Sesuai Rekening</label>
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Nama Pengirim"
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-neutral-400 mb-1">Bank Pengirim</label>
                          <input
                            type="text"
                            required
                            value={senderBank}
                            onChange={(e) => setSenderBank(e.target.value)}
                            placeholder="Mandiri / BCA / GoPay"
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-neutral-400 mb-1">Tanggal Transfer</label>
                          <input
                            type="date"
                            required
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-300 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-neutral-400 mb-1">Nominal Ditransfer (Rp)</label>
                          <input
                            type="number"
                            required
                            value={nominal}
                            onChange={(e) => setNominal(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400 font-bold text-amber-300"
                          />
                        </div>

                        <div>
                          <label className="block text-neutral-400 mb-1">Nomor Referensi Transfer</label>
                          <input
                            type="text"
                            required
                            value={refNumber}
                            onChange={(e) => setRefNumber(e.target.value)}
                            placeholder="Ref / Struk No."
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <label className="block text-amber-300 font-bold text-xs flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-amber-400" />
                            <span>Unggah Bukti Transfer</span>
                          </label>
                          <a
                            href={settings?.googleDriveFolderUrl || 'https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Drive Studio</span>
                          </a>
                        </div>

                        {/* File Upload Selector */}
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            Metode 1: Pilih File Foto Struk Dari Perangkat (HP / Laptop)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofFileChange}
                            className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-neutral-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer bg-neutral-900 rounded-xl border border-neutral-800 p-1"
                          />
                        </div>

                        {/* Google Drive URL Input */}
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            Metode 2: Atau Tempelkan Link Google Drive / Image URL Struk
                          </label>
                          <input
                            type="url"
                            value={proofUrl}
                            onChange={(e) => setProofUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/... atau https://..."
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>

                        {/* Proof Image Thumbnail Preview */}
                        {proofUrl && (
                          <div className="p-2 bg-neutral-900 border border-amber-500/30 rounded-xl space-y-1">
                            <span className="text-[10px] text-emerald-400 font-bold block">✓ Bukti Transfer Siap Dikirim:</span>
                            {proofUrl.startsWith('data:image') || proofUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <img
                                src={proofUrl}
                                alt="Pratinjau Bukti Transfer"
                                className="w-full h-32 object-contain rounded-lg border border-neutral-800 bg-black/60"
                              />
                            ) : (
                              <p className="text-[11px] font-mono text-blue-300 truncate p-1 bg-black rounded">
                                🔗 {proofUrl}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={paymentSubmitting}
                        className="w-full py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-neutral-950 hover:from-amber-400 hover:to-amber-200 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                      >
                        {paymentSubmitting ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                      </button>
                    </form>
                  )}
                </div>

              </div>
            ) : (
              <p className="text-xs text-neutral-400">Pilih booking terlebih dahulu untuk melihat informasi pembayaran.</p>
            )}
          </div>
        )}

        {/* 4. REALTIME CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
            
            {/* Chat Top Bar */}
            <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-neutral-950 flex items-center justify-center font-bold">
                  H
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">Admin HadsProject Photography</h3>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online Realtime
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-950/60">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 text-xs">
                  Belum ada pesan. Ketik pesan Anda di bawah untuk mulai berdiskusi dengan Admin HadsProject.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderRole === 'customer';
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs sm:max-w-md rounded-2xl p-3 text-xs space-y-1 shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 rounded-br-none'
                          : 'bg-neutral-800 text-neutral-100 rounded-bl-none border border-neutral-700'
                      }`}>
                        <span className={`text-[10px] font-bold block ${isMe ? 'text-neutral-900' : 'text-amber-400'}`}>
                          {m.senderName}
                        </span>

                        {m.text && <p className="leading-relaxed">{m.text}</p>}

                        {m.mediaUrl && (
                          <img
                            src={m.mediaUrl}
                            alt="Chat Attachment"
                            className="w-full max-h-48 object-cover rounded-xl mt-2 border border-black/20"
                          />
                        )}

                        <div className="flex justify-end items-center space-x-1 pt-1 text-[9px] opacity-75">
                          <span>{new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && <span>{m.isRead ? '✓✓ Read' : '✓ Sent'}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-2">
              {chatMediaUrl && (
                <div className="flex items-center space-x-2 text-xs text-amber-300 bg-neutral-900 p-2 rounded-xl">
                  <ImageIcon className="w-4 h-4" />
                  <span className="truncate flex-1">Attachment Ready</span>
                  <button type="button" onClick={() => setChatMediaUrl('')} className="text-red-400 font-bold">✕</button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Ketik pesan untuk Admin HadsProject..."
                  className="flex-1 px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-full text-neutral-200 focus:outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Masukkan URL Gambar/File:');
                    if (url) setChatMediaUrl(url);
                  }}
                  className="p-2.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
                  title="Lampirkan Gambar"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  className="p-2.5 rounded-full bg-amber-400 text-neutral-950 hover:bg-amber-300 font-bold transition-colors shadow-md shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

          </div>
        )}

        {/* 5. NOTIFIKASI & REMINDER TAB */}
        {activeTab === 'notifications' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Notifikasi Auto-Reminder</h3>
            
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8">Belum ada notifikasi atau pengingat jadwal.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-start space-x-3"
                  >
                    <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">{n.title}</h4>
                      <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-neutral-500 block mt-2">{n.createdAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. GIVE REVIEW TAB */}
        {activeTab === 'review' && (
          <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 max-w-xl mx-auto space-y-6 shadow-xl">
            <div className="text-center space-y-2 pb-4 border-b border-neutral-800">
              <h3 className="text-xl font-bold font-serif text-amber-200">Berikan Ulasan Pasca Sesi Foto</h3>
              <p className="text-xs text-neutral-400">
                Ulasan Anda sangat berarti untuk kemajuan kualitas layanan HadsProject
              </p>
            </div>

            {reviewSubmitted ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-amber-300">Terima Kasih Atas Ulasan Anda!</h4>
                <p className="text-xs text-neutral-400">Ulasan Anda telah tersimpan dan ditampilkan pada portofolio HadsProject.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-2 text-center">Beri Rating Bintang</label>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star className={`w-8 h-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Komentar & Pengalaman Anda</label>
                  <textarea
                    rows={4}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tuliskan kepuasan Anda mengenai tim, lighting, dan hasil foto HadsProject..."
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">URL Foto Hasil / Dokumentasi (Opsional)</label>
                  <input
                    type="url"
                    value={reviewPhotoUrl}
                    onChange={(e) => setReviewPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-neutral-950 hover:from-amber-400 hover:to-amber-200 transition-all shadow-md shadow-amber-500/20"
                >
                  Kirim Ulasan & Rating
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
