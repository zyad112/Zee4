import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  handle: string;
  photoURL: string;
  coverURL?: string;
  bio: string;
  createdAt: number;
  followersCount: number;
  followingCount: number;
  phoneNumber?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  isSetupComplete?: boolean;
  isVerified?: boolean;
  verificationExpiry?: number;
  hasUsedFreeVerification?: boolean;
  privacySettings?: {
    showEmail?: boolean;
    allowMessagesFrom?: 'everyone' | 'friends';
    readReceipts?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let unsubProfile: () => void;
    
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: (user.displayName || 'User').substring(0, 50),
            handle: `@${(user.email?.split('@')[0] || user.uid).substring(0, 15)}`,
            photoURL: (user.photoURL || '').substring(0, 2000),
            bio: 'Hello, I am using Zee 4!',
            createdAt: Date.now(),
            followersCount: 0,
            followingCount: 0,
            isSetupComplete: false,
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(docSnap.data() as UserProfile);
        }

        unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (unsubProfile) unsubProfile();
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

