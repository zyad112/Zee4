import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function RightPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="h-full py-4 px-8 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search"
          className="block w-full pl-12 pr-4 py-3 bg-zinc-900 border-none rounded-full text-white placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 focus:bg-black transition"
        />
      </form>

      {/* Trending Box */}
      <div className="bg-zinc-900 rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4">What's happening</h2>
        <div className="space-y-4">
          {[
            { category: 'Technology · Trending', title: '#ReactJS', tweets: '125K' },
            { category: 'Sports · Trending', title: 'Champions League', tweets: '85.2K' },
            { category: 'Entertainment · Trending', title: 'New Movie Trailer', tweets: '45K' },
            { category: 'Politics · Trending', title: 'Global Summit', tweets: '10K' },
          ].map((trend, i) => (
            <div key={i} className="cursor-pointer hover:bg-zinc-800 p-2 -mx-2 rounded-xl transition">
              <p className="text-xs text-zinc-500">{trend.category}</p>
              <p className="font-bold">{trend.title}</p>
              <p className="text-xs text-zinc-500">{trend.tweets} Tweets</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who to follow Box */}
      <div className="bg-zinc-900 rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4">Who to follow</h2>
        <div className="space-y-4">
          {[
            { name: 'Google AI', handle: '@GoogleAI', img: 'https://picsum.photos/seed/google/100/100' },
            { name: 'React', handle: '@reactjs', img: 'https://picsum.photos/seed/react/100/100' },
            { name: 'Tailwind CSS', handle: '@tailwindcss', img: 'https://picsum.photos/seed/tailwind/100/100' },
          ].map((user, i) => (
            <div key={i} className="flex items-center justify-between cursor-pointer hover:bg-zinc-800 p-2 -mx-2 rounded-xl transition">
              <div className="flex items-center gap-3">
                <img src={user.img} alt={user.name} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-bold text-sm hover:underline">{user.name}</p>
                  <p className="text-zinc-500 text-sm">{user.handle}</p>
                </div>
              </div>
              <button className="bg-white text-black font-bold text-sm px-4 py-1.5 rounded-full hover:bg-zinc-200 transition">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
