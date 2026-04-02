import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Repeat2, Heart, Share, Trash2, BadgeCheck } from 'lucide-react';
import { doc, deleteDoc, setDoc, getDoc, updateDoc, increment, writeBatch, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TweetData } from '../pages/Home';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface TweetProps {
  tweet: TweetData;
}

const Tweet: React.FC<TweetProps> = ({ tweet }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [retweetLoading, setRetweetLoading] = useState(false);

  const likeDocId = user ? `${user.uid}_${tweet.id}` : '';
  const retweetDocId = user ? `${user.uid}_${tweet.id}` : '';

  useEffect(() => {
    if (!user) return;
    
    const checkInteractions = async () => {
      try {
        const likeSnap = await getDoc(doc(db, 'likes', likeDocId));
        setIsLiked(likeSnap.exists());

        const retweetSnap = await getDoc(doc(db, 'retweets', retweetDocId));
        setIsRetweeted(retweetSnap.exists());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `likes/${likeDocId}`);
      }
    };
    
    checkInteractions();
  }, [user, tweet.id, likeDocId, retweetDocId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !profile || likeLoading) return;
    setLikeLoading(true);

    try {
      const likeRef = doc(db, 'likes', likeDocId);
      const tweetRef = doc(db, 'tweets', tweet.id);
      const batch = writeBatch(db);

      if (isLiked) {
        batch.delete(likeRef);
        batch.update(tweetRef, { likesCount: increment(-1) });
        await batch.commit();
        setIsLiked(false);
      } else {
        batch.set(likeRef, {
          userId: user.uid,
          tweetId: tweet.id,
          createdAt: Date.now()
        });
        batch.update(tweetRef, { likesCount: increment(1) });
        
        // Create notification if liking someone else's tweet
        if (user.uid !== tweet.authorId) {
          const notificationRef = doc(collection(db, 'notifications'));
          batch.set(notificationRef, {
            userId: tweet.authorId,
            actorId: user.uid,
            actorName: profile.displayName,
            actorPhoto: profile.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
            type: 'like',
            tweetId: tweet.id,
            createdAt: Date.now(),
            read: false
          });
        }
        
        await batch.commit();
        setIsLiked(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `likes/${likeDocId}`);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleRetweet = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !profile || retweetLoading) return;
    setRetweetLoading(true);

    try {
      const retweetRef = doc(db, 'retweets', retweetDocId);
      const tweetRef = doc(db, 'tweets', tweet.id);
      const batch = writeBatch(db);

      if (isRetweeted) {
        batch.delete(retweetRef);
        batch.update(tweetRef, { retweetsCount: increment(-1) });
        await batch.commit();
        setIsRetweeted(false);
      } else {
        batch.set(retweetRef, {
          userId: user.uid,
          tweetId: tweet.id,
          createdAt: Date.now()
        });
        batch.update(tweetRef, { retweetsCount: increment(1) });
        
        // Create notification if retweeting someone else's tweet
        if (user.uid !== tweet.authorId) {
          const notificationRef = doc(collection(db, 'notifications'));
          batch.set(notificationRef, {
            userId: tweet.authorId,
            actorId: user.uid,
            actorName: profile.displayName,
            actorPhoto: profile.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
            type: 'retweet',
            tweetId: tweet.id,
            createdAt: Date.now(),
            read: false
          });
        }
        
        await batch.commit();
        setIsRetweeted(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `retweets/${retweetDocId}`);
    } finally {
      setRetweetLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || user.uid !== tweet.authorId) return;
    
    if (window.confirm("Are you sure you want to delete this tweet?")) {
      try {
        await deleteDoc(doc(db, 'tweets', tweet.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tweets/${tweet.id}`);
      }
    }
  };

  const handleTweetClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button or link
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(`/tweet/${tweet.id}`);
  };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/tweet/${tweet.id}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const tweetUrl = `${window.location.origin}/tweet/${tweet.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tweet by ${tweet.authorName}`,
          text: tweet.text,
          url: tweetUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(tweetUrl).then(() => {
        import('sonner').then(({ toast }) => {
          toast.success('Link copied to clipboard');
        });
      }).catch(err => {
        console.error('Failed to copy link: ', err);
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleTweetClick} 
      className="block p-4 hover:bg-zinc-900/50 transition cursor-pointer border-b border-zinc-800 last:border-0"
    >
      <div className="flex gap-4">
        <Link to={`/profile/${tweet.authorId}`} onClick={(e) => e.stopPropagation()}>
          <img 
            src={tweet.authorPhoto || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
            alt={tweet.authorName} 
            className="w-12 h-12 rounded-full hover:opacity-80 transition object-cover"
          />
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm overflow-hidden">
              <Link to={`/profile/${tweet.authorId}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline truncate flex items-center gap-1">
                {tweet.authorName}
                {tweet.authorIsVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
              </Link>
              <span className="text-zinc-500 truncate">{tweet.authorHandle}</span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-500 whitespace-nowrap">
                {tweet.createdAt ? formatDistanceToNow(typeof tweet.createdAt === 'number' ? tweet.createdAt : (tweet.createdAt as any)?.toDate?.() || new Date(tweet.createdAt), { addSuffix: true }).replace('about ', '') : ''}
              </span>
            </div>
            
            {user?.uid === tweet.authorId && (
              <button onClick={handleDelete} className="text-zinc-500 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className="mt-1 text-[15px] whitespace-pre-wrap break-words">{tweet.text}</p>
          
          {tweet.imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-800">
              <img src={tweet.imageUrl} alt="Tweet attachment" className="w-full h-auto max-h-[500px] object-cover" />
            </div>
          )}
          
          <div className="flex justify-between mt-3 text-zinc-500 max-w-md select-none">
            <button 
              className="flex items-center gap-2 group hover:text-blue-500 transition outline-none [WebkitTapHighlightColor:transparent]" 
              onClick={handleReplyClick}
            >
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full group-hover:bg-blue-500/10 transition"
              >
                <MessageCircle className="w-4 h-4" />
              </motion.div>
              <span className="text-xs">{tweet.repliesCount > 0 ? tweet.repliesCount : ''}</span>
            </button>
            
            <button 
              className={cn("flex items-center gap-2 group transition outline-none [WebkitTapHighlightColor:transparent]", isRetweeted ? "text-green-500" : "hover:text-green-500")} 
              onClick={handleRetweet}
              disabled={retweetLoading}
            >
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full group-hover:bg-green-500/10 transition"
              >
                <Repeat2 className="w-4 h-4" />
              </motion.div>
              <span className="text-xs">{tweet.retweetsCount > 0 ? tweet.retweetsCount : ''}</span>
            </button>
            
            <button 
              className={cn("flex items-center gap-2 group transition outline-none [WebkitTapHighlightColor:transparent]", isLiked ? "text-pink-500" : "hover:text-pink-500")} 
              onClick={handleLike}
              disabled={likeLoading}
            >
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full group-hover:bg-pink-500/10 transition"
              >
                <Heart className={cn("w-4 h-4", isLiked ? "fill-pink-500" : "")} />
              </motion.div>
              <span className="text-xs">{tweet.likesCount > 0 ? tweet.likesCount : ''}</span>
            </button>
            
            <button 
              className="flex items-center gap-2 group hover:text-blue-500 transition outline-none [WebkitTapHighlightColor:transparent]" 
              onClick={handleShare}
            >
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full group-hover:bg-blue-500/10 transition"
              >
                <Share className="w-4 h-4" />
              </motion.div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Tweet;
