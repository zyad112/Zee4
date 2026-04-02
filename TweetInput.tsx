import React, { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Image as ImageIcon, Smile, Calendar, MapPin, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';

export default function TweetInput({ onSuccess }: { onSuccess?: () => void }) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      setImageFile(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("Failed to process image. Please try a smaller file.");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !imagePreview) || !profile) return;

    setLoading(true);
    try {
      const tweetData: any = {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorHandle: profile.handle,
        authorPhoto: profile.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
        authorIsVerified: profile.isVerified && profile.verificationExpiry && profile.verificationExpiry > Date.now() ? true : false,
        text: text.trim(),
        createdAt: Date.now(),
        likesCount: 0,
        retweetsCount: 0,
        repliesCount: 0,
      };

      if (imagePreview) {
        tweetData.imageUrl = imagePreview;
      }

      await addDoc(collection(db, 'tweets'), tweetData);
      setText('');
      removeImage();
      if (onSuccess) onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tweets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 p-4 border-b border-zinc-800">
      <img 
        src={profile?.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
        alt="Profile" 
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
              setText(e.target.value);
            }}
            placeholder="What is happening?!"
            className="w-full bg-transparent text-xl outline-none resize-none min-h-[60px] placeholder-zinc-500 overflow-hidden"
            rows={2}
            maxLength={10000}
          />
          
          <AnimatePresence>
            {imagePreview && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-zinc-800"
              >
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-sm transition z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <img src={imagePreview} alt="Upload preview" className="w-full h-auto max-h-[400px] object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center justify-between mt-4 border-t border-zinc-800 pt-3">
            <div className="flex items-center gap-4 text-blue-500">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="hover:bg-blue-500/10 p-2 rounded-full transition"
              >
                <ImageIcon className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button" 
                className="hover:bg-blue-500/10 p-2 rounded-full transition"
              >
                <Smile className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button" 
                className="hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block"
              >
                <Calendar className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button" 
                className="hover:bg-blue-500/10 p-2 rounded-full transition hidden sm:block"
              >
                <MapPin className="w-5 h-5" />
              </motion.button>
            </div>
            
            <div className="flex items-center gap-4">
              {text.length > 0 && (
                <span className={`text-sm ${text.length > 9800 ? 'text-red-500' : 'text-zinc-500'}`}>
                  {text.length}/10000
                </span>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={(!text.trim() && !imagePreview) || loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white font-bold py-1.5 px-5 rounded-full transition"
              >
                Post
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
