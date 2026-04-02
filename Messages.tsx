import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { Search, Plus, Users, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Messages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to 1-on-1 chats
    const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubChats = onSnapshot(qChats, async (snapshot) => {
      const chatsData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data();
        const otherUserId = data.participants.find((id: string) => id !== user.uid);
        let otherUser = null;
        if (otherUserId) {
          const userSnap = await getDoc(doc(db, 'users', otherUserId));
          if (userSnap.exists()) {
            otherUser = userSnap.data();
          }
        }
        return { id: chatDoc.id, ...data, otherUser };
      }));
      setChats(chatsData.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    });

    // Listen to groups
    const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(groupsData.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    });

    return () => {
      unsubChats();
      unsubGroups();
    };
  }, [user]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const queryText = e.target.value;
    setSearchQuery(queryText);

    if (queryText.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search by displayName or handle (simple client-side filter for now, or multiple queries)
      // Since Firestore doesn't support full-text search natively well, we'll fetch a limit and filter
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      
      const results = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => 
          u.uid !== user?.uid && 
          (u.displayName.toLowerCase().includes(queryText.toLowerCase()) || 
           u.handle.toLowerCase().includes(queryText.toLowerCase()))
        );
      
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;

    // Check if they are friends (mutual follow)
    try {
      const follow1 = await getDoc(doc(db, 'follows', `${user.uid}_${otherUser.uid}`));
      const follow2 = await getDoc(doc(db, 'follows', `${otherUser.uid}_${user.uid}`));

      if (!follow1.exists() || !follow2.exists()) {
        toast.error('You can only message users who are your friends (mutual followers).');
        return;
      }

      // Check if chat already exists
      const existingChat = chats.find(c => c.participants.includes(otherUser.uid));
      if (existingChat) {
        navigate(`/messages/c/${existingChat.id}`);
        return;
      }

      // Create new chat
      const newChatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, otherUser.uid],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      navigate(`/messages/c/${newChatRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20 flex flex-col">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Messages</h1>
          <button 
            onClick={() => navigate('/messages/new-group')}
            className="p-2 hover:bg-zinc-900 rounded-full transition"
            title="Create Group"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search for friends..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      <div className="flex border-b border-zinc-800">
        <button 
          onClick={() => setActiveTab('chats')}
          className="flex-1 text-center font-bold py-4 hover:bg-zinc-900 transition relative"
        >
          <span className={activeTab === 'chats' ? 'text-white' : 'text-zinc-500'}>Chats</span>
          {activeTab === 'chats' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('groups')}
          className="flex-1 text-center font-bold py-4 hover:bg-zinc-900 transition relative"
        >
          <span className={activeTab === 'groups' ? 'text-white' : 'text-zinc-500'}>Groups</span>
          {activeTab === 'groups' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          <div className="p-2">
            <h2 className="px-4 py-2 text-sm font-bold text-zinc-500">Search Results</h2>
            {isSearching ? (
              <div className="p-4 text-center text-zinc-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <div 
                  key={u.uid} 
                  onClick={() => startChat(u)}
                  className="flex items-center gap-3 p-4 hover:bg-zinc-900 transition cursor-pointer"
                >
                  <img src={u.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-bold">{u.displayName}</p>
                    <p className="text-sm text-zinc-500">{u.handle}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-zinc-500">No users found</div>
            )}
          </div>
        ) : (
          <div>
            {activeTab === 'chats' && (
              chats.length > 0 ? (
                chats.map(chat => (
                  <Link 
                    key={chat.id} 
                    to={`/messages/c/${chat.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-zinc-900 transition border-b border-zinc-800/50"
                  >
                    <img src={chat.otherUser?.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} alt="" className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold truncate">{chat.otherUser?.displayName}</p>
                        {chat.updatedAt && (
                          <span className="text-xs text-zinc-500">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 truncate">
                        {chat.lastMessage ? 'Encrypted message' : 'Start a conversation'}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                  <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                  <p>No messages yet.</p>
                  <p className="text-sm mt-2">Search for a friend to start chatting!</p>
                </div>
              )
            )}

            {activeTab === 'groups' && (
              groups.length > 0 ? (
                groups.map(group => (
                  <Link 
                    key={group.id} 
                    to={`/messages/g/${group.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-zinc-900 transition border-b border-zinc-800/50"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {group.image ? (
                        <img src={group.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold truncate">{group.name}</p>
                        {group.updatedAt && (
                          <span className="text-xs text-zinc-500">{new Date(group.updatedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 truncate">
                        {group.lastMessage ? 'Encrypted message' : 'Group created'}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                  <Users className="w-12 h-12 mb-4 opacity-20" />
                  <p>No groups yet.</p>
                  <button 
                    onClick={() => navigate('/messages/new-group')}
                    className="mt-4 bg-white text-black font-bold py-2 px-6 rounded-full hover:bg-zinc-200 transition"
                  >
                    Create a Group
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
