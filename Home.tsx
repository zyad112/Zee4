import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import TweetInput from '../components/TweetInput';
import Tweet from '../components/Tweet';

export interface TweetData {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorPhoto: string;
  authorIsVerified?: boolean;
  text: string;
  imageUrl?: string;
  createdAt: number;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
}

export default function Home() {
  const { user } = useAuth();
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Fetch who the user is following
  useEffect(() => {
    if (!user) return;
    const fetchFollowing = async () => {
      try {
        const q = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        const snapshot = await getDocs(q);
        const ids = snapshot.docs.map(doc => doc.data().followingId);
        setFollowingIds(ids);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'follows');
      }
    };
    fetchFollowing();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'tweets'), orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tweetsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TweetData[];
      
      setTweets(tweetsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tweets');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const displayedTweets = activeTab === 'forYou' 
    ? tweets 
    : tweets.filter(tweet => followingIds.includes(tweet.authorId) || tweet.authorId === user?.uid);

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <h1 className="text-xl font-bold px-4 py-3">Home</h1>
        <div className="flex">
          <button 
            onClick={() => setActiveTab('forYou')}
            className="flex-1 text-center font-bold py-4 hover:bg-zinc-900 transition relative"
          >
            <span className={activeTab === 'forYou' ? 'text-white' : 'text-zinc-500'}>For you</span>
            {activeTab === 'forYou' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className="flex-1 text-center font-bold py-4 hover:bg-zinc-900 transition relative"
          >
            <span className={activeTab === 'following' ? 'text-white' : 'text-zinc-500'}>Following</span>
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Tweet Input */}
      <TweetInput />

      {/* Divider */}
      <div className="h-px bg-zinc-800 w-full"></div>

      {/* Tweets Feed */}
      {loading ? (
        <div className="p-4 text-center text-zinc-500">Loading tweets...</div>
      ) : displayedTweets.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          {activeTab === 'forYou' ? 'No tweets yet. Be the first to post!' : 'No tweets from people you follow.'}
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {displayedTweets.map(tweet => (
            <Tweet key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
}
