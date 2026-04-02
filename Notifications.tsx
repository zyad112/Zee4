import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Heart, Repeat2, MessageCircle, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface NotificationData {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorPhoto: string;
  type: 'like' | 'retweet' | 'reply' | 'follow';
  tweetId?: string;
  text?: string;
  createdAt: number;
  read: boolean;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationData[];
      
      setNotifications(notifs);
      setLoading(false);

      // Mark as read
      const unreadNotifs = notifs.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        const batch = writeBatch(db);
        unreadNotifs.forEach(n => {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        });
        batch.commit().catch(err => console.error("Error marking notifications as read", err));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-6 h-6 fill-pink-500 text-pink-500" />;
      case 'retweet': return <Repeat2 className="w-6 h-6 text-green-500" />;
      case 'reply': return <MessageCircle className="w-6 h-6 fill-blue-500 text-blue-500" />;
      case 'follow': return <UserPlus className="w-6 h-6 fill-blue-500 text-blue-500" />;
      default: return <Bell className="w-6 h-6 text-zinc-500" />;
    }
  };

  const getMessage = (n: NotificationData) => {
    switch (n.type) {
      case 'like': return <span><span className="font-bold">{n.actorName}</span> liked your Tweet</span>;
      case 'retweet': return <span><span className="font-bold">{n.actorName}</span> Retweeted your Tweet</span>;
      case 'reply': return <span><span className="font-bold">{n.actorName}</span> replied to your Tweet</span>;
      case 'follow': return <span><span className="font-bold">{n.actorName}</span> followed you</span>;
      default: return <span>New notification from {n.actorName}</span>;
    }
  };

  const handleNotificationClick = (n: NotificationData) => {
    if (n.type === 'follow') {
      navigate(`/profile/${n.actorId}`);
    } else if (n.tweetId) {
      navigate(`/tweet/${n.tweetId}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-zinc-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
          <Bell className="w-16 h-16 mb-4 opacity-20" />
          <h2 className="text-2xl font-bold text-white mb-2">Nothing to see here — yet</h2>
          <p>When someone likes or retweets one of your Tweets, it'll show up here.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {notifications.map(n => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={`p-4 flex gap-4 cursor-pointer hover:bg-zinc-900/50 transition ${!n.read ? 'bg-zinc-900/20' : ''}`}
            >
              <div className="flex-shrink-0 pt-1">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${n.actorId}`} onClick={(e) => e.stopPropagation()}>
                  <img 
                    src={n.actorPhoto || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
                    alt={n.actorName} 
                    className="w-8 h-8 rounded-full mb-2 object-cover hover:opacity-80 transition"
                  />
                </Link>
                <div className="text-sm mb-1">
                  {getMessage(n)}
                </div>
                {n.text && (
                  <p className="text-zinc-500 text-sm mt-2">{n.text}</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  {n.createdAt ? formatDistanceToNow(typeof n.createdAt === 'number' ? n.createdAt : (n.createdAt as any)?.toDate?.() || new Date(n.createdAt), { addSuffix: true }).replace('about ', '') : ''}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
