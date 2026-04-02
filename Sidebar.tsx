import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User, LogOut, Moon, Sun, Settings, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import TweetInput from './TweetInput';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar() {
  const { profile } = useAuth();
  const location = useLocation();
  const [isLight, setIsLight] = useState(false);
  const [isTweetModalOpen, setIsTweetModalOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLight(true);
      document.body.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.body.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsLight(false);
    } else {
      document.body.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsLight(true);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profile', path: `/profile/${profile?.uid}` },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <div className="flex flex-col h-full py-4 px-2 xl:px-6">
        {/* Logo */}
        <Link to="/" className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-zinc-900 transition mb-4 ml-2">
          <Logo className="w-8 h-8 text-white" />
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-full hover:bg-zinc-900 transition w-fit xl:w-full",
                  isActive ? "font-bold" : "font-normal"
                )}
              >
                <item.icon className={cn("w-7 h-7", isActive ? "fill-white" : "")} />
                <span className="hidden xl:inline text-xl">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Post Button */}
        <button 
          onClick={() => setIsTweetModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 xl:py-4 xl:px-8 font-bold text-lg mt-4 mb-4 transition w-12 h-12 xl:w-full flex items-center justify-center"
        >
          <span className="hidden xl:inline">Post</span>
          <span className="xl:hidden">+</span>
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-4 p-3 rounded-full hover:bg-zinc-900 transition w-fit xl:w-full mt-2"
        >
          {isLight ? <Moon className="w-7 h-7" /> : <Sun className="w-7 h-7" />}
          <span className="hidden xl:inline text-xl">{isLight ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        {/* User Profile / Logout */}
        <div className="mt-auto flex items-center justify-between p-3 rounded-full hover:bg-zinc-900 transition cursor-pointer" onClick={logout}>
          <div className="flex items-center gap-3">
            <img src={profile?.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} alt="Profile" className="w-10 h-10 rounded-full bg-zinc-800 object-cover" />
            <div className="hidden xl:block">
              <p className="font-bold text-sm">{profile?.displayName}</p>
              <p className="text-zinc-500 text-sm">{profile?.handle}</p>
            </div>
          </div>
          <LogOut className="hidden xl:block w-5 h-5 text-zinc-500" />
        </div>
      </div>

      {/* Tweet Modal */}
      <AnimatePresence>
        {isTweetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-black border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <button 
                  onClick={() => setIsTweetModalOpen(false)}
                  className="p-2 hover:bg-zinc-900 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div onClick={() => setIsTweetModalOpen(false)}>
                <div onClick={(e) => e.stopPropagation()}>
                  <TweetInput onSuccess={() => setIsTweetModalOpen(false)} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
