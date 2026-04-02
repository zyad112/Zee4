import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-500" />
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

      {/* Trending Box */}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Trends for you</h2>
        <div className="space-y-6">
          {[
            { category: 'Technology · Trending', title: '#ReactJS', tweets: '125K' },
            { category: 'Sports · Trending', title: 'Champions League', tweets: '85.2K' },
            { category: 'Entertainment · Trending', title: 'New Movie Trailer', tweets: '45K' },
            { category: 'Politics · Trending', title: 'Global Summit', tweets: '10K' },
            { category: 'Gaming · Trending', title: 'E3 Highlights', tweets: '200K' },
            { category: 'Music · Trending', title: 'New Album Drop', tweets: '1.2M' },
          ].map((trend, i) => (
            <div key={i} className="cursor-pointer hover:bg-zinc-900 p-4 -mx-4 transition">
              <p className="text-sm text-zinc-500">{trend.category}</p>
              <p className="font-bold text-lg mt-1">{trend.title}</p>
              <p className="text-sm text-zinc-500 mt-1">{trend.tweets} Tweets</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
