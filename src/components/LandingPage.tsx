import React, { useState } from 'react';
import { Camera, Calendar, Check, Star, Shield, MapPin, Phone, Mail, ChevronDown, Sparkles, Play, Image as ImageIcon, ArrowRight, MessageCircle } from 'lucide-react';
import { PackageItem, PortfolioItem, Review, StudioSettings, EventType } from '../types';

interface LandingPageProps {
  packages: PackageItem[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  settings?: StudioSettings;
  onOpenBookingWithPackage: (pkg?: PackageItem) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  packages,
  portfolio,
  reviews,
  settings,
  onOpenBookingWithPackage
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [activeLightbox, setActiveLightbox] = useState<PortfolioItem | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const categories = ['Semua', 'Wedding', 'Prewedding', 'Graduation', 'Family', 'Product', 'Corporate'];

  const filteredPortfolio = selectedCategory === 'Semua'
    ? portfolio
    : portfolio.filter((item) => item.category === selectedCategory);

  const faqs = [
    {
      q: 'Bagaimana sistem pembayaran DP dan pelunasan di HadsProject?',
      a: 'Pembayaran DP minimal sesuai paket (mulai 30%). Setelah Anda mengirim bukti transfer DP melalui halaman Payment, status booking Anda akan diverifikasi oleh Admin. Sisa pelunasan dapat dilakukan pada H-1 atau hari H acara.'
    },
    {
      q: 'Berapa lama proses pengerjaan hasil foto dan video?',
      a: 'Master softcopy foto dikirim melalui Google Drive dalam 24-48 jam setelah acara. Hasil edit foto pilihan dan video cinematic dikirim dalam 7-14 hari kerja.'
    },
    {
      q: 'Apakah bisa melakukan reschedule atau perpindahan jadwal foto?',
      a: 'Bisa! Reschedule jadwal dapat dilakukan maksimal H-7 sebelum acara selama slot tanggal dan jam pengganti masih tersedia di kalender booking HadsProject.'
    },
    {
      q: 'Apakah HadsProject melayani sesi di luar Jabodetabek?',
      a: 'Ya, tim kami melayani sesi foto di seluruh wilayah Indonesia maupun destinasi mancanegara (Out of Town / Destination Photography) dengan penyesuaian biaya akomodasi.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#1A0309] text-neutral-100 font-sans selection:bg-[#D4AF37] selection:text-black">
      
      {/* 1. HERO BANNER */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-24">
        {/* Background Image with Dark Burgundy Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"
            alt="HadsProject Hero Photography & Videography"
            className="w-full h-full object-cover opacity-25 scale-105 animate-pulse transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A0309] via-[#1A0309]/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(26,3,9,0.9)_100%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Premium Photography & Videography</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif tracking-tight text-white leading-tight">
            Timeless <span className="italic text-[#D4AF37]">Elegance</span> Visuals
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-gray-300 font-light leading-relaxed uppercase tracking-wider">
            Capturing the moments that define your legacy. HadsProject Photography & Videography brings haute-couture lighting, authentic emotion, and cinema-grade color grading.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onOpenBookingWithPackage()}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-widest rounded-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Session Now</span>
            </button>

            <a
              href="#portfolio"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold text-xs uppercase tracking-widest rounded-sm transition-all flex items-center justify-center space-x-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Lihat Portofolio</span>
            </a>
          </div>

          {/* Highlights Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 text-left max-w-4xl mx-auto border-t border-amber-500/20">
            <div>
              <span className="text-2xl font-bold text-amber-300 font-serif">500+</span>
              <p className="text-xs text-neutral-400">Momen Terabadikan</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-300 font-serif">100%</span>
              <p className="text-xs text-neutral-400">Kepuasan Klien</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-300 font-serif">4K Drone</span>
              <p className="text-xs text-neutral-400">Aerial Cinematography</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-300 font-serif">Fast Drive</span>
              <p className="text-xs text-neutral-400">Delivery 24-48 Jam</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PORTFOLIO PHOTOGRAPHY & VIDEOGRAPHY */}
      <section id="portfolio" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Gallery Karya</span>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">Portofolio Photography & Videography</h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
            Jelajahi keindahan visual karya dokumentasi foto & video tim HadsProject dari berbagai kategori acara
          </p>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#D4AF37] text-black shadow-md'
                    : 'bg-[#2A0610] text-gray-300 border border-[#D4AF37]/20 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPortfolio.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveLightbox(item)}
              className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 transition-all cursor-pointer shadow-lg aspect-[4/5]"
            >
              <img
                src={item.mediaUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-neutral-950 uppercase tracking-wider mb-1">
                  {item.category}
                </span>
                <h3 className="text-sm font-bold text-amber-100 font-serif line-clamp-1">{item.title}</h3>
                <span className="text-[10px] text-amber-300/80 flex items-center gap-1 mt-1">
                  Klik untuk memperbesar
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Portfolio Lightbox Modal */}
        {activeLightbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn" onClick={() => setActiveLightbox(null)}>
            <div className="relative max-w-4xl w-full bg-neutral-900 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveLightbox(null)}
                className="absolute top-4 right-4 p-2 bg-neutral-950/80 rounded-full text-white hover:text-amber-400 z-10"
              >
                ✕
              </button>
              <img
                src={activeLightbox.mediaUrl}
                alt={activeLightbox.title}
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
              <div className="mt-4 flex items-center justify-between text-xs text-neutral-300 px-2">
                <div>
                  <h4 className="text-base font-bold text-amber-300 font-serif">{activeLightbox.title}</h4>
                  <span className="text-neutral-400">Kategori: {activeLightbox.category}</span>
                </div>
                <button
                  onClick={() => {
                    setActiveLightbox(null);
                    onOpenBookingWithPackage();
                  }}
                  className="px-4 py-2 rounded-full bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition-colors"
                >
                  Booking Kategori Ini
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. PAKET HARGA */}
      <section id="paket" className="py-20 bg-[#130207] border-y border-[#D4AF37]/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Penawaran Spesial</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">Paket Harga Photography & Videography</h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
              Pilihan paket foto & video terlengkap dengan transparansi harga dan fasilitas premium
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="relative bg-neutral-900 border border-amber-500/30 rounded-3xl overflow-hidden hover:border-amber-400 shadow-xl flex flex-col transition-all hover:-translate-y-1"
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={pkg.coverUrl}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-bold uppercase tracking-wider">
                    {pkg.category}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-amber-200 font-serif mb-2">{pkg.name}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">{pkg.description}</p>

                    <div className="pb-4 border-b border-neutral-800">
                      <span className="text-2xl font-bold text-amber-400 font-serif">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </span>
                      <span className="block text-[11px] text-amber-300/80 font-medium mt-1">
                        DP Minimal: Rp {pkg.minDp.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Features List */}
                    <ul className="mt-4 space-y-2.5 text-xs text-neutral-300">
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Durasi: <strong>{pkg.duration}</strong></span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Foto: {pkg.photoCount}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Video: {pkg.videoCount}</span>
                      </li>
                      {pkg.drone && (
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-amber-300 font-semibold">Includes 4K Aerial Drone Coverage</span>
                        </li>
                      )}
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Album: {pkg.album}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Cetak: {pkg.cetak}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Bonus: {pkg.bonus}</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => onOpenBookingWithPackage(pkg)}
                    className="w-full py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-neutral-950 hover:from-amber-400 hover:to-amber-200 transition-all shadow-md shadow-amber-500/20"
                  >
                    Pilih Paket & Reservasi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TESTIMONI / REVIEWS */}
      <section id="testimoni" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Kepuasan Pelanggan</span>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-amber-100">Ulasan & Testimoni Klien</h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
            Pengalaman nyata pasangan dan klien yang mempercayakan momen terbaik mereka pada HadsProject
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all shadow-lg"
            >
              <div className="space-y-3">
                {/* Stars */}
                <div className="flex text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-xs text-neutral-300 italic leading-relaxed">
                  "{rev.comment}"
                </p>

                {rev.photoUrl && (
                  <img
                    src={rev.photoUrl}
                    alt="Review Proof"
                    className="w-full h-36 object-cover rounded-xl mt-2 border border-neutral-800"
                  />
                )}
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-neutral-800">
                <img
                  src={rev.customerPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.customerName)}&background=D4AF37&color=000`}
                  alt={rev.customerName}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400"
                />
                <div>
                  <h4 className="text-xs font-bold text-amber-200">{rev.customerName}</h4>
                  <span className="text-[10px] text-neutral-500">Klien {rev.eventType || 'HadsProject'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. TENTANG HADSPROJECT */}
      <section id="tentang" className="py-20 bg-neutral-950 border-y border-amber-500/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Filosofi & Dedikasi</span>
            <h2 className="text-3xl sm:text-5xl font-bold font-serif text-amber-100 leading-tight">
              Seni Mengabadikan Cerita Tanpa Batas Waktu
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Didirikan oleh para fotografer profesional berdedikasi tinggi, HadsProject percaya bahwa setiap klik tombol shutter adalah rekaman sejarah pribadi yang tak ternilai harganya.
            </p>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Kami menggabungkan kamera sensor full-frame terbaru, lensa kelas premium G-Master/Art, peralatan tata cahaya profoto, serta sinematografi udara 4K drone untuk menghasilkan visual memukau.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
                <Shield className="w-6 h-6 text-amber-400 mb-2" />
                <h4 className="text-xs font-bold text-neutral-200">Garansi Kualitas</h4>
                <p className="text-[11px] text-neutral-400 mt-1">Editing warna dan retouching detail terbaik.</p>
              </div>
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
                <Camera className="w-6 h-6 text-amber-400 mb-2" />
                <h4 className="text-xs font-bold text-neutral-200">Gear Profesional</h4>
                <p className="text-[11px] text-neutral-400 mt-1">Peralatan kamera & lighting kualifikasi industri.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80"
                alt="Studio Photographers"
                className="w-full h-[450px] object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-neutral-900 border border-amber-400/40 p-6 rounded-2xl shadow-2xl max-w-xs">
              <span className="text-3xl font-bold font-serif text-amber-400">8+ Tahun</span>
              <p className="text-xs text-neutral-300 mt-1 font-medium">Pengalaman dokumentasi profesional di Indonesia.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Informasi Pertanyaan</span>
          <h2 className="text-3xl font-bold font-serif text-amber-100">Pertanyaan Sering Diajukan (FAQ)</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between font-semibold text-xs sm:text-sm text-amber-200 hover:text-amber-300"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaqIndex === idx && (
                <div className="px-6 pb-4 text-xs text-neutral-400 border-t border-neutral-800/60 pt-3 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. KONTAK & REKENING PREVIEW */}
      <section id="kontak" className="py-20 bg-neutral-950 border-t border-amber-500/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Hubungi Kami</span>
            <h2 className="text-3xl font-bold font-serif text-amber-100">Konsultasi Sesi Foto Anda</h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Tim customer support HadsProject siap menjawab pertanyaan dan mendiskusikan konsep acara Anda kapan saja.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-3 text-xs text-neutral-300">
                <MapPin className="w-5 h-5 text-amber-400" />
                <span>{settings?.studioAddress || 'Jl. Kemang Raya No. 45, Jakarta Selatan'}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-neutral-300">
                <Phone className="w-5 h-5 text-amber-400" />
                <span>+{settings?.whatsappNumber || '6281234567890'}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-neutral-300">
                <Mail className="w-5 h-5 text-amber-400" />
                <span>{settings?.studioEmail || 'booking@hadsproject.com'}</span>
              </div>
            </div>

            {/* Direct WhatsApp CTA */}
            <a
              href={`https://wa.me/${settings?.whatsappNumber || '6281234567890'}?text=Halo%20HadsProject,%20saya%20ingin%20tanya%20paket%20fotografi`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat WhatsApp Langsung</span>
            </a>
          </div>

          {/* Payment Account Card */}
          <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Rekening Resmi Pembayaran DP</h3>
            <p className="text-xs text-neutral-400">
              Setiap pembayaran DP ditransfer ke rekening resmi studio HadsProject di bawah ini:
            </p>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Bank Resmi:</span>
                <span className="font-bold text-amber-400">{settings?.bankName || 'BANK BCA'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Atas Nama:</span>
                <span className="font-bold text-neutral-200">{settings?.accountHolder || 'HadsProject Studio'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Nomor Rekening:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">{settings?.bankAccount || '8835091244'}</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-neutral-500 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Sistem konfirmasi otomatis realtime dengan unggah bukti transfer.</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
