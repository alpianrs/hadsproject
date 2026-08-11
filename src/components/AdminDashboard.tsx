import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Calendar, DollarSign, Clock, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Plus, Edit, Trash, Download, Filter, Search, Eye, Settings, Image as ImageIcon, Send, RefreshCw, X, Layers, ExternalLink, Folder, FileSpreadsheet, Copy, Check, Database, Sparkles, Code, FileText } from 'lucide-react';
import { Booking, BookingStatus, PackageItem, PortfolioItem, Review, StudioSettings, BlockedSlot, ChatMessage, UserProfile } from '../types';
import { db, collection, onSnapshot, updateDoc, doc, addDoc, deleteDoc, setDoc } from '../lib/firebase';
import { generateInvoicePDF } from '../lib/generateInvoice';
import { GOOGLE_APPS_SCRIPT_CODE, sendToGoogleSheets, testGoogleSheetsConnection, syncAllDataToGoogleSheets } from '../lib/googleSheets';
import { pullLatestDataFromGoogleSheets } from '../lib/db';

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
  const [editSheetsUrl, setEditSheetsUrl] = useState(settings?.googleSheetsAppScriptUrl || '');
  const [editAdminUsername, setEditAdminUsername] = useState(settings?.adminUsername || 'admin');
  const [editAdminPassword, setEditAdminPassword] = useState(settings?.adminPassword || 'HADS2026');

  // Google Sheets Sync States
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [proofModalBooking, setProofModalBooking] = useState<Booking | null>(null);

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
      setEditSheetsUrl(settings.googleSheetsAppScriptUrl || '');
      setEditAdminUsername(settings.adminUsername || 'admin');
      setEditAdminPassword(settings.adminPassword || 'HADS2026');
    }
  }, [settings]);

  // Test Google Sheets Connection
  const handleTestSheetsConnection = async () => {
    if (!editSheetsUrl.trim()) {
      setSheetsSyncStatus({ type: 'error', message: 'Silakan isi URL Google Apps Script Web App terlebih dahulu.' });
      return;
    }
    setIsTestingSheets(true);
    setSheetsSyncStatus(null);
    const result = await testGoogleSheetsConnection(editSheetsUrl);
    setIsTestingSheets(false);
    if (result.success) {
      setSheetsSyncStatus({ type: 'success', message: '✅ ' + result.message });
    } else {
      setSheetsSyncStatus({ type: 'error', message: '❌ ' + result.message });
    }
  };

  // Sync All Data to Google Sheets
  const handleSyncAllSheets = async () => {
    if (!editSheetsUrl.trim()) {
      setSheetsSyncStatus({ type: 'error', message: 'Silakan isi URL Google Apps Script Web App terlebih dahulu.' });
      return;
    }
    setIsSyncingSheets(true);
    setSheetsSyncStatus(null);
    const currentSet: StudioSettings = {
      bankName: editBankName,
      bankAccount: editBankAcc,
      accountHolder: editBankHolder,
      qrisUrl: editQrisUrl,
      whatsappNumber: editWaNum,
      studioAddress: editAddress,
      studioEmail: editEmail,
      googleDriveFolderUrl: editDriveUrl,
      googleSheetsAppScriptUrl: editSheetsUrl,
      adminUsername: editAdminUsername || 'admin',
      adminPassword: editAdminPassword || 'HADS2026'
    };

    const result = await syncAllDataToGoogleSheets(editSheetsUrl, {
      bookings,
      packages,
      blockedSlots,
      reviews,
      settings: currentSet
    });
    setIsSyncingSheets(false);
    if (result.success) {
      setSheetsSyncStatus({ type: 'success', message: '🚀 ' + result.message });
    } else {
      setSheetsSyncStatus({ type: 'error', message: '❌ ' + result.message });
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

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
      const updated = { ...booking, status: 'DP Diverifikasi' as const };
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'DP Diverifikasi'
      });

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_booking', updated);
      }

      // Send notification to customer
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'DP Berhasil Diverifikasi!',
        message: `Pembayaran DP Rp ${booking.dpAmount.toLocaleString('id-ID')} Anda untuk paket ${booking.packageName} telah disetujui. Silakan lakukan pelunasan sisa Rp ${booking.remainingAmount.toLocaleString('id-ID')}.`,
        type: 'payment',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      alert(`Booking ${booking.invoiceNumber} berhasil disetujui (DP Diverifikasi).`);
    } catch (err) {
      console.error('Approve DP error:', err);
    }
  };

  // Approve Pelunasan
  const handleApprovePelunasan = async (booking: Booking) => {
    try {
      const updated = { ...booking, status: 'Lunas' as const, remainingAmount: 0 };
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'Lunas',
        remainingAmount: 0
      });

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_booking', updated);
      }

      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Pembayaran Lunas (100%)',
        message: `Pembayaran pelunasan Anda untuk paket ${booking.packageName} telah dikonfirmasi LUNAS! Terima kasih telah menggunakan jasa HadsProject Studio.`,
        type: 'payment',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      alert(`Booking ${booking.invoiceNumber} berhasil disetujui (LUNAS 100%).`);
    } catch (err) {
      console.error('Approve Pelunasan error:', err);
    }
  };

  // Update Status directly
  const handleUpdateStatus = async (booking: Booking, newStatus: BookingStatus) => {
    try {
      const remaining = newStatus === 'Lunas' ? 0 : booking.remainingAmount;
      const updated = { ...booking, status: newStatus, remainingAmount: remaining };
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus,
        remainingAmount: remaining
      });

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_booking', updated);
      }

      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: `Pembaruan Status Booking: ${newStatus}`,
        message: `Status booking Anda (${booking.packageName}) diperbarui menjadi: ${newStatus}.`,
        type: 'booking',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      alert(`Status booking ${booking.invoiceNumber} diubah menjadi "${newStatus}".`);
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // Save Google Drive Result URL for Customer
  const handleSaveDriveResultUrl = async (booking: Booking) => {
    const currentUrl = booking.googleDriveResultUrl || editDriveUrl || '';
    const inputUrl = prompt('Masukkan Link Folder Google Drive Hasil Foto/Video Pelanggan:\n(Link ini akan muncul langsung di dashboard pelanggan)', currentUrl);
    if (inputUrl === null) return;

    try {
      const updated = { ...booking, googleDriveResultUrl: inputUrl.trim() };
      await updateDoc(doc(db, 'bookings', booking.id), {
        googleDriveResultUrl: inputUrl.trim()
      });

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_booking', updated);
      }

      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: '📁 Link Hasil Foto & Video Google Drive Tersedia!',
        message: `Hasil foto & video untuk ${booking.packageName} telah diunggah ke Google Drive. Klik untuk mengunduh.`,
        type: 'booking',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      alert('Link Google Drive Hasil Foto berhasil tersimpan & dikirim ke pelanggan.');
    } catch (err) {
      console.error('Save Drive URL error:', err);
    }
  };

  // Reject DP
  const handleConfirmRejectDp = async () => {
    if (!rejectionModalBooking || !rejectionReason.trim()) return;

    try {
      const updated = { ...rejectionModalBooking, status: 'Menunggu DP' as const };
      await updateDoc(doc(db, 'bookings', rejectionModalBooking.id), {
        status: 'Menunggu DP',
        'paymentProof.rejectionReason': rejectionReason
      });

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_booking', updated);
      }

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
      const updated = { ...rescheduleModalBooking, date: newRescheduleDate, timeSlot: newRescheduleTime };
      await updateDoc(doc(db, 'bookings', rescheduleModalBooking.id), {
        date: newRescheduleDate,
        timeSlot: newRescheduleTime
      });

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_booking', updated);
      }

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
      const updatedSettings: StudioSettings = {
        bankName: editBankName,
        bankAccount: editBankAcc,
        accountHolder: editBankHolder,
        qrisUrl: editQrisUrl,
        whatsappNumber: editWaNum,
        studioAddress: editAddress,
        studioEmail: editEmail,
        googleDriveFolderUrl: editDriveUrl,
        googleSheetsAppScriptUrl: editSheetsUrl,
        adminUsername: editAdminUsername || 'admin',
        adminPassword: editAdminPassword || 'HADS2026'
      };

      await setDoc(doc(db, 'settings', 'global'), updatedSettings);

      if (editSheetsUrl) {
        sendToGoogleSheets(editSheetsUrl, 'sync_all_data', {
          bookings,
          packages,
          blockedSlots,
          reviews,
          settings: updatedSettings
        });
      }

      alert('Pengaturan Studio & Kredensial Admin berhasil disimpan serta disinkronkan ke Google Sheets.');
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  // Delete Booking Handler
  const handleDeleteBooking = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data booking ini secara permanen dari database?')) {
      try {
        await deleteDoc(doc(db, 'bookings', id));
        alert('Data booking berhasil dihapus.');
      } catch (err) {
        console.error('Delete booking error:', err);
        alert('Gagal menghapus booking.');
      }
    }
  };

  // Delete Package Handler
  const handleDeletePackage = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus paket ini dari database?')) {
      try {
        await deleteDoc(doc(db, 'packages', id));
        alert('Paket berhasil dihapus.');
      } catch (err) {
        console.error('Delete package error:', err);
        alert('Gagal menghapus paket.');
      }
    }
  };

  // Delete Portfolio Handler
  const handleDeletePortfolio = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus portofolio ini dari galeri database?')) {
      try {
        await deleteDoc(doc(db, 'portfolio', id));
        alert('Portofolio berhasil dihapus.');
      } catch (err) {
        console.error('Delete portfolio error:', err);
        alert('Gagal menghapus portofolio.');
      }
    }
  };

  // Delete Cancelled Bookings
  const handleDeleteCancelledBookings = async () => {
    const cancelled = bookings.filter(b => b.status === 'Dibatalkan');
    if (cancelled.length === 0) {
      alert('Tidak ada booking bertanda Dibatalkan.');
      return;
    }
    if (window.confirm(`Hapus ${cancelled.length} booking bertanda Dibatalkan dari database?`)) {
      for (const b of cancelled) {
        await deleteDoc(doc(db, 'bookings', b.id));
      }
      alert(`${cancelled.length} booking dibatalkan berhasil dihapus.`);
    }
  };

  // Clear All Bookings Reset
  const handleClearAllBookings = async () => {
    if (bookings.length === 0) {
      alert('Database booking sudah kosong.');
      return;
    }
    if (window.confirm('PERINGATAN KRUSIAL: Hapus SELURUH data booking pelanggan?')) {
      if (window.confirm('Konfirmasi sekali lagi: Yakin hapus semua record booking?')) {
        for (const b of bookings) {
          await deleteDoc(doc(db, 'bookings', b.id));
        }
        alert('Seluruh database booking berhasil dikosongkan.');
      }
    }
  };

  // Pull Data from Google Sheets
  const [isPullingData, setIsPullingData] = useState(false);
  const handlePullFromSheets = async () => {
    setIsPullingData(true);
    const success = await pullLatestDataFromGoogleSheets();
    setIsPullingData(false);
    if (success) {
      alert('✅ Berhasil menarik & menyinkronkan data terbaru dari Google Sheets!');
    } else {
      alert('⚠️ Belum ada data baru atau URL Google Apps Script Web App belum dikonfigurasi di Pengaturan.');
    }
  };

  const currentChatThread = chatThreads.find((t) => t.customerId === selectedChatCustomerId);

  return (
    <div className="min-h-screen bg-black text-neutral-100 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-amber-500/30 mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Control Panel Admin</span>
            <h1 className="text-2xl font-bold font-serif text-amber-200">Management System HadsProject</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePullFromSheets}
            disabled={isPullingData}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Tarik & Sinkronkan Data Terbaru dari Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullingData ? 'animate-spin' : ''}`} />
            <span>{isPullingData ? 'Menyinkronkan...' : 'Tarik Data Sheets'}</span>
          </button>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-bold">
            ADMIN AUTHORIZED
          </span>
        </div>
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
                  <option value="Menunggu Verifikasi DP">Menunggu Verifikasi DP</option>
                  <option value="DP Diverifikasi">DP Diverifikasi</option>
                  <option value="Menunggu Pelunasan">Menunggu Pelunasan</option>
                  <option value="Menunggu Verifikasi Pelunasan">Menunggu Verifikasi Pelunasan</option>
                  <option value="Lunas">Lunas (100%)</option>
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
                          <div className="flex flex-col gap-1">
                            {b.paymentProof ? (
                              <button
                                onClick={() => setProofModalBooking(b)}
                                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[10px] transition-all flex items-center gap-1 w-fit"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Struk DP</span>
                              </button>
                            ) : (
                              <span className="text-neutral-600 text-[10px]">Belum DP</span>
                            )}

                            {b.fullPaymentProof ? (
                              <button
                                onClick={() => setProofModalBooking({ ...b, paymentProof: b.fullPaymentProof })}
                                className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold text-[10px] transition-all flex items-center gap-1 w-fit"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Struk Pelunasan</span>
                              </button>
                            ) : b.status === 'Lunas' ? (
                              <span className="text-emerald-400 font-bold text-[10px]">✓ Pelunasan OK</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            b.status === 'Lunas' || b.status === 'Selesai'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                              : b.status.includes('Verifikasi')
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            {/* Verification Actions */}
                            {(b.status === 'Menunggu Verifikasi' || b.status === 'Menunggu Verifikasi DP') && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleApproveDp(b)}
                                  className="px-2 py-1 rounded bg-emerald-500 text-neutral-950 font-bold text-[10px] hover:bg-emerald-400 flex-1"
                                >
                                  Setujui DP
                                </button>
                                <button
                                  onClick={() => setRejectionModalBooking(b)}
                                  className="px-2 py-1 rounded bg-red-600 text-white font-bold text-[10px] hover:bg-red-500"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}

                            {b.status === 'Menunggu Verifikasi Pelunasan' && (
                              <button
                                onClick={() => handleApprovePelunasan(b)}
                                className="px-2 py-1 rounded bg-emerald-500 text-neutral-950 font-bold text-[10px] hover:bg-emerald-400 w-full"
                              >
                                Setujui Pelunasan (Lunas)
                              </button>
                            )}

                            {/* Quick Status Selector */}
                            <select
                              value={b.status}
                              onChange={(e) => handleUpdateStatus(b, e.target.value as BookingStatus)}
                              className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-[10px] text-amber-300 font-medium focus:outline-none focus:border-amber-400"
                            >
                              <option value="Menunggu DP">Status: Menunggu DP</option>
                              <option value="Menunggu Verifikasi DP">Status: Menunggu Verifikasi DP</option>
                              <option value="DP Diverifikasi">Status: DP Diverifikasi</option>
                              <option value="Menunggu Pelunasan">Status: Menunggu Pelunasan</option>
                              <option value="Menunggu Verifikasi Pelunasan">Status: Menunggu Verifikasi Pelunasan</option>
                              <option value="Lunas">Status: LUNAS (100%)</option>
                              <option value="Sedang Berlangsung">Status: Sedang Berlangsung</option>
                              <option value="Selesai">Status: Selesai</option>
                              <option value="Dibatalkan">Status: Dibatalkan</option>
                            </select>

                            {/* Secondary Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveDriveResultUrl(b)}
                                className="px-2 py-1 rounded bg-blue-900/50 hover:bg-blue-800 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex-1 flex items-center justify-center gap-1"
                                title="Masukkan Link Google Drive Hasil Foto/Video"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>{b.googleDriveResultUrl ? 'Edit Link Drive' : '+ Link Hasil'}</span>
                              </button>

                              <button
                                onClick={() => setRescheduleModalBooking(b)}
                                className="p-1 rounded bg-neutral-800 text-amber-300 font-bold text-[10px] hover:bg-neutral-700"
                                title="Jadwal Ulang"
                              >
                                Reschedule
                              </button>

                              <button
                                onClick={() => generateInvoicePDF(b, settings)}
                                className="p-1 rounded bg-neutral-950 text-amber-300 hover:text-white"
                                title="Unduh PDF Invoice"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1.5 rounded bg-red-950/80 hover:bg-red-800 text-red-300 border border-red-500/40 transition-colors"
                                title="Hapus Booking Permanen"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingPackage(pkg)}
                        className="p-1.5 rounded-lg bg-neutral-950 text-amber-400 hover:text-white"
                        title="Edit Paket"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-1.5 rounded-lg bg-red-950/80 text-red-300 hover:bg-red-800 border border-red-500/30"
                        title="Hapus Paket"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
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
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-[#D4AF37] uppercase">{item.category}</span>
                      <button
                        onClick={() => handleDeletePortfolio(item.id)}
                        className="p-1 rounded bg-red-600 text-white hover:bg-red-500 shadow"
                        title="Hapus Portofolio"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          <div className="bg-neutral-900 border border-white/10 rounded-sm p-6 max-w-2xl mx-auto space-y-6 shadow-xl">
            <h3 className="text-lg font-bold font-serif text-[#D4AF37]">Pengaturan Studio & Integrasi Database</h3>
            
            {/* GOOGLE SHEETS INTEGRATION BOX */}
            <div className="p-5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-4 shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500 text-neutral-950 font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>Integrasi Google Sheets Database (Apps Script)</span>
                      <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                        ONLINE SYNC
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-200/70">
                      Hubungkan website HadsProject ke Google Sheets untuk menyimpan otomatis semua booking, paket, dan data.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSheetsModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all shrink-0"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Kode & Panduan Script</span>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-emerald-300/90 font-medium mb-1">
                    URL Google Apps Script Web App (Berakhiran <code className="text-emerald-400">{"/exec"}</code>)
                  </label>
                  <input
                    type="url"
                    value={editSheetsUrl}
                    onChange={(e) => setEditSheetsUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full px-3 py-2 bg-neutral-950 border border-emerald-500/30 rounded-md text-emerald-100 font-mono text-xs focus:border-emerald-400 focus:outline-none placeholder:text-neutral-600"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestSheetsConnection}
                    disabled={isTestingSheets}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded transition-all flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheets ? 'animate-spin' : ''}`} />
                    <span>{isTestingSheets ? 'Menguji...' : 'Uji Koneksi Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncAllSheets}
                    disabled={isSyncingSheets}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded transition-all flex items-center space-x-1.5"
                  >
                    <Database className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Sinkronkan Semua Data'}</span>
                  </button>
                </div>

                {sheetsSyncStatus && (
                  <div className={`p-3 rounded-md text-xs border font-medium flex items-center justify-between ${
                    sheetsSyncStatus.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  }`}>
                    <span>{sheetsSyncStatus.message}</span>
                    <button onClick={() => setSheetsSyncStatus(null)} className="text-neutral-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

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

              {/* ADMIN LOGIN CREDENTIALS CONFIG BOX */}
              <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Kredensial Akun Admin Studio (Username & Kata Sandi)</span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  Kredensial ini digunakan untuk masuk/login Tim Admin HadsProject. Anda dapat menggantinya kapan saja dan otomatis tersinkron ke Google Sheets Database.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1">Username Admin Studio</label>
                    <input
                      type="text"
                      value={editAdminUsername}
                      onChange={(e) => setEditAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 bg-neutral-950 border border-amber-500/40 rounded-sm text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Kata Sandi Admin Studio</label>
                    <input
                      type="text"
                      value={editAdminPassword}
                      onChange={(e) => setEditAdminPassword(e.target.value)}
                      placeholder="HADS2026"
                      className="w-full px-3 py-2 bg-neutral-950 border border-amber-500/40 rounded-sm text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* DATABASE MANAGEMENT & DELETE BOX */}
              <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-red-300 font-bold text-xs">
                  <Trash className="w-4 h-4 text-red-400" />
                  <span>Manajemen & Hapus Database Studio</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Fitur ini memungkinkan Admin untuk membersihkan atau menghapus data berlebih dari database lokal & Google Sheets.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteCancelledBookings}
                    className="px-3 py-2 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Hapus Booking Dibatalkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllBookings}
                    className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-600 rounded text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Reset / Hapus Semua Booking</span>
                  </button>
                </div>
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

      {/* GOOGLE SHEETS APPS SCRIPT TUTORIAL MODAL */}
      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-neutral-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden my-8 p-6 text-white space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-500 text-neutral-950 font-bold">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-emerald-300">
                    Panduan & Kode Apps Script Google Sheets
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Ikuti 8 langkah mudah ini untuk menjadikan Google Sheets sebagai database HadsProject
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSheetsModalOpen(false)}
                className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step-by-Step Tutorial */}
            <div className="space-y-3 text-xs text-neutral-200 bg-neutral-950/80 p-4 rounded-xl border border-neutral-800">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Langkah-Langkah Pemasangan di Google Sheets:</span>
              </h4>

              <ol className="space-y-2 pl-2 text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Google Sheets</a> lalu buat spreadsheet baru (beri nama <strong>HadsProject Studio Database</strong>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Klik menu <strong>Extensions (Ekstensi)</strong> → pilih <strong>Apps Script</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span>Hapus seluruh isi kode default yang ada di editor Apps Script.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">4</span>
                  <span>Klik tombol <strong>"Salin Script Google Apps Script"</strong> di bawah ini, lalu tempel (Paste) ke editor Apps Script.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">5</span>
                  <span>Klik ikon <strong>Simpan (Save / Disket)</strong> di bagian atas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">6</span>
                  <span>Klik tombol biru <strong>Deploy (Terapkan)</strong> di kanan atas → pilih <strong>New deployment (Penerapan baru)</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">7</span>
                  <span>Pilih jenis: <strong>Web app (Aplikasi Web)</strong>. Atur:
                    <ul className="list-disc pl-5 mt-1 text-emerald-200/90 space-y-0.5">
                      <li>Execute as (Jalankan sebagai): <strong>Me (Saya)</strong></li>
                      <li>Who has access (Siapa yang memiliki akses): <strong>Anyone (Siapa saja)</strong></li>
                    </ul>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">8</span>
                  <span>Klik <strong>Deploy</strong> → Izinkan Akses (Grant Access) → SALIN <strong>Web App URL</strong> (berakhiran <code className="text-emerald-300">{"/exec"}</code>) dan tempelkan ke kolom URL di menu Pengaturan Admin.</span>
                </li>
              </ol>
            </div>

            {/* Code Box with 1-click Copy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4" />
                  <span>Kode Google Apps Script (Code.gs):</span>
                </span>

                <button
                  onClick={handleCopyScriptCode}
                  className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-all shadow-lg ${
                    copiedScript
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-neutral-950'
                  }`}
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Berhasil Disalin!' : 'Salin Script Apps Script'}</span>
                </button>
              </div>

              <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 p-4 max-h-72 overflow-y-auto font-mono text-[11px] text-emerald-300/90 leading-relaxed selection:bg-emerald-500 selection:text-neutral-950">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setIsSheetsModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
              >
                Tutup Panduan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BUKTI TRANSFER PREVIEW MODAL */}
      {proofModalBooking && proofModalBooking.paymentProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-neutral-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 text-white space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-amber-500 text-neutral-950 font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-amber-300">
                    Detail Struk & Bukti Transfer DP
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Invoice: <span className="font-mono text-amber-200">{proofModalBooking.invoiceNumber || 'INV-' + proofModalBooking.id.slice(0, 6)}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProofModalBooking(null)}
                className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial & Transfer Info */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Nama Pelanggan</span>
                <span className="font-bold text-neutral-200">{proofModalBooking.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Paket Foto</span>
                <span className="font-bold text-amber-300">{proofModalBooking.packageName}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Pengirim Transfer</span>
                <span className="font-semibold text-neutral-300">{proofModalBooking.paymentProof.senderName} ({proofModalBooking.paymentProof.bankName})</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Nominal Ditransfer</span>
                <span className="font-mono font-bold text-emerald-400">Rp {proofModalBooking.paymentProof.nominal.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Tanggal Transfer</span>
                <span className="text-neutral-300">{proofModalBooking.paymentProof.transferDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">No. Referensi</span>
                <span className="font-mono text-amber-200">{proofModalBooking.paymentProof.refNumber || '-'}</span>
              </div>
            </div>

            {/* Proof Image / Link Showcase */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-300 block">Foto / File Struk Transfer:</span>
              
              {proofModalBooking.paymentProof.proofUrl.startsWith('data:image') || proofModalBooking.paymentProof.proofUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black p-2 text-center">
                  <img
                    src={proofModalBooking.paymentProof.proofUrl}
                    alt="Bukti Transfer DP"
                    className="max-h-72 object-contain mx-auto rounded-lg"
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={proofModalBooking.paymentProof.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Link Bukti Struk</span>
                </a>

                <a
                  href={editDriveUrl || 'https://drive.google.com/drive/folders/1HbSnPKkMA1SGJKMfejGnx2EInguC1Wt7?usp=sharing'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Folder Google Drive Studio</span>
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex space-x-2">
                {proofModalBooking.status === 'Menunggu Verifikasi' && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveDp(proofModalBooking);
                        setProofModalBooking(null);
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg"
                    >
                      ✓ Verifikasi & Approve DP
                    </button>
                    <button
                      onClick={() => {
                        setRejectionModalBooking(proofModalBooking);
                        setProofModalBooking(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                    >
                      ✕ Tolak DP
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setProofModalBooking(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
