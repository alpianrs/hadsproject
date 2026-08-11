import React, { useState } from 'react';
import { Camera, Calendar, User, LogOut, Shield, Bell, MessageSquare, ChevronDown, Check, Sparkles, Menu, X } from 'lucide-react';
import { UserProfile, AppNotification } from '../types';

interface NavbarProps {
  currentUser: UserProfile | null;
  activeView: 'landing' | 'customer' | 'admin';
  setActiveView: (view: 'landing' | 'customer' | 'admin') => void;
  onOpenAuth: () => void;
  onOpenBooking: () => void;
  onSignOut: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  setActiveView,
  onOpenAuth,
  onOpenBooking,
  onSignOut,
  notifications,
  onMarkNotificationRead,
}) => {
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNavClick = (sectionId?: string) => {
    setMobileMenuOpen(false);
    if (activeView !== 'landing') {
      setActiveView('landing');
    }
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1A0309]/95 backdrop-blur-md border-b border-[#D4AF37]/20 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => handleNavClick()}
          >
            <div className="relative w-9 h-9 rounded-sm overflow-hidden bg-[#2A0610] border border-[#D4AF37]/40 p-0.5 flex items-center justify-center group-hover:scale-105 transition-transform">
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
              <span className="font-serif text-xl sm:text-2xl tracking-widest text-[#D4AF37] uppercase font-bold block leading-none">
                HADSPROJECT
              </span>
              <span className="block text-[8px] sm:text-[9px] tracking-[0.2em] text-neutral-300 font-sans uppercase mt-0.5">
                Photography & Videography
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 text-xs uppercase tracking-[0.15em] font-medium">
            <button
              onClick={() => handleNavClick()}
              className={`transition-colors pb-1 ${
                activeView === 'landing'
                  ? 'text-white border-b border-[#D4AF37]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Beranda
            </button>
            <button onClick={() => handleNavClick('portfolio')} className="text-gray-400 hover:text-white transition-colors">
              Portfolio
            </button>
            <button onClick={() => handleNavClick('paket')} className="text-gray-400 hover:text-white transition-colors">
              Paket
            </button>
            <button onClick={() => handleNavClick('testimoni')} className="text-gray-400 hover:text-white transition-colors">
              Testimoni
            </button>
            <button onClick={() => handleNavClick('tentang')} className="text-gray-400 hover:text-white transition-colors">
              Tentang
            </button>
            <button onClick={() => handleNavClick('kontak')} className="text-gray-400 hover:text-white transition-colors">
              Kontak
            </button>
            {currentUser && currentUser.role === 'customer' && (
              <button
                onClick={() => {
                  setActiveView('customer');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                  activeView === 'customer'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                Dashboard Saya
              </button>
            )}
            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveView('admin');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                  activeView === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                Admin Panel
              </button>
            )}
          </nav>

          {/* Actions & User State */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Booking Button */}
            <button
              onClick={onOpenBooking}
              className="px-3 sm:px-4 py-2 bg-[#D4AF37] text-black text-[11px] sm:text-xs font-bold uppercase tracking-widest rounded-sm hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1.5 shadow-md"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Session</span>
            </button>

            {/* Notification Center */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifPopover(!showNotifPopover)}
                  className="p-2 text-neutral-300 hover:text-amber-400 rounded-full hover:bg-neutral-800 transition-colors relative"
                  title="Notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-neutral-950 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover */}
                {showNotifPopover && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 p-4 text-sm text-neutral-200">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <span className="font-semibold text-amber-400 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Notifikasi & Reminder
                      </span>
                      <span className="text-xs text-neutral-400">{notifications.length} Pesan</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 mt-3 pr-1">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-neutral-500 text-xs">
                          Belum ada notifikasi baru
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => onMarkNotificationRead(n.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              n.isRead
                                ? 'bg-neutral-950/50 border-neutral-800/60 text-neutral-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-neutral-100 font-medium'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-xs text-amber-300">{n.title}</span>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                            </div>
                            <p className="text-xs mt-1 text-neutral-300 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-neutral-500 block mt-2">{n.createdAt}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Dropdown or Login Button */}
            {!currentUser ? (
              <button
                onClick={onOpenAuth}
                className="px-3 sm:px-4 py-2 text-xs font-medium border border-amber-400/40 text-amber-300 hover:border-amber-400 hover:bg-amber-400/10 rounded-full transition-all flex items-center space-x-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Masuk / Daftar</span>
                <span className="sm:hidden">Masuk</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-1 rounded-full bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 transition-all"
                >
                  <img
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=D4AF37&color=000`}
                    alt="User Avatar"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-amber-400/40"
                  />
                  <span className="hidden sm:inline text-xs font-semibold text-neutral-200 max-w-[100px] truncate">
                    {currentUser.displayName || 'Customer'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 p-2 text-xs text-neutral-200">
                    <div className="px-3 py-2 border-b border-neutral-800 mb-1">
                      <p className="font-bold text-amber-400 truncate">{currentUser.displayName}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{currentUser.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                        currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        {currentUser.role === 'admin' ? 'Admin HadsProject' : 'Customer'}
                      </span>
                    </div>

                    {currentUser.role === 'customer' && (
                      <button
                        onClick={() => {
                          setActiveView('customer');
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 transition-colors ${
                          activeView === 'customer' ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <User className="w-4 h-4 text-amber-400" />
                        <span>Dashboard Customer</span>
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveView('admin');
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 transition-colors ${
                          activeView === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Dashboard Admin</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onSignOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 text-red-400 hover:bg-red-500/10 transition-colors mt-1 border-t border-neutral-800/80"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 lg:hidden text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#1A0309] border-b border-[#D4AF37]/30 px-4 pt-3 pb-6 space-y-3 animate-fadeIn text-xs uppercase tracking-wider">
          <button
            onClick={() => handleNavClick()}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-semibold transition-colors ${
              activeView === 'landing' ? 'bg-[#2A0610] text-[#D4AF37]' : 'text-gray-300 hover:bg-neutral-900'
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => handleNavClick('portfolio')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-gray-300 hover:bg-neutral-900 transition-colors"
          >
            Portofolio
          </button>
          <button
            onClick={() => handleNavClick('paket')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-gray-300 hover:bg-neutral-900 transition-colors"
          >
            Paket Harga
          </button>
          <button
            onClick={() => handleNavClick('testimoni')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-gray-300 hover:bg-neutral-900 transition-colors"
          >
            Testimoni
          </button>
          <button
            onClick={() => handleNavClick('tentang')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-gray-300 hover:bg-neutral-900 transition-colors"
          >
            Tentang Studio
          </button>
          <button
            onClick={() => handleNavClick('kontak')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-gray-300 hover:bg-neutral-900 transition-colors"
          >
            Kontak & Lokasi
          </button>

          {currentUser && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-2">
              {currentUser.role === 'customer' && (
                <button
                  onClick={() => {
                    setActiveView('customer');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Buka Dashboard Customer</span>
                </button>
              )}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    setActiveView('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center space-x-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Buka Dashboard Admin</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

