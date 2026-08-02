import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Calendar, DollarSign, Clock, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Plus, Edit, Trash, Download, Filter, Search, Eye, Settings, Image as ImageIcon, Send, RefreshCw, X, Layers, ExternalLink, Folder } from 'lucide-react';
import { Booking, PackageItem, PortfolioItem, Review, StudioSettings, BlockedSlot, ChatMessage, UserProfile } from '../types';
import { db, collection, onSnapshot, updateDoc, doc, addDoc, deleteDoc, setDoc } from '../lib/firebase';
import { generateInvoicePDF } from '../lib/generateInvoice';

interface AdminDashboardProps {
  currentUser: UserProfile;
  packages: PackageItem[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  settings?: StudioSettings;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  packages,
  portfolio,
  reviews,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'bookings' | 'schedule' | 'packages' | 'portfolio' | 'chat' | 'settings'>('summary');
  
  // Realtime Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  
  // Filter States for Kelola Booking
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterEventType, setFilterEventType] = useState<string>('ALL');
  
  // Rejection Reason Modal
  const [rejectionModalBooking, setRejectionModalBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Reschedule Modal
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<Booking | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState<'09.00' | '11.00' | '13.00' | '15.00' | '17.00'>('09.00');

  // Block Schedule Form
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState<'09.00' | '11.00' | '13.00' | '15.00' | '17.00' | 'ALL'>('ALL');
  const [blockReason, setBlockReason] = useState('');

  // Package Form Modal
  const [editingPackage, setEditingPackage] = useState<Partial<PackageItem> | null>(null);

  // Portfolio Form Modal
  const [editingPortfolio, setEditingPortfolio] = useState<Partial<PortfolioItem> | null>(null);

  // Admin Chat States
  const [chatThreads, setChatThreads] = useState<{ customerId: string; customerName: string; messages: ChatMessage[] }[]>([]);
  const [selectedChatCustomerId, setSelectedChatCustomerId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Settings State
  const [editBankName, setEditBankName] = useState(settings?.bankName || 'Bank Mandiri');
  const [editBankAcc, setEditBankAcc] = useState(settings?.bankAccount || '1330025480476');
  const [editBankHolder, setEditBankHolder] = useState(settings?.accountHolder || 'Ahmad Hudatul Jami');
  const [editQrisUrl, setEditQrisUrl] = useState(settings?.qrisUrl || '');
  const [editWaNum, setEditWaNum] = useState(settings?.whatsappNumber || '085284206829');
  const [editAddress, setEditAddress] = useState(settings?.studioAddress || 'Jakarta Indonesia');
  const [editEmail, setEditEmail] = useState(settings?.studioEmail || 'creative.hadsproject@gmail.com');
  const [editDriveUrl, setEditDriveUrl] = useState(settings?.googleDriveFolderUrl || 'https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing');

  useEffect(() => {
    if (settings) {
      setEditBankName(settings.bankName || 'Bank Mandiri');
      setEditBankAcc(settings.bankAccount || '1330025480476');
      setEditBankHolder(settings.accountHolder || 'Ahmad Hudatul Jami');
      setEditQrisUrl(settings.qrisUrl || '');
      setEditWaNum(settings.whatsappNumber || '085284206829');
      setEditAddress(settings.studioAddress || 'Jakarta Indonesia');
      setEditEmail(settings.studioEmail || 'creative.hadsproject@gmail.com');
      setEditDriveUrl(settings.googleDriveFolderUrl || 'https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing');
    }
  }, [settings]);

  // Realtime Listeners for Admin
  useEffect(() => {
    // Bookings Listener
    const unSubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      const list: Booking[] = [];
      snap.forEach((d) => list.push({ ...d.data() as Booking, id: d.id }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(list);
    });

    // Blocked Slots Listener
    const unSubBlocked = onSnapshot(collection(db, 'blockedSlots'), (snap) => {
      const list: BlockedSlot[] = [];
      snap.forEach((d) => list.push({ ...d.data() as BlockedSlot, id: d.id }));
      setBlockedSlots(list);
    });

    // Chats Listener
    const unSubChats = onSnapshot(collection(db, 'chats'), (snap) => {
      const map: { [cid: string]: ChatMessage[] } = {};
      snap.forEach((d) => {
        const msg = { ...d.data() as ChatMessage, id: d.id };
        if (!map[msg.customerId]) map[msg.customerId] = [];
        map[msg.customerId].push(msg);
      });

      const threads = Object.keys(map).map((cid) => {
        const msgs = map[cid].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const customerName = msgs[0]?.senderRole === 'customer' ? msgs[0].senderName : 'Customer';
        return { customerId: cid, customerName, messages: msgs };
      });

      setChatThreads(threads);
      if (threads.length > 0 && !selectedChatCustomerId) {
        setSelectedChatCustomerId(threads[0].customerId);
      }
    });

    return () => {
      unSubBookings();
      unSubBlocked();
      unSubChats();
    };
  }, []);

  // Compute Summary Metrics
  const totalBookingsCount = bookings.length;
  const totalRevenue = bookings
    .filter((b) => b.status === 'DP Lunas' || b.status === 'DP Diverifikasi' || b.status === 'Selesai')
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const thisMonthStr = new Date().toISOString().slice(0, 7);
  const bookingsThisMonth = bookings.filter((b) => b.date && b.date.startsWith(thisMonthStr)).length;
  const pendingDpCount = bookings.filter((b) => b.status === 'Menunggu DP' || b.status === 'Menunggu Verifikasi').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const bookingsToday = bookings.filter((b) => b.date === todayStr).length;

  // Filtered Bookings for Table
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.customerName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      b.packageName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      b.invoiceNumber.toLowerCase().includes(filterSearch.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
    const matchesEvent = filterEventType === 'ALL' || b.eventType === filterEventType;

    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Approve DP
  const handleApproveDp = async (booking: Booking) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'DP Lunas'
      });

      // Send notification to customer
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'DP Berhasil Diverifikasi! (DP Lunas)',
        message: `Pembayaran DP Anda untuk paket ${booking.packageName} telah disetujui. Jadwal tanggal ${booking.date} jam ${booking.timeSlot} terverifikasi.`,
        type: 'payment',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      alert(`Booking ${booking.invoiceNumber} berhasil disetujui (DP Lunas).`);
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  // Reject DP
  const handleConfirmRejectDp = async () => {
    if (!rejectionModalBooking || !rejectionReason.trim()) return;

    try {
      await updateDoc(doc(db, 'bookings', rejectionModalBooking.id), {
        status: 'Menunggu DP',
        'paymentProof.rejectionReason': rejectionReason
      });

      await addDoc(collection(db, 'notifications'), {
        userId: rejectionModalBooking.customerId,
        title: 'Verifikasi DP Ditolak',
        message: `Bukti transfer DP Anda belum sesuai. Alasan: ${rejectionReason}. Silakan unggah kembali bukti transfer yang valid.`,
        type: 'payment',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: rejectionModalBooking.id
      });

      setRejectionModalBooking(null);
      setRejectionReason('');
      alert('Penolakan verifikasi berhasil dikirim ke pelanggan.');
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  // Reschedule Booking
  const handleConfirmReschedule = async () => {
    if (!rescheduleModalBooking || !newRescheduleDate) return;

    try {
      await updateDoc(doc(db, 'bookings', rescheduleModalBooking.id), {
        date: newRescheduleDate,
        timeSlot: newRescheduleTime
      });

      await addDoc(collection(db, 'notifications'), {
        userId: rescheduleModalBooking.customerId,
        title: 'Jadwal Booking Dipindahkan',
        message: `Jadwal sesi foto ${rescheduleModalBooking.packageName} telah dipindahkan ke tanggal ${newRescheduleDate} jam ${newRescheduleTime} WIB.`,
        type: 'booking',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: rescheduleModalBooking.id
      });

      setRescheduleModalBooking(null);
      alert('Jadwal berhasil diperbarui.');
    } catch (err) {
      console.error('Reschedule error:', err);
    }
  };

  // Block Schedule
  const handleBlockSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;

    try {
      const newBlock: Omit<BlockedSlot, 'id'> = {
        date: blockDate,
        timeSlot: blockTime,
        reason: blockReason || 'Jadwal Penuh / Libur',
        isFullDay: blockTime === 'ALL'
      };

      await addDoc(collection(db, 'blockedSlots'), newBlock);
      setBlockDate('');
      setBlockReason('');
      alert('Tanggal/Jam berhasil diblokir.');
    } catch (err) {
      console.error('Block schedule error:', err);
    }
  };

  // Delete Blocked Slot
  const handleDeleteBlockedSlot = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blockedSlots', id));
    } catch (err) {
      console.error('Delete blocked slot error:', err);
    }
  };

  // Save Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage?.name) return;

    try {
      const pkgData = {
        name: editingPackage.name,
        price: Number(editingPackage.price || 1000000),
        minDp: Number(editingPackage.minDp || 300000),
        duration: editingPackage.duration || '2 Hours',
        photoCount: editingPackage.photoCount || '30 Photos',
        videoCount: editingPackage.videoCount || 'Teaser 1 Min',
        drone: Boolean(editingPackage.drone),
        album: editingPackage.album || 'Photo Book',
        cetak: editingPackage.cetak || 'Cetak 10R',
        bonus: editingPackage.bonus || 'Free Softcopy',
        coverUrl: editingPackage.coverUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        active: editingPackage.active !== false,
        category: editingPackage.category || 'Wedding',
        description: editingPackage.description || ''
      };

      if (editingPackage.id) {
        await updateDoc(doc(db, 'packages', editingPackage.id), pkgData);
      } else {
        await addDoc(collection(db, 'packages'), pkgData);
      }

      setEditingPackage(null);
      alert('Paket berhasil disimpan.');
    } catch (err) {
      console.error('Save package error:', err);
    }
  };

  // Save Portfolio
  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPortfolio?.title || !editingPortfolio?.mediaUrl) return;

    try {
      const itemData = {
        title: editingPortfolio.title,
        category: editingPortfolio.category || 'Wedding',
        mediaType: editingPortfolio.mediaType || 'photo',
        mediaUrl: editingPortfolio.mediaUrl,
        featured: Boolean(editingPortfolio.featured),
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (editingPortfolio.id) {
        await updateDoc(doc(db, 'portfolio', editingPortfolio.id), itemData);
      } else {
        await addDoc(collection(db, 'portfolio'), itemData);
      }

      setEditingPortfolio(null);
      alert('Portofolio berhasil disimpan.');
    } catch (err) {
      console.error('Save portfolio error:', err);
    }
  };

  // Send Admin Chat Reply
  const handleSendAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatCustomerId || !adminReplyText.trim()) return;

    try {
      const msg: Omit<ChatMessage, 'id'> = {
        customerId: selectedChatCustomerId,
        senderId: currentUser.uid,
        senderName: 'Admin HadsProject',
        senderRole: 'admin',
        text: adminReplyText,
        isRead: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'chats'), msg);
      setAdminReplyText('');
    } catch (err) {
      console.error('Admin send chat error:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        bankName: editBankName,
        bankAccount: editBankAcc,
        accountHolder: editBankHolder,
        qrisUrl: editQrisUrl,
        whatsappNumber: editWaNum,
        studioAddress: editAddress,
        studioEmail: editEmail,
        googleDriveFolderUrl: editDriveUrl
      });
      alert('Pengaturan Studio HadsProject berhasil disimpan.');
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  const currentChatThread = chatThreads.find((t) => t.customerId === selectedChatCustomerId);

  return (
    <div className="min-h-screen bg-black text-neutral-100 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Admin Header */}
      <div className="flex items-center justify-between pb-6 border-b border-amber-500/30 mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Control Panel Admin</span>
            <h1 className="text-2xl font-bold font-serif text-amber-200">Management System HadsProject</h1>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-bold">
          ADMIN AUTHORIZED
        </span>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 pb-6 border-b border-white/10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'summary' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ringkasan Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'bookings' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Kelola Booking ({pendingDpCount} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'schedule' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Kelola Jadwal & Block</span>
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'packages' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Kelola Paket</span>
        </button>

        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'portfolio' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Kelola Portofolio</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'chat' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat Customer</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-sm uppercase tracking-widest text-[11px] flex items-center space-x-2 transition-all ${
            activeTab === 'settings' ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Pengaturan Studio</span>
        </button>
      </div>

      {/* TAB CONTENTS */}
      <div className="mt-8">
        
        {/* 1. SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-[11px] text-neutral-400 block uppercase tracking-wider">Jumlah Booking</span>
                <p className="text-3xl font-bold font-serif text-amber-300">{totalBookingsCount}</p>
              </div>

              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-[11px] text-neutral-400 block uppercase tracking-wider">Total Pendapatan</span>
                <p className="text-xl font-bold font-serif text-emerald-400">Rp {totalRevenue.toLocaleString('id-ID')}</p>
              </div>

              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-[11px] text-neutral-400 block uppercase tracking-wider">Booking Bulan Ini</span>
                <p className="text-3xl font-bold font-serif text-amber-200">{bookingsThisMonth}</p>
              </div>

              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-[11px] text-neutral-400 block uppercase tracking-wider">Pending Verifikasi DP</span>
                <p className="text-3xl font-bold font-serif text-amber-400">{pendingDpCount}</p>
              </div>

              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-1">
                <span className="text-[11px] text-neutral-400 block uppercase tracking-wider">Booking Hari Ini</span>
                <p className="text-3xl font-bold font-serif text-amber-300">{bookingsToday}</p>
              </div>
            </div>

            {/* Interactive Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Revenue Growth SVG Chart */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Grafik Trend Pendapatan Studio</h3>
                <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-neutral-800 px-2">
                  {[40, 65, 80, 50, 95, 120, 110].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div
                        style={{ height: `${(val / 120) * 100}%` }}
                        className="w-full bg-gradient-to-t from-amber-600 to-amber-300 rounded-t-xl group-hover:brightness-125 transition-all"
                      />
                      <span className="text-[10px] text-neutral-500">Bbln {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Volume SVG Chart */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Grafik Volume Booking Masuk</h3>
                <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-neutral-800 px-2">
                  {[12, 18, 25, 20, 32, 28, 40].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div
                        style={{ height: `${(val / 40) * 100}%` }}
                        className="w-full bg-gradient-to-t from-amber-500 to-amber-200 rounded-t-xl group-hover:brightness-125 transition-all"
                      />
                      <span className="text-[10px] text-neutral-500">M-0{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Recent Bookings List */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Booking Terbaru Masuk</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Paket</th>
                      <th className="p-3">Tanggal & Jam</th>
                      <th className="p-3">Harga</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {bookings.slice(0, 5).map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-800/50">
                        <td className="p-3 font-semibold text-neutral-200">{b.customerName}</td>
                        <td className="p-3">{b.packageName}</td>
                        <td className="p-3">{b.date} ({b.timeSlot})</td>
                        <td className="p-3 font-bold text-amber-400">Rp {b.totalPrice.toLocaleString('id-ID')}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setActiveTab('bookings');
                              setFilterSearch(b.customerName);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-bold text-[10px]"
                          >
                            Kelola
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

        {/* 2. KELOLA BOOKING TAB */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            
            {/* Filter Bar */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Cari Customer / Paket / No. Invoice..."
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-300 font-bold"
                >
                  <option value="ALL">Semua Status Booking</option>
                  <option value="Menunggu DP">Menunggu DP</option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  <option value="DP Diverifikasi">DP Diverifikasi</option>
                  <option value="DP Lunas">DP Lunas</option>
                  <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <div>
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200"
                >
                  <option value="ALL">Semua Jenis Acara</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Prewedding">Prewedding</option>
                  <option value="Graduation">Graduation</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Family">Family</option>
                  <option value="Product">Product</option>
                  <option value="Event">Event</option>
                </select>
              </div>
            </div>

            {/* Bookings Full Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Daftar Reservasi Pelanggan</h3>
                <span className="text-xs text-neutral-400">Total: {filteredBookings.length} Record</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Customer & WA</th>
                      <th className="p-3">Paket & Acara</th>
                      <th className="p-3">Tanggal & Jam</th>
                      <th className="p-3">Bukti Transfer</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-800/50">
                        <td className="p-3 font-mono font-bold text-amber-400">{b.invoiceNumber || 'INV-' + b.id.slice(0, 6)}</td>
                        <td className="p-3">
                          <span className="font-bold text-neutral-100 block">{b.customerName}</span>
                          <span className="text-[10px] text-neutral-500">{b.customerPhone}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-neutral-200 block">{b.packageName}</span>
                          <span className="text-[10px] text-amber-400">{b.eventType}</span>
                        </td>
                        <td className="p-3">{b.date} ({b.timeSlot})</td>
                        <td className="p-3">
                          {b.paymentProof ? (
                            <button
                              onClick={() => alert(`Bukti Transfer:\nPengirim: ${b.paymentProof?.senderName}\nBank: ${b.paymentProof?.bankName}\nNominal: Rp ${b.paymentProof?.nominal.toLocaleString('id-ID')}\nRef: ${b.paymentProof?.refNumber}`)}
                              className="text-amber-400 underline text-[11px]"
                            >
                              Lihat Struk DP
                            </button>
                          ) : (
                            <span className="text-neutral-600 text-[10px]">Belum Transfer</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 flex flex-wrap gap-1">
                          {b.status === 'Menunggu Verifikasi' && (
                            <>
                              <button
                                onClick={() => handleApproveDp(b)}
                                className="px-2 py-1 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-[10px] hover:bg-emerald-400"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectionModalBooking(b)}
                                className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold text-[10px] hover:bg-red-500"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setRescheduleModalBooking(b)}
                            className="px-2 py-1 rounded-lg bg-neutral-800 text-amber-300 font-bold text-[10px] hover:bg-neutral-700"
                          >
                            Reschedule
                          </button>

                          <button
                            onClick={() => generateInvoicePDF(b, settings)}
                            className="p-1 rounded-lg bg-neutral-950 text-amber-300 hover:text-white"
                            title="Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection Modal */}
            {rejectionModalBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-neutral-900 border border-red-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
                  <h3 className="text-base font-bold text-red-400">Tolak Verifikasi Pembayaran DP</h3>
                  <p className="text-xs text-neutral-300">
                    Masukkan alasan penolakan untuk pelanggan <strong>{rejectionModalBooking.customerName}</strong>:
                  </p>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Nominal transfer kurang / Struk tidak terbaca..."
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-red-400"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setRejectionModalBooking(null)}
                      className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleConfirmRejectDp}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500"
                    >
                      Kirim Penolakan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleModalBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-neutral-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
                  <h3 className="text-base font-bold text-amber-300">Pindah Jadwal (Reschedule)</h3>
                  <p className="text-xs text-neutral-300">
                    Pindahkan jadwal untuk booking <strong>{rescheduleModalBooking.packageName}</strong>:
                  </p>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-neutral-400 mb-1">Tanggal Baru</label>
                      <input
                        type="date"
                        value={newRescheduleDate}
                        onChange={(e) => setNewRescheduleDate(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1">Jam Slot Baru</label>
                      <select
                        value={newRescheduleTime}
                        onChange={(e) => setNewRescheduleTime(e.target.value as any)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                      >
                        <option value="08.00 - 12.00">08.00 - 12.00 WIB (Sesi Pagi)</option>
                        <option value="12.00 - 16.00">12.00 - 16.00 WIB (Sesi Siang)</option>
                        <option value="16.00 - 20.00">16.00 - 20.00 WIB (Sesi Sore/Malam)</option>
                        <option value="20.00 - 24.00">20.00 - 24.00 WIB (Sesi Malam Extra)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setRescheduleModalBooking(null)}
                      className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleConfirmReschedule}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold hover:bg-amber-300"
                    >
                      Simpan Jadwal Baru
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3. KELOLA JADWAL & BLOCK TAB */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Block Form */}
            <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold font-serif text-amber-200">Blokir Tanggal / Jam Slot / Libur</h3>
              <p className="text-xs text-neutral-400">
                Admin dapat memblokir tanggal penuh atau slot tertentu agar tidak bisa dibooking oleh pelanggan.
              </p>

              <form onSubmit={handleBlockSchedule} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Tanggal yang Diblokir</label>
                  <input
                    type="date"
                    required
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Jam Slot yang Diblokir</label>
                  <select
                    value={blockTime}
                    onChange={(e) => setBlockTime(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                  >
                    <option value="ALL">Semua Jam (Penuh 1 Hari Libur)</option>
                    <option value="08.00 - 12.00">08.00 - 12.00 WIB (Sesi Pagi)</option>
                    <option value="12.00 - 16.00">12.00 - 16.00 WIB (Sesi Siang)</option>
                    <option value="16.00 - 20.00">16.00 - 20.00 WIB (Sesi Sore/Malam)</option>
                    <option value="20.00 - 24.00">20.00 - 24.00 WIB (Sesi Malam Extra)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Alasan Penutupan Schedule</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Libur Nasional / Full Out of Town Project"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-amber-400 text-neutral-950 hover:bg-amber-300 transition-colors"
                >
                  Blokir Jadwal
                </button>
              </form>
            </div>

            {/* Blocked Slots List */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Daftar Slot Diblokir</h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {blockedSlots.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6 text-center">Belum ada slot yang diblokir.</p>
                ) : (
                  blockedSlots.map((bs) => (
                    <div key={bs.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-amber-300 block">{bs.date} — Jam: {bs.timeSlot}</span>
                        <span className="text-[11px] text-neutral-400">{bs.reason}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteBlockedSlot(bs.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        title="Hapus Block"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* 4. KELOLA PAKET TAB */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold font-serif text-amber-200">Daftar Paket Fotografi Studio</h3>
              <button
                onClick={() => setEditingPackage({ active: true, price: 2000000, minDp: 500000 })}
                className="px-4 py-2 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Paket Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-amber-300 text-base">{pkg.name}</h4>
                    <button
                      onClick={() => setEditingPackage(pkg)}
                      className="p-1.5 rounded-lg bg-neutral-950 text-amber-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-neutral-200">Rp {pkg.price.toLocaleString('id-ID')}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-300">
                    <span>{pkg.duration}</span>
                    <span className="font-mono font-bold text-[#D4AF37] px-2 py-0.5 rounded bg-black border border-[#D4AF37]/30">
                      ⏱ {pkg.durationHours || 4} Jam Booking
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Package Edit Modal */}
            {editingPackage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                <div className="bg-neutral-900 border border-[#D4AF37]/40 rounded-sm p-6 max-w-lg w-full my-8 space-y-4">
                  <h3 className="text-base font-bold text-[#D4AF37]">Formulir Paket Photography & Videography</h3>
                  <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-300 mb-1 font-medium">Nama Paket</label>
                      <input
                        type="text"
                        required
                        value={editingPackage.name || ''}
                        onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 mb-1 font-medium">Harga Total (Rp)</label>
                        <input
                          type="number"
                          required
                          value={editingPackage.price || 0}
                          onChange={(e) => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-[#D4AF37] font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 font-medium">Minimal DP (Rp)</label>
                        <input
                          type="number"
                          required
                          value={editingPackage.minDp || 0}
                          onChange={(e) => setEditingPackage({ ...editingPackage, minDp: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-emerald-400 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 mb-1 font-medium">Label Teks Durasi Paket</label>
                        <input
                          type="text"
                          required
                          value={editingPackage.duration || ''}
                          placeholder="Contoh: 4 Jam Session / Full Day"
                          onChange={(e) => setEditingPackage({ ...editingPackage, duration: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[#D4AF37] mb-1 font-bold">Durasi Booking (Jam)</label>
                        <select
                          value={editingPackage.durationHours || 4}
                          onChange={(e) => setEditingPackage({ 
                            ...editingPackage, 
                            durationHours: Number(e.target.value),
                            duration: editingPackage.duration || `${e.target.value} Jam Session`
                          })}
                          className="w-full px-3 py-2 bg-neutral-950 border border-[#D4AF37]/50 rounded-sm text-[#D4AF37] font-bold font-mono"
                        >
                          <option value={2}>2 Jam (Sesi Ringkas)</option>
                          <option value={3}>3 Jam (Sesi Standar)</option>
                          <option value={4}>4 Jam (1 Slot Penuh)</option>
                          <option value={6}>6 Jam (1.5 Slot)</option>
                          <option value={8}>8 Jam (2 Slot / Half-Full Day)</option>
                          <option value={12}>12 Jam (Full Day Paket)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 mb-1 font-medium">URL Cover Gambar Paket</label>
                      <input
                        type="url"
                        value={editingPackage.coverUrl || ''}
                        onChange={(e) => setEditingPackage({ ...editingPackage, coverUrl: e.target.value })}
                        placeholder="Link URL Foto"
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPackage(null)}
                        className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300"
                      >
                        Simpan Paket
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. PORTOFOLIO STUDIO TAB */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-950/40 via-neutral-900 to-amber-950/30 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
                  <Folder className="w-4 h-4 text-blue-400" />
                  <span>Google Drive Portfolio & Storage Integration</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Semua foto hasil karya portofolio & bukti transfer pelanggan tersimpan dalam Google Drive HadsProject.
                </p>
              </div>
              <a
                href={settings?.googleDriveFolderUrl || "https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-all flex items-center space-x-2 shrink-0 shadow-lg shadow-blue-600/20"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Google Drive Studio</span>
              </a>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold font-serif text-[#D4AF37]">Galeri Portofolio Studio</h3>
              <button
                onClick={() => setEditingPortfolio({ category: 'Wedding', mediaType: 'photo' })}
                className="px-4 py-2 rounded-sm bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Portofolio Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {portfolio.map((item) => (
                <div key={item.id} className="relative rounded-sm overflow-hidden bg-neutral-900 border border-white/10 aspect-[4/5] group">
                  <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-[#D4AF37] uppercase">{item.category}</span>
                    <p className="text-xs font-bold text-white leading-tight">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>

            {editingPortfolio && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-neutral-900 border border-white/10 rounded-sm p-6 max-w-md w-full space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-bold text-[#D4AF37]">Tambah / Edit Portofolio</h3>
                    <a
                      href={settings?.googleDriveFolderUrl || "https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Upload foto ke Drive terlebih dahulu</span>
                    </a>
                  </div>
                  <form onSubmit={handleSavePortfolio} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Judul Portofolio</label>
                      <input
                        type="text"
                        required
                        value={editingPortfolio.title || ''}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, title: e.target.value })}
                        placeholder="Contoh: The Eternal Vows of Kevin & Amanda"
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Kategori Event</label>
                      <select
                        value={editingPortfolio.category || 'Wedding'}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, category: e.target.value as any })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                      >
                        <option value="Wedding">Wedding</option>
                        <option value="Prewedding">Prewedding</option>
                        <option value="Graduation">Graduation</option>
                        <option value="Birthday">Birthday</option>
                        <option value="Family">Family</option>
                        <option value="Product">Product</option>
                        <option value="Event">Event</option>
                        <option value="Corporate">Corporate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">URL Foto / Link Share Google Drive</label>
                      <input
                        type="url"
                        required
                        value={editingPortfolio.mediaUrl || ''}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, mediaUrl: e.target.value })}
                        placeholder="Paste URL gambar atau share link Google Drive foto"
                        className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPortfolio(null)}
                        className="px-4 py-2 rounded-sm bg-neutral-800 text-gray-300 font-bold uppercase tracking-wider text-[10px]"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-sm bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-[10px]"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. ADMIN CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] bg-neutral-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Thread List Left */}
            <div className="border-r border-neutral-800 bg-neutral-950 p-4 space-y-3 overflow-y-auto">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Percakapan Pelanggan</h3>
              {chatThreads.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">Belum ada percakapan masuk.</p>
              ) : (
                chatThreads.map((thread) => (
                  <button
                    key={thread.customerId}
                    onClick={() => setSelectedChatCustomerId(thread.customerId)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${
                      selectedChatCustomerId === thread.customerId
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold text-xs block truncate">{thread.customerName}</span>
                    <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                      {thread.messages[thread.messages.length - 1]?.text || 'Lampiran'}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Chat Box Right */}
            <div className="md:col-span-2 flex flex-col justify-between bg-neutral-950/60 p-4">
              {currentChatThread ? (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {currentChatThread.messages.map((m) => (
                      <div key={m.id} className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl p-3 text-xs ${
                          m.senderRole === 'admin'
                            ? 'bg-amber-400 text-neutral-950 font-medium'
                            : 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                        }`}>
                          <p>{m.text}</p>
                          {m.mediaUrl && <img src={m.mediaUrl} alt="Attachment" className="mt-2 rounded-xl max-h-36 object-cover" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendAdminChat} className="mt-4 flex items-center space-x-2">
                    <input
                      type="text"
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder="Ketik balasan admin..."
                      className="flex-1 px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-full text-neutral-200 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="p-2.5 rounded-full bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-neutral-500">
                  Pilih percakapan pelanggan di sebelah kiri.
                </div>
              )}
            </div>

          </div>
        )}

        {/* 7. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="bg-neutral-900 border border-white/10 rounded-sm p-6 max-w-xl mx-auto space-y-6 shadow-xl">
            <h3 className="text-lg font-bold font-serif text-[#D4AF37]">Pengaturan Studio & Pembayaran</h3>
            
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Nama Bank Pembayaran</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    placeholder="Bank Mandiri"
                    className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Nomor Rekening Bank</label>
                  <input
                    type="text"
                    value={editBankAcc}
                    onChange={(e) => setEditBankAcc(e.target.value)}
                    placeholder="1330025480476"
                    className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-[#D4AF37] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Atas Nama Rekening</label>
                <input
                  type="text"
                  value={editBankHolder}
                  onChange={(e) => setEditBankHolder(e.target.value)}
                  placeholder="Ahmad Hudatul Jami"
                  className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Link Folder Google Drive Studio (Storage / Bukti TF & Portofolio)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editDriveUrl}
                    onChange={(e) => setEditDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing"
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-blue-300 font-mono text-[11px]"
                  />
                  <a
                    href={editDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-sm text-[10px] uppercase flex items-center space-x-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Drive</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Nomor WhatsApp Admin Studio</label>
                  <input
                    type="text"
                    value={editWaNum}
                    onChange={(e) => setEditWaNum(e.target.value)}
                    placeholder="085284206829"
                    className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Email Resmi Admin Studio</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="creative.hadsproject@gmail.com"
                    className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Alamat Studio</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Jakarta Indonesia"
                  className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">URL / Link Gambar QRIS Pembayaran</label>
                <input
                  type="url"
                  value={editQrisUrl}
                  onChange={(e) => setEditQrisUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-sm text-white"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3 text-xs font-bold uppercase tracking-widest rounded-sm bg-[#D4AF37] text-black hover:brightness-110 transition-all shadow-md mt-2"
              >
                Simpan Pengaturan Studio
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
