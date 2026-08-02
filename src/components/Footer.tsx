import React from 'react';
import { Camera, Phone, Mail, MapPin, Instagram, Facebook, Youtube } from 'lucide-react';
import { StudioSettings } from '../types';

interface FooterProps {
  settings?: StudioSettings;
  onOpenBooking: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onOpenBooking }) => {
  return (
    <footer className="bg-[#130207] border-t border-[#D4AF37]/20 text-neutral-300 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-sm overflow-hidden bg-[#2A0610] border border-[#D4AF37]/40 p-0.5 flex items-center justify-center">
                <img 
                  src="https://lh3.googleusercontent.com/d/1u11Mtpx_1-aukHgNt-0KQ-3zZs-exiwP" 
                  alt="HadsProject Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://drive.google.com/uc?export=view&id=1u11Mtpx_1-aukHgNt-0KQ-3zZs-exiwP";
                  }}
                />
              </div>
              <div>
                <span className="font-serif text-2xl tracking-widest text-[#D4AF37] uppercase font-bold block leading-none">
                  HADSPROJECT
                </span>
                <span className="text-[9px] tracking-[0.2em] text-neutral-300 font-sans uppercase mt-0.5 block">
                  Photography & Videography
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-wider">
              Capturing the moments that define your legacy. Visuals crafted with timeless precision & prestige.
            </p>
            <div className="flex space-x-3 pt-2">
              <a href="#" className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-4 border-b border-white/10 pb-2">Navigasi Utama</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#portfolio" className="hover:text-white transition-colors">Portofolio Fotografi</a></li>
              <li><a href="#paket" className="hover:text-white transition-colors">Paket & Harga</a></li>
              <li><a href="#testimoni" className="hover:text-white transition-colors">Ulasan Klien</a></li>
              <li><a href="#tentang" className="hover:text-white transition-colors">Tentang HadsProject</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Pertanyaan Umum (FAQ)</a></li>
            </ul>
          </div>

          {/* Service Categories */}
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-4 border-b border-white/10 pb-2">Layanan Foto</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-white transition-colors">Wedding & Akad Nikah</li>
              <li className="hover:text-white transition-colors">Prewedding Outdoor / Studio</li>
              <li className="hover:text-white transition-colors">Graduation & Wisuda</li>
              <li className="hover:text-white transition-colors">Family & Birthday Party</li>
              <li className="hover:text-white transition-colors">Product & Brand Campaign</li>
            </ul>
          </div>

          {/* Studio Contact & Action */}
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-4 border-b border-white/10 pb-2">Studio HadsProject</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{settings?.studioAddress || 'Jakarta Indonesia'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>{settings?.whatsappNumber || '085284206829'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>{settings?.studioEmail || 'creative.hadsproject@gmail.com'}</span>
              </li>
            </ul>
            <button
              onClick={onOpenBooking}
              className="mt-5 w-full py-3 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all"
            >
              Book Session Now
            </button>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
          <p>© {new Date().getFullYear()} HadsProject Photography. Professional Grade Visuals.</p>
          <p className="mt-2 sm:mt-0">Timeless Elegance & Premium Legacy.</p>
        </div>
      </div>
    </footer>
  );
};
