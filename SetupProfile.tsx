import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

export default function SetupProfile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [handle, setHandle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.isSetupComplete) {
      navigate('/');
    }
    if (profile && !handle) {
      setHandle(profile.handle.replace('@', ''));
    }
  }, [profile, navigate]);

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSocialLinks({ ...socialLinks, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setError('');

    if (handle.length < 3 || handle.length > 20) {
      return setError('Username must be between 3 and 20 characters.');
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        handle: `@${handle}`,
        socialLinks: socialLinks,
        isSetupComplete: true,
      };
      
      if (phoneNumber.trim()) {
        updateData.phoneNumber = phoneNumber.trim();
      }

      await updateDoc(userRef, updateData);
      
      // Navigate to home after successful setup
      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-zinc-900/20 z-0" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <Logo className="w-16 h-16 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-2">Complete your profile</h2>
          <p className="text-zinc-400 text-center mb-8">Tell us a bit more about yourself before you join Zee 4.</p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Username (Required)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="username"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">Only letters, numbers, and underscores allowed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder="+1 234 567 8900"
                maxLength={20}
              />
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <h3 className="text-lg font-medium mb-4">Social Links (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Facebook URL</label>
                  <input
                    type="url"
                    name="facebook"
                    value={socialLinks.facebook}
                    onChange={handleSocialChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">X (Twitter) URL</label>
                  <input
                    type="url"
                    name="twitter"
                    value={socialLinks.twitter}
                    onChange={handleSocialChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                    placeholder="https://x.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    name="instagram"
                    value={socialLinks.instagram}
                    onChange={handleSocialChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    name="linkedin"
                    value={socialLinks.linkedin}
                    onChange={handleSocialChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || handle.length < 3}
              className="w-full bg-blue-500 text-white font-bold rounded-full py-3.5 hover:bg-blue-600 transition disabled:opacity-50 disabled:hover:bg-blue-500 mt-8"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
