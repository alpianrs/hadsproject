import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, User, Phone, Mail, FileText, CheckCircle2, AlertCircle, Camera, Sparkles } from 'lucide-react';
import { PackageItem, EventType, Booking, UserProfile, BlockedSlot, StudioSettings } from '../types';
import { db, collection, getDocs, addDoc, query, where, doc, getDoc } from '../lib/firebase';
import { sendToGoogleSheets } from '../lib/googleSheets';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage?: PackageItem | null;
  packages: PackageItem[];
  currentUser: UserProfile | null;
  onBookingCreated: (booking: Booking) => void;
}

const TIME_SLOTS = [
  '08.00 - 12.00',
  '12.00 - 16.00',
  '16.00 - 20.00',
  '20.00 - 24.00',
  'Full Day (1 Hari Penuh - Blokir 08.00 - 24.00)'
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedPackage: initialPackage,
  packages,
  currentUser,
  onBookingCreated
}) => {
  const [chosenPackage, setChosenPackage] = useState<PackageItem | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<string>('08.00 - 12.00');
  const [notes, setNotes] = useState('');
  
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default form values from user profile or selected package
  useEffect(() => {
    if (initialPackage) {
      setChosenPackage(initialPackage);
      setEventType(initialPackage.category || 'Wedding');
    } else if (packages.length > 0 && !chosenPackage) {
      setChosenPackage(packages[0]);
    }

    if (currentUser) {
      setCustomerName(currentUser.displayName || '');
      setCustomerEmail(currentUser.email || '');
      setCustomerPhone(currentUser.phoneNumber || '');
    }

    // Default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setDate(dateStr);
  }, [initialPackage, packages, currentUser, isOpen]);

  // Fetch booked and blocked dates from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailability = async () => {
      try {
        const bkgSnap = await getDocs(collection(db, 'bookings'));
        const bkgs: Booking[] = [];
        bkgSnap.forEach((docSnap) => {
          const data = docSnap.data() as Booking;
          if (data.status !== 'Dibatalkan') {
            bkgs.push({ ...data, id: docSnap.id });
          }
        });
        setExistingBookings(bkgs);

        const blkSnap = await getDocs(collection(db, 'blockedSlots'));
        const blks: BlockedSlot[] = [];
        blkSnap.forEach((docSnap) => {
          blks.push({ ...(docSnap.data() as BlockedSlot), id: docSnap.id });
        });
        setBlockedSlots(blks);
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      }
    };

    fetchAvailability();
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate number of existing bookings for a slot on selected date (max 2 bookings allowed per slot)
  const getSlotBookingCount = (slot: string) => {
    if (!date) return 0;

    // Check if there's any customer booking for Full Day on this date
    const hasFullDayBooking = existingBookings.some((b) => {
      if (b.date !== date) return false;
      const s = (b.timeSlot || '').toLowerCase();
      return s.includes('full day') || s.includes('1 hari');
    });

    if (hasFullDayBooking) return 2; // Full day is booked, all slots blocked!

    // Check admin blocked slots
    const isBlockedByAdmin = blockedSlots.some((b) => {
      if (b.date !== date) return false;
      if (b.isFullDay || b.timeSlot === 'ALL') return true;
      if (b.timeSlot === slot) return true;
      if (slot.includes('Full Day') && b.timeSlot) return true;
      if (slot.includes('08.00') && (b.timeSlot === '09.00' || b.timeSlot === '11.00')) return true;
      if (slot.includes('12.00') && (b.timeSlot === '13.00' || b.timeSlot === '15.00')) return true;
      if (slot.includes('16.00') && b.timeSlot === '17.00') return true;
      return false;
    });

    if (isBlockedByAdmin) return 2; // Treat as fully blocked (2/2)

    // If requested slot is "Full Day", check if ANY booking exists on this date
    if (slot.includes('Full Day')) {
      const anyBookingOnDate = existingBookings.some((b) => b.date === date);
      if (anyBookingOnDate) return 2; // Can't book Full Day if part of date is already booked
    }

    // Count active customer bookings matching this date and timeSlot
    const bookingCount = existingBookings.filter((b) => {
      if (b.date !== date) return false;
      if (b.timeSlot === slot) return true;
      if (slot.includes('08.00') && (b.timeSlot === '09.00' || b.timeSlot === '11.00')) return true;
      if (slot.includes('12.00') && (b.timeSlot === '13.00' || b.timeSlot === '15.00')) return true;
      if (slot.includes('16.00') && b.timeSlot === '17.00') return true;
      return false;
    }).length;

    return bookingCount;
  };

  const isSlotFull = (slot: string) => {
    return getSlotBookingCount(slot) >= 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenPackage) {
      setErrorMsg('Pilih paket foto & video terlebih dahulu.');
      return;
    }
    if (!date || !timeSlot) {
      setErrorMsg('Pilih tanggal dan jam slot sesi.');
      return;
    }
    if (isSlotFull(timeSlot)) {
      setErrorMsg(`Jam slot ${timeSlot} pada tanggal ${date} sudah penuh terisi 2/2 booking (dicoret). Silakan pilih slot jam lain.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const dpAmount = chosenPackage.minDp || Math.round(chosenPackage.price * 0.3);
      const remainingAmount = chosenPackage.price - dpAmount;
      const invoiceNumber = `INV-HADS-${Date.now().toString().slice(-6)}`;

      const newBooking: Omit<Booking, 'id'> = {
        customerId: currentUser?.uid || 'guest-' + Date.now(),
        customerName,
        customerPhone,
        customerEmail,
        packageId: chosenPackage.id,
        packageName: chosenPackage.name,
        eventType,
        location,
        date,
        timeSlot,
        notes,
        totalPrice: chosenPackage.price,
        dpAmount,
        remainingAmount,
        status: 'Menunggu DP',
        invoiceNumber,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'bookings'), newBooking);
      const created: Booking = { ...newBooking, id: docRef.id };

      // Push to Google Sheets if WebApp URL is configured
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data() as StudioSettings;
          if (sData.googleSheetsAppScriptUrl) {
            sendToGoogleSheets(sData.googleSheetsAppScriptUrl, 'sync_booking', created);
          }
        }
      } catch (e) {
        console.warn('Auto sync booking to Google Sheets error:', e);
      }

      // Add notification for customer
      await addDoc(collection(db, 'notifications'), {
        userId: created.customerId,
        title: 'Booking Berhasil Dibuat',
        message: `Booking paket ${created.packageName} untuk tanggal ${created.date} jam ${created.timeSlot} telah dibuat. Silakan lakukan transfer DP Rp ${created.dpAmount.toLocaleString('id-ID')}.`,
        type: 'booking',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: created.id
      });

      onBookingCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Create booking error:', err);
      setErrorMsg(err.message || 'Gagal membuat booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-[#20040C] border border-[#D4AF37]/40 rounded-2xl shadow-2xl overflow-hidden my-auto p-4 sm:p-6 text-white max-h-[92vh] flex flex-col">
        
        {/* Header - Fixed at Top */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm bg-[#D4AF37] text-black flex items-center justify-center font-bold shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-serif text-[#D4AF37]">Formulir Booking HadsProject</h3>
              <p className="text-[11px] sm:text-xs text-gray-300">Pilih jadwal, waktu slot, dan informasi acara foto & video Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto mt-3 sm:mt-4 pr-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Choose Package */}
          <div className="space-y-2">
            <label className="block text-[#D4AF37] font-semibold mb-1">Paket Photography & Videography</label>
            <select
              value={chosenPackage?.id || ''}
              onChange={(e) => {
                const p = packages.find((pkg) => pkg.id === e.target.value);
                if (p) setChosenPackage(p);
              }}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-[#D4AF37]"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Rp {p.price.toLocaleString('id-ID')} [Durasi: {p.durationHours || 4} Jam]
                </option>
              ))}
            </select>

            {chosenPackage && (
              <div className="p-3 bg-[#2A0610] border border-[#D4AF37]/30 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#D4AF37] block">{chosenPackage.name}</span>
                  <span className="text-[11px] text-gray-300">
                    {chosenPackage.duration} ({chosenPackage.photoCount})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-gray-400 block">Durasi Ditentukan:</span>
                  <span className="font-mono font-bold text-base text-[#D4AF37]">
                    ⏱ {chosenPackage.durationHours || 4} Jam
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Event Type & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 mb-1">Jenis Acara</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Wedding">Wedding (Pernikahan / Akad)</option>
                <option value="Prewedding">Prewedding (Outdoor / Indoor)</option>
                <option value="Graduation">Graduation (Wisuda)</option>
                <option value="Birthday">Birthday Party</option>
                <option value="Family">Family Session</option>
                <option value="Product">Product & Branding</option>
                <option value="Event">Corporate / Event</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-300 mb-1">Lokasi Sesi / Acara</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Hotel Mulia Senayan / Studio Jakarta"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Date Picker & Time Slot Picker */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" /> Pilih Tanggal & Waktu Slot
              </span>
              <span className="text-[10px] text-neutral-400">Sistem Otomatis Cek Ketersediaan</span>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Tanggal Sesi</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-amber-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Jam Slot Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-300 font-medium text-xs">
                  Pilih Jam Slot Sesi (Kapasitas Maksimal 2 Booking per Slot)
                </label>
                <span className="text-[10px] text-[#D4AF37] font-mono font-bold">
                  Max 2 Tim/Slot
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TIME_SLOTS.map((slot) => {
                  const isFullDaySlot = slot.includes('Full Day');
                  const count = getSlotBookingCount(slot);
                  const full = count >= 2;
                  const isSelected = timeSlot === slot;
                  const partial = count === 1;

                  return (
                    <button
                      type="button"
                      key={slot}
                      disabled={full}
                      onClick={() => setTimeSlot(slot)}
                      className={`p-3 rounded-xl font-bold transition-all border text-left flex flex-col justify-between relative overflow-hidden ${
                        isFullDaySlot ? 'sm:col-span-2' : ''
                      } ${
                        full
                          ? 'bg-neutral-950/80 border-red-900/40 cursor-not-allowed opacity-60'
                          : isSelected
                          ? isFullDaySlot
                            ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black border-amber-300 shadow-xl shadow-amber-500/20 scale-[1.01]'
                            : 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-[1.01]'
                          : partial
                          ? 'bg-[#2A0610] text-amber-200 border-amber-500/50 hover:border-amber-400'
                          : isFullDaySlot
                          ? 'bg-amber-950/30 text-amber-200 border-amber-500/40 hover:border-amber-400'
                          : 'bg-neutral-900 text-gray-200 border-white/10 hover:border-[#D4AF37]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-sm font-mono font-bold tracking-wide flex items-center gap-1.5 ${
                            full ? 'line-through decoration-red-500 decoration-2 text-red-400' : ''
                          }`}
                        >
                          {isFullDaySlot && <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />}
                          {slot}
                        </span>

                        {full ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 font-extrabold uppercase tracking-wider">
                            Full / Terisi
                          </span>
                        ) : partial ? (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-black text-amber-300'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            1 Terisi — Sisa 1 Slot
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-black text-[#D4AF37]'
                                : isFullDaySlot
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isFullDaySlot ? '1 Hari Penuh' : 'Tersedia (0/2)'}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className={isSelected ? 'text-black/90 font-semibold' : 'text-gray-400'}>
                          {isFullDaySlot
                            ? 'Memblokir seluruh jam sesi pada tanggal ini secara eksklusif untuk Anda'
                            : 'Durasi: 4 Jam Sesi'}
                        </span>
                        {full && (
                          <span className="text-red-400 font-serif font-bold italic line-through">
                            TERISI PENUH
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {timeSlot.includes('Full Day') && (
                <div className="mt-2.5 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Opsi 1 Hari Penuh Terpilih:</strong> Seluruh jadwal sesi (08.00 - 24.00) pada tanggal <strong>{date}</strong> akan diblokir total khusus untuk tim / acara Anda!
                  </span>
                </div>
              )}

              {getSlotBookingCount(timeSlot) === 1 && (
                <div className="mt-2.5 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-md text-[11px] text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Slot <strong>{timeSlot} WIB</strong> sudah terisi 1 booking. Anda akan memesan <strong>slot ke-2 (kuota terakhir)</strong> untuk jadwal ini.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-neutral-300 mb-1">Nomor WhatsApp</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-neutral-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="email@domain.com"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-neutral-300 mb-1">Catatan Khusus (Konsep / Outfit / Permintaan)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan mengenai lokasi, rundown, atau konsep gaya..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Summary Financials */}
          {chosenPackage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400 block">Status Awal: <strong className="text-amber-300">Menunggu DP</strong></span>
                <span className="text-neutral-200">Total Harga: <strong>Rp {chosenPackage.price.toLocaleString('id-ID')}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block">Down Payment (DP Minimal):</span>
                <span className="text-base font-bold text-amber-400">Rp {(chosenPackage.minDp || Math.round(chosenPackage.price * 0.3)).toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {/* Submit Action & Back Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-white/10 transition-all text-center"
            >
              Kembali / Batal
            </button>
            <button
              type="submit"
              disabled={loading || !chosenPackage}
              className="w-2/3 py-3 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? 'Proses Booking...' : 'Konfirmasi & Lanjut Transfer DP'}
            </button>
          </div>
        </form>

        </div>
      </div>
    </div>
  );
};
