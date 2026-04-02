import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface EditProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => void;
}

export default function EditProfileModal({ profile, isOpen, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [coverURL, setCoverURL] = useState(profile.coverURL || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [socialLinks, setSocialLinks] = useState({
    facebook: profile.socialLinks?.facebook || '',
    twitter: profile.socialLinks?.twitter || '',
    instagram: profile.socialLinks?.instagram || '',
    linkedin: profile.socialLinks?.linkedin || '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSocialLinks({ ...socialLinks, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: Partial<UserProfile> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: photoURL.trim(),
        coverURL: coverURL.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        socialLinks: socialLinks,
      };

      await updateDoc(doc(db, 'users', profile.uid), updates);
      onSave(updates);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Edit profile</h2>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={loading || !displayName.trim()}
            className="bg-white text-black font-bold py-1.5 px-5 rounded-full hover:bg-zinc-200 transition disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Photo URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Profile Photo URL</label>
            <input
              type="text"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full bg-transparent border border-zinc-700 rounded-md p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="https://example.com/photo.jpg"
              maxLength={2000}
            />
          </div>

          {/* Cover URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Cover Photo URL</label>
            <input
              type="text"
              value={coverURL}
              onChange={(e) => setCoverURL(e.target.value)}
              className="w-full bg-transparent border border-zinc-700 rounded-md p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="https://example.com/cover.jpg"
              maxLength={2000}
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent border border-zinc-700 rounded-md p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="Your name"
              maxLength={50}
            />
            <div className="text-right text-xs text-zinc-500 mt-1">{displayName.length}/50</div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-transparent border border-zinc-700 rounded-md p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none min-h-[100px]"
              placeholder="Add your bio"
              maxLength={1000}
            />
            <div className="text-right text-xs text-zinc-500 mt-1">{bio.length}/1000</div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-transparent border border-zinc-700 rounded-md p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="+1 234 567 8900"
              maxLength={20}
            />
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">Social Links</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Facebook URL</label>
                <input
                  type="url"
                  name="facebook"
                  value={socialLinks.facebook}
                  onChange={handleSocialChange}
                  className="w-full bg-transparent border border-zinc-700 rounded-md p-2 text-sm text-white focus:border-blue-500 transition"
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
                  className="w-full bg-transparent border border-zinc-700 rounded-md p-2 text-sm text-white focus:border-blue-500 transition"
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
                  className="w-full bg-transparent border border-zinc-700 rounded-md p-2 text-sm text-white focus:border-blue-500 transition"
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
                  className="w-full bg-transparent border border-zinc-700 rounded-md p-2 text-sm text-white focus:border-blue-500 transition"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
