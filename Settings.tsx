import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MessageCircle, ShieldCheck, Lock } from 'lucide-react';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [privacySettings, setPrivacySettings] = useState({
    emailVisibility: profile?.privacySettings?.emailVisibility || 'private',
    whoCanMessageMe: profile?.privacySettings?.whoCanMessageMe || 'everyone',
    readReceipts: profile?.privacySettings?.readReceipts ?? true,
  });

  const isVerified = profile?.isVerified && profile?.verificationExpiry && profile.verificationExpiry > Date.now();

  const handlePrivacyChange = async (key: string, value: any) => {
    if (!user) return;
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        privacySettings: newSettings
      });
      toast.success('Privacy settings updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      // Revert on error
      setPrivacySettings(privacySettings);
    }
  };

  const handleFreeVerification = async () => {
    if (!user || !profile) return;
    if (profile.hasUsedFreeVerification) {
      toast.error('You have already used your free verification week.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isVerified: true,
        verificationExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        hasUsedFreeVerification: true,
      });
      toast.success('Free verification activated for 1 week!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to activate free verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !verificationCode.trim()) return;

    const code = verificationCode.trim().toLowerCase();
    
    // Validate code format: zee + number (1 to 3000)
    const isValidFormat = /^zee([1-9]|[1-9][0-9]|[1-9][0-9]{2}|[1-2][0-9]{3}|3000)$/.test(code);
    
    if (!isValidFormat) {
      toast.error('Invalid code format. Must be "zee" followed by a number from 1 to 3000.');
      return;
    }

    setLoading(true);
    try {
      const codeRef = doc(db, 'used_codes', code);
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists()) {
        toast.error('This verification code has already been used.');
        setLoading(false);
        return;
      }

      // Mark code as used
      await setDoc(codeRef, {
        usedBy: user.uid,
        usedAt: Date.now(),
      });

      // Update user verification (e.g., 1 year for pro codes)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isVerified: true,
        verificationExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      toast.success('Professional verification activated successfully!');
      setVerificationCode('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'used_codes');
      toast.error('Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-2 flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings & Support</h1>
      </div>

      <div className="p-4 space-y-8">
        {/* Verification Section */}
        <section className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Verification</h2>
          </div>

          {isVerified ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-bold text-blue-500">You are verified!</p>
                <p className="text-sm text-blue-500/80">
                  Valid until: {new Date(profile?.verificationExpiry || 0).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-zinc-400 mb-4">Get verified to stand out and access premium features.</p>
              
              {!profile?.hasUsedFreeVerification && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFreeVerification}
                  disabled={loading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl transition mb-4"
                >
                  Claim Free 1-Week Verification
                </motion.button>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="font-bold mb-2">Professional Verification</h3>
            <p className="text-sm text-zinc-400 mb-4">Enter your one-time professional verification code (e.g., zee123).</p>
            
            <form onSubmit={handleCodeVerification} className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter code (zee1 - zee3000)"
                className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading || !verificationCode.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-xl transition"
              >
                Verify
              </motion.button>
            </form>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold">Privacy & Security</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Email Visibility</label>
              <select
                value={privacySettings.emailVisibility}
                onChange={(e) => handlePrivacyChange('emailVisibility', e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition appearance-none"
              >
                <option value="public">Public (Everyone can see)</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private (Only me)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Who can message me</label>
              <select
                value={privacySettings.whoCanMessageMe}
                onChange={(e) => handlePrivacyChange('whoCanMessageMe', e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition appearance-none"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Read Receipts</p>
                <p className="text-sm text-zinc-500">Let others know when you've read their messages</p>
              </div>
              <button
                onClick={() => handlePrivacyChange('readReceipts', !privacySettings.readReceipts)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${privacySettings.readReceipts ? 'bg-blue-500' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${privacySettings.readReceipts ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold">Support</h2>
          </div>
          
          <p className="text-zinc-400 mb-6">Need help? Contact our support team directly via WhatsApp or Telegram.</p>
          
          <div className="space-y-4">
            <a 
              href="https://wa.me/201500314798" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#25D366]/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold">WhatsApp</p>
                  <p className="text-sm text-zinc-400">01500314798</p>
                </div>
              </div>
              <span className="text-blue-500 group-hover:translate-x-1 transition-transform">Chat &rarr;</span>
            </a>

            <a 
              href="https://t.me/+201500314798" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0088cc]/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold">Telegram</p>
                  <p className="text-sm text-zinc-400">01500314798</p>
                </div>
              </div>
              <span className="text-blue-500 group-hover:translate-x-1 transition-transform">Chat &rarr;</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
