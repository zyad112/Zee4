import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { ArrowLeft, Users, Camera, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function NewGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        // Fetch all users for now, ideally we'd fetch only mutual followers
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const snapshot = await getDocs(q);
        
        const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== user.uid);
        
        // Filter for mutual followers (friends)
        const mutualFriends = [];
        for (const u of allUsers) {
          const follow1 = await getDoc(doc(db, 'follows', `${user.uid}_${u.uid}`));
          const follow2 = await getDoc(doc(db, 'follows', `${u.uid}_${user.uid}`));
          if (follow1.exists() && follow2.exists()) {
            mutualFriends.push(u);
          }
        }
        
        setFriends(mutualFriends);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const toggleFriend = (uid: string) => {
    if (selectedFriends.includes(uid)) {
      setSelectedFriends(selectedFriends.filter(id => id !== uid));
    } else {
      setSelectedFriends([...selectedFriends, uid]);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) return;
    if (selectedFriends.length === 0) {
      toast.error('Please select at least one friend to add to the group.');
      return;
    }

    setCreating(true);
    try {
      const newGroupRef = await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        image: groupImage.trim(),
        ownerId: user.uid,
        members: [user.uid, ...selectedFriends],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        features: {
          canMembersEditName: false,
          canMembersEditImage: false,
          canMembersAddOthers: false,
          isEncrypted: true,
          // Add other 5 features here based on requirements
          feature5: false,
          feature6: false,
          feature7: false,
          feature8: false,
          feature9: false,
        }
      });

      toast.success('Group created successfully!');
      navigate(`/messages/g/${newGroupRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20 flex flex-col">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/messages')} className="p-2 hover:bg-zinc-900 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">New Group</h1>
        </div>
        <button 
          onClick={handleCreateGroup}
          disabled={creating || !groupName.trim() || selectedFriends.length === 0}
          className="bg-white text-black font-bold py-1.5 px-5 rounded-full hover:bg-zinc-200 transition disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Group Info */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
            {groupImage ? (
              <img src={groupImage} alt="Group" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-zinc-500" />
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-700 p-2 text-xl font-bold text-white focus:border-blue-500 outline-none transition placeholder:font-normal"
              maxLength={50}
            />
            <input
              type="text"
              placeholder="Group Image URL (Optional)"
              value={groupImage}
              onChange={(e) => setGroupImage(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-700 p-2 text-sm text-white focus:border-blue-500 outline-none transition"
              maxLength={2000}
            />
          </div>
        </div>

        {/* Add Members */}
        <div>
          <h2 className="text-lg font-bold mb-4">Add Friends</h2>
          {loading ? (
            <div className="text-center text-zinc-500 py-8">Loading friends...</div>
          ) : friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map(friend => (
                <div 
                  key={friend.uid} 
                  onClick={() => toggleFriend(friend.uid)}
                  className="flex items-center justify-between p-3 hover:bg-zinc-900 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <img src={friend.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="font-bold">{friend.displayName}</p>
                      <p className="text-sm text-zinc-500">{friend.handle}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${selectedFriends.includes(friend.uid) ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`}>
                    {selectedFriends.includes(friend.uid) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-zinc-500 py-8 flex flex-col items-center">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p>You don't have any friends yet.</p>
              <p className="text-sm mt-2">Follow users and have them follow you back to become friends.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
