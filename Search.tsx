import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { TweetData } from './Home';
import Tweet from '../components/Tweet';
import { Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState(q);
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;

    const performSearch = async () => {
      setLoading(true);
      try {
        // Firestore doesn't have native full-text search, so we'll do a basic prefix search on authorHandle or authorName
        // For a real app, you'd use Algolia or ElasticSearch.
        // Here we will just fetch recent tweets and filter them client-side for simplicity and demonstration.
        const tweetsRef = collection(db, 'tweets');
        const recentTweetsQuery = query(tweetsRef, orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(recentTweetsQuery);
        
        const allTweets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TweetData[];

        const lowerQuery = q.toLowerCase();
        const filteredTweets = allTweets.filter(tweet => 
          tweet.text.toLowerCase().includes(lowerQuery) || 
          tweet.authorName.toLowerCase().includes(lowerQuery) ||
          tweet.authorHandle.toLowerCase().includes(lowerQuery)
        );

        setTweets(filteredTweets);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'tweets');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-2 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <form onSubmit={handleSearch} className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Zee 4"
            className="block w-full pl-12 pr-4 py-2 bg-zinc-900 border-none rounded-full text-white placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 focus:bg-black transition"
          />
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="p-8 text-center text-zinc-500">Searching...</div>
      ) : q ? (
        tweets.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {tweets.map(tweet => (
              <Tweet key={tweet.id} tweet={tweet} />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 text-center"
          >
            <h2 className="text-2xl font-bold mb-2">No results for "{q}"</h2>
            <p className="text-zinc-500">Try searching for something else, or check your spelling.</p>
          </motion.div>
        )
      ) : (
        <div className="p-8 text-center text-zinc-500">
          Enter a search term to find tweets and users.
        </div>
      )}
    </div>
  );
}
