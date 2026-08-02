import React, { useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  db,
  collection,
  onSnapshot,
  getDocs,
  setDoc,
  doc,
  addDoc,
  firebaseSignOut
} from './lib/firebase';
import { UserProfile, PackageItem, PortfolioItem, Review, StudioSettings, Booking, AppNotification } from './types';
import { INITIAL_PACKAGES, INITIAL_PORTFOLIO, INITIAL_REVIEWS, DEFAULT_STUDIO_SETTINGS } from './lib/seedData';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { CustomerDashboard } from './components/CustomerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { MessageCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'landing' | 'customer' | 'admin'>('landing');

  // Firestore collections state
  const [packages, setPackages] = useState<PackageItem[]>(INITIAL_PACKAGES);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(INITIAL_PORTFOLIO);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedPackageForBooking, setSelectedPackageForBooking] = useState<PackageItem | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Fetch or listen user doc from Firestore
        const userDocRef = doc(db, 'users', fbUser.uid);
        const unSubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser(docSnap.data() as UserProfile);
          } else {
            const fallback: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Customer',
              photoURL: fbUser.photoURL || undefined,
              role: 'customer',
              createdAt: new Date().toISOString()
            };
            setDoc(userDocRef, fallback);
            setCurrentUser(fallback);
          }
        });
        return () => unSubDoc();
      } else {
        setCurrentUser(null);
        if (activeView !== 'landing') {
          setActiveView('landing');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Seed & Listen Packages, Portfolio, Reviews, Settings
  useEffect(() => {
    // Packages
    const unSubPkg = onSnapshot(collection(db, 'packages'), async (snap) => {
      if (snap.empty) {
        // Seed initial packages to Firestore
        for (const pkg of INITIAL_PACKAGES) {
          await setDoc(doc(db, 'packages', pkg.id), pkg);
        }
      } else {
        const list: PackageItem[] = [];
        snap.forEach((d) => list.push({ ...d.data() as PackageItem, id: d.id }));
        setPackages(list);
      }
    });

    // Portfolio
    const unSubPort = onSnapshot(collection(db, 'portfolio'), async (snap) => {
      if (snap.empty) {
        for (const p of INITIAL_PORTFOLIO) {
          await setDoc(doc(db, 'portfolio', p.id), p);
        }
      } else {
        const list: PortfolioItem[] = [];
        snap.forEach((d) => list.push({ ...d.data() as PortfolioItem, id: d.id }));
        setPortfolio(list);
      }
    });

    // Reviews
    const unSubRev = onSnapshot(collection(db, 'reviews'), async (snap) => {
      if (snap.empty) {
        for (const r of INITIAL_REVIEWS) {
          await setDoc(doc(db, 'reviews', r.id), r);
        }
      } else {
        const list: Review[] = [];
        snap.forEach((d) => {
          const rev = d.data() as Review;
          if (rev.approved !== false) list.push({ ...rev, id: d.id });
        });
        setReviews(list);
      }
    });

    // Settings
    const unSubSet = onSnapshot(doc(db, 'settings', 'global'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StudioSettings;
        const merged: StudioSettings = {
          ...DEFAULT_STUDIO_SETTINGS,
          ...data,
          googleDriveFolderUrl: data.googleDriveFolderUrl || DEFAULT_STUDIO_SETTINGS.googleDriveFolderUrl
        };
        // Update if bank account is still old seed
        if (data.bankAccount === '8835091244' || !data.googleDriveFolderUrl) {
          await setDoc(doc(db, 'settings', 'global'), DEFAULT_STUDIO_SETTINGS, { merge: true });
        }
        setSettings(merged);
      } else {
        await setDoc(doc(db, 'settings', 'global'), DEFAULT_STUDIO_SETTINGS);
      }
    });

    return () => {
      unSubPkg();
      unSubPort();
      unSubRev();
      unSubSet();
    };
  }, []);

  // Listen user notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const unSubNotif = onSnapshot(collection(db, 'notifications'), (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((d) => {
        const n = d.data() as AppNotification;
        if (n.userId === currentUser.uid || (currentUser.role === 'admin' && n.userId === 'admin')) {
          list.push({ ...n, id: d.id });
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    });

    return () => unSubNotif();
  }, [currentUser]);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setActiveView('landing');
  };

  const handleOpenBookingWithPackage = (pkg?: PackageItem) => {
    if (pkg) {
      setSelectedPackageForBooking(pkg);
    } else {
      setSelectedPackageForBooking(packages[0] || null);
    }
    setIsBookingOpen(true);
  };

  const handleBookingCreated = (booking: Booking) => {
    if (!currentUser) {
      setIsAuthOpen(true);
    } else {
      setActiveView('customer');
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950">
      
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenBooking={() => handleOpenBookingWithPackage()}
        onSignOut={handleSignOut}
        notifications={notifications}
        onMarkNotificationRead={async (id) => {
          try {
            await setDoc(doc(db, 'notifications', id), { isRead: true }, { merge: true });
          } catch (e) {
            console.error(e);
          }
        }}
      />

      {/* Main Body Views */}
      <main className="flex-1">
        {activeView === 'landing' && (
          <LandingPage
            packages={packages}
            portfolio={portfolio}
            reviews={reviews}
            settings={settings}
            onOpenBookingWithPackage={handleOpenBookingWithPackage}
          />
        )}

        {activeView === 'customer' && currentUser && (
          <CustomerDashboard
            currentUser={currentUser}
            settings={settings}
            onOpenBooking={() => handleOpenBookingWithPackage()}
          />
        )}

        {activeView === 'admin' && currentUser && currentUser.role === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            packages={packages}
            portfolio={portfolio}
            reviews={reviews}
            settings={settings}
          />
        )}
      </main>

      {/* Footer */}
      <Footer settings={settings} onOpenBooking={() => handleOpenBookingWithPackage()} />

      {/* Floating WhatsApp Quick Action Button */}
      <a
        href={`https://wa.me/${settings?.whatsappNumber || '6281234567890'}?text=Halo%20HadsProject,%20saya%20ingin%20tanya%20informasi%20booking%20fotografi`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-emerald-500 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 border-white/20 flex items-center justify-center group"
        title="Chat WhatsApp HadsProject"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold pl-0 group-hover:pl-2">
          Chat WhatsApp Studio
        </span>
      </a>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(profile) => {
          setCurrentUser(profile);
          if (profile.role === 'admin') {
            setActiveView('admin');
          } else {
            setActiveView('customer');
          }
        }}
      />

      {/* Booking Calendar & Form Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        selectedPackage={selectedPackageForBooking}
        packages={packages}
        currentUser={currentUser}
        onBookingCreated={handleBookingCreated}
      />

    </div>
  );
}
