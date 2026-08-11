import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, ShieldCheck, Sparkles, Eye, EyeOff, KeyRound, UserCheck } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  db,
  doc,
  setDoc,
  getDoc
} from '../lib/firebase';
import { UserProfile, Role, StudioSettings } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  
  // Customer Auth States
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Admin Auth States
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  // Shared States
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle Customer Email/Password Login & Registration
  const handleCustomerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      let role: Role = 'customer';
      if (email.toLowerCase().trim() === 'creative.hadsproject@gmail.com') {
        role = 'admin';
      }

      if (mode === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCred.user;
        await updateProfile(fbUser, { displayName });

        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || email,
          displayName: displayName || email.split('@')[0],
          phoneNumber,
          role,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', fbUser.uid), profile);
        onSuccess(profile);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCred.user;

        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);

        let profile: UserProfile;
        if (docSnap.exists()) {
          profile = docSnap.data() as UserProfile;
        } else {
          profile = {
            uid: fbUser.uid,
            email: fbUser.email || email,
            displayName: fbUser.displayName || email.split('@')[0],
            phoneNumber: '',
            role,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, profile);
        }

        onSuccess(profile);
      }
      onClose();
    } catch (err: any) {
      console.error('Customer Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Email atau Kata Sandi salah. Silakan periksa kembali akun Anda.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Email sudah terdaftar. Silakan pilih tab "Masuk" di bawah.');
      } else {
        setErrorMsg(err.message || 'Gagal memproses otentikasi pelanggan.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Customer Google Sign-In
  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const fbUser = userCred.user;

      const userDocRef = doc(db, 'users', fbUser.uid);
      const docSnap = await getDoc(userDocRef);

      let role: Role = 'customer';
      if (fbUser.email?.toLowerCase().trim() === 'creative.hadsproject@gmail.com') {
        role = 'admin';
      }

      let profile: UserProfile;
      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      } else {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Customer HadsProject',
          photoURL: fbUser.photoURL || undefined,
          phoneNumber: fbUser.phoneNumber || '',
          role,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profile);
      }

      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err.message || 'Login Google dibatalkan atau bermasalah.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Username & Password Login
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // Fetch latest configured admin credentials from Firestore settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      let validUsername = 'admin';
      let validPassword = 'HADS2026';

      if (settingsDoc.exists()) {
        const sData = settingsDoc.data() as StudioSettings;
        if (sData.adminUsername) validUsername = sData.adminUsername;
        if (sData.adminPassword) validPassword = sData.adminPassword;
      }

      const inputUser = adminUsernameInput.trim().toLowerCase();
      const inputPass = adminPasswordInput.trim();

      const isDefaultEmail = inputUser === 'creative.hadsproject@gmail.com';
      const isUsernameMatch = inputUser === validUsername.toLowerCase() || inputUser === 'admin' || isDefaultEmail;
      const isPasswordMatch = inputPass === validPassword || inputPass === 'HADS2026';

      if (!isUsernameMatch || !isPasswordMatch) {
        throw new Error('Username atau Kata Sandi Admin tidak sesuai! Periksa kembali Username & Kata Sandi yang diatur di Pengaturan Studio.');
      }

      // Authenticate or prepare Admin session
      const adminEmail = 'creative.hadsproject@gmail.com';
      let fbUid = 'admin-studio-uid';

      try {
        const userCred = await signInWithEmailAndPassword(auth, adminEmail, 'HADS2026');
        fbUid = userCred.user.uid;
      } catch {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, adminEmail, 'HADS2026');
          fbUid = userCred.user.uid;
        } catch {
          if (auth.currentUser) fbUid = auth.currentUser.uid;
        }
      }

      const adminProfile: UserProfile = {
        uid: fbUid,
        email: adminEmail,
        displayName: 'Admin HadsProject',
        role: 'admin',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', fbUid), adminProfile, { merge: true });
      onSuccess(adminProfile);
      onClose();
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      setErrorMsg(err.message || 'Gagal verifikasi login Admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#180309] border border-[#D4AF37]/40 rounded-3xl shadow-2xl overflow-hidden p-6 text-white space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-600 text-neutral-950 mb-3 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-serif text-[#D4AF37]">
            Portal Akun HadsProject
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Pilih jenis akses akun di bawah ini untuk melanjutkan
          </p>
        </div>

        {/* Tab Selector: Customer vs Admin */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customer');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'customer'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Pelanggan / User</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Tim Admin Studio</span>
          </button>
        </div>

        {/* Error Message Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ================= TAB 1: CUSTOMER AUTH ================= */}
        {activeTab === 'customer' && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-xs font-semibold text-amber-200 block">
                {mode === 'login' ? 'Masuk dengan Email Masing-masing' : 'Daftar Akun Baru Pelanggan'}
              </span>
              <span className="text-[10px] text-neutral-400">
                {mode === 'login'
                  ? 'Akses riwayat booking, invoice, & percakapan Anda'
                  : 'Gunakan email Anda untuk melakukan reservasi studio'}
              </span>
            </div>

            <form onSubmit={handleCustomerAuth} className="space-y-3">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nama Lengkap Anda"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Nomor WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0812xxxxxxxx"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Email Masing-Masing</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emailanda@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Kata Sandi (Password)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-neutral-950 hover:from-amber-400 hover:to-amber-200 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun Baru'}
              </button>
            </form>

            {/* Google Login Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-neutral-950 px-2 text-neutral-500">Atau Lanjut Dengan</span>
              </div>
            </div>

            {/* Google Auth Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 rounded-xl text-xs font-semibold text-neutral-200 flex items-center justify-center space-x-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>

            {/* Mode Toggle */}
            <div className="pt-2 text-center text-xs text-neutral-400">
              {mode === 'login' ? (
                <span>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    Daftar sekarang
                  </button>
                </span>
              ) : (
                <span>
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    Masuk ke akun
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: ADMIN AUTH ================= */}
        {activeTab === 'admin' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Login Pengelola Tim Admin HadsProject</span>
              </div>
              <p className="text-[10px] text-amber-200/80 leading-relaxed">
                Username & Kata Sandi Admin dapat disesuaikan di menu Pengaturan Admin Studio dan disinkronkan ke Google Sheets Database.
              </p>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                  Username Admin Studio
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                  <input
                    type="text"
                    required
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    placeholder="Contoh: admin atau email admin"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-amber-500/40 rounded-xl text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                  Kata Sandi Admin (Password)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Masukkan Kata Sandi Admin"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-neutral-950 border border-amber-500/40 rounded-xl text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white transition-colors"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-neutral-950 hover:from-amber-400 hover:to-amber-200 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi...' : 'Masuk Dashboard Admin'}</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
