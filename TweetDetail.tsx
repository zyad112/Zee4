import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, writeBatch, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TweetData } from './Home';
import Tweet from '../components/Tweet';
import { ArrowLeft, Image as ImageIcon, X, BadgeCheck } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion } from 'framer-motion';

interface ReplyData {
  id: string;
  tweetId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  authorIsVerified?: boolean;
  text: string;
  imageUrl?: string;
  createdAt: number;
}

export default function TweetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [tweet, setTweet] = useState<TweetData | null>(null);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;

    // Fetch main tweet
    const fetchTweet = async () => {
      try {
        const docRef = doc(db, 'tweets', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTweet({ id: docSnap.id, ...docSnap.data() } as TweetData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `tweets/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTweet();

    // Fetch replies
    const q = query(collection(db, 'replies'), where('tweetId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repliesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReplyData[];
      
      // Sort client-side to avoid requiring a composite index
      repliesData.sort((a, b) => b.createdAt - a.createdAt);
      
      setReplies(repliesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'replies');
    });

    return () => unsubscribe();
  }, [id]);

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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && !imagePreview) || !profile || !id || !tweet) return;

    setReplyLoading(true);
    try {
      const batch = writeBatch(db);
      const replyRef = doc(collection(db, 'replies'));
      
      const replyData: any = {
        tweetId: id,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorHandle: profile.handle,
        authorPhoto: profile.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
        authorIsVerified: profile.isVerified && profile.verificationExpiry && profile.verificationExpiry > Date.now() ? true : false,
        text: replyText.trim(),
        createdAt: Date.now(),
      };

      if (imagePreview) {
        replyData.imageUrl = imagePreview;
      }

      batch.set(replyRef, replyData);
      
      batch.update(doc(db, 'tweets', id), {
        repliesCount: increment(1)
      });
      
      // Create notification if replying to someone else's tweet
      if (profile.uid !== tweet.authorId) {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: tweet.authorId,
          actorId: profile.uid,
          actorName: profile.displayName,
          actorPhoto: profile.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
          type: 'reply',
          tweetId: id,
          text: replyText.trim().substring(0, 50) + (replyText.length > 50 ? '...' : ''),
          createdAt: Date.now(),
          read: false
        });
      }
      
      await batch.commit();
      
      setReplyText('');
      removeImage();
      setTweet(prev => prev ? { ...prev, repliesCount: prev.repliesCount + 1 } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'replies');
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading tweet...</div>;
  }

  if (!tweet) {
    return <div className="p-8 text-center text-zinc-500">Tweet not found</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-2 flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      {/* Main Tweet */}
      <Tweet tweet={tweet} />

      {/* Reply Input */}
      <div className="flex gap-4 p-4 border-y border-zinc-800">
        <img 
          src={profile?.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
          alt="Profile" 
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <form onSubmit={handleReply}>
            <textarea
              value={replyText}
              onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                setReplyText(e.target.value);
              }}
              placeholder="Post your reply"
              className="w-full bg-transparent text-xl outline-none resize-none min-h-[60px] placeholder-zinc-500 overflow-hidden"
              rows={2}
              maxLength={10000}
            />
            
            {imagePreview && (
              <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-zinc-800">
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-sm transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <img src={imagePreview} alt="Upload preview" className="w-full h-auto max-h-[400px] object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
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
              </div>
              <div className="flex items-center gap-4">
                {replyText.length > 0 && (
                  <span className={`text-sm ${replyText.length > 9800 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {replyText.length}/10000
                  </span>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={(!replyText.trim() && !imagePreview) || replyLoading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-1.5 px-5 rounded-full transition"
                >
                  Reply
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Replies List */}
      <div className="divide-y divide-zinc-800">
        {replies.map(reply => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={reply.id} 
            className="p-4 flex gap-4 hover:bg-zinc-900/30 transition"
          >
            <img 
              src={reply.authorPhoto || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
              alt={reply.authorName} 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-sm overflow-hidden">
                <span className="font-bold hover:underline truncate flex items-center gap-1">
                  {reply.authorName}
                  {reply.authorIsVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                </span>
                <span className="text-zinc-500 truncate">{reply.authorHandle}</span>
              </div>
              <p className="mt-1 text-[15px] whitespace-pre-wrap break-words">{reply.text}</p>
              {reply.imageUrl && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-800">
                  <img src={reply.imageUrl} alt="Reply attachment" className="w-full h-auto max-h-[400px] object-cover" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
