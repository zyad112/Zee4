import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, writeBatch, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { TweetData } from './Home';
import Tweet from '../components/Tweet';
import { Calendar, ArrowLeft, Phone, Link as LinkIcon, Facebook, Twitter, Instagram, Linkedin, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';
import EditProfileModal from '../components/EditProfileModal';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const followDocId = user && id ? `${user.uid}_${id}` : '';

  useEffect(() => {
    if (!id) return;

    // Fetch Profile
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${id}`);
      }
    };

    fetchProfile();

    // Fetch Tweets
    const q = query(collection(db, 'tweets'), where('authorId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tweetsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TweetData[];
      
      // Sort client-side to avoid requiring a composite index
      tweetsData.sort((a, b) => b.createdAt - a.createdAt);
      
      setTweets(tweetsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tweets');
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    
    const checkFollow = async () => {
      try {
        const followSnap = await getDoc(doc(db, 'follows', followDocId));
        setIsFollowing(followSnap.exists());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `follows/${followDocId}`);
      }
    };
    
    checkFollow();
  }, [user, id, followDocId]);

  const handleFollow = async () => {
    if (!user || !id || followLoading || user.uid === id || !currentUserProfile) return;
    setFollowLoading(true);

    try {
      const followRef = doc(db, 'follows', followDocId);
      const targetUserRef = doc(db, 'users', id);
      const currentUserRef = doc(db, 'users', user.uid);
      const batch = writeBatch(db);

      if (isFollowing) {
        batch.delete(followRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
        await batch.commit();
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount - 1 } : null);
      } else {
        batch.set(followRef, {
          followerId: user.uid,
          followingId: id,
          createdAt: Date.now()
        });
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
        
        // Create notification
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: id,
          actorId: user.uid,
          actorName: currentUserProfile.displayName,
          actorPhoto: currentUserProfile.photoURL,
          type: 'follow',
          createdAt: Date.now(),
          read: false
        });

        await batch.commit();
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `follows/${followDocId}`);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading && !profile) {
    return <div className="p-8 text-center text-zinc-500">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-zinc-500">User not found</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-2 flex items-center gap-6">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-zinc-500">{tweets.length} Tweets</p>
        </div>
      </div>

      {/* Cover Image */}
      <div 
        className="h-48 bg-zinc-800 w-full bg-cover bg-center"
        style={profile.coverURL ? { backgroundImage: `url(${profile.coverURL})` } : {}}
      ></div>

      {/* Profile Info */}
      <div className="px-4 pb-4 relative">
        <div className="flex justify-between items-start">
          <img 
            src={profile.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
            alt={profile.displayName} 
            className="w-32 h-32 rounded-full border-4 border-black -mt-16 bg-zinc-900 object-cover"
          />
          
          <div className="mt-4">
            {user?.uid === id ? (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="border border-zinc-600 font-bold py-1.5 px-4 rounded-full hover:bg-zinc-900 transition"
              >
                Edit profile
              </button>
            ) : (
              <button 
                onClick={handleFollow}
                disabled={followLoading}
                className={`font-bold py-1.5 px-4 rounded-full transition ${
                  isFollowing 
                    ? 'border border-zinc-600 hover:border-red-500 hover:text-red-500 hover:bg-red-500/10' 
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold flex items-center gap-1">
            {profile.displayName}
            {profile.isVerified && profile.verificationExpiry && profile.verificationExpiry > Date.now() && (
              <BadgeCheck className="w-5 h-5 text-blue-500" />
            )}
          </h2>
          <p className="text-zinc-500">{profile.handle}</p>
        </div>

        <p className="mt-4 text-[15px] whitespace-pre-wrap">{profile.bio}</p>

        <div className="flex flex-wrap items-center gap-4 mt-3 text-zinc-500 text-sm">
          {profile.phoneNumber && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{profile.phoneNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Joined {format(profile.createdAt, 'MMMM yyyy')}</span>
          </div>
        </div>

        {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
          <div className="flex flex-wrap items-center gap-4 mt-3 text-blue-500 text-sm">
            {profile.socialLinks.facebook && (
              <a href={profile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                <Facebook className="w-4 h-4" />
                <span>Facebook</span>
              </a>
            )}
            {profile.socialLinks.twitter && (
              <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                <Twitter className="w-4 h-4" />
                <span>X</span>
              </a>
            )}
            {profile.socialLinks.instagram && (
              <a href={profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
              </a>
            )}
            {profile.socialLinks.linkedin && (
              <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        )}

        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex gap-1 hover:underline cursor-pointer">
            <span className="font-bold text-white">{profile.followingCount}</span>
            <span className="text-zinc-500">Following</span>
          </div>
          <div className="flex gap-1 hover:underline cursor-pointer">
            <span className="font-bold text-white">{profile.followersCount}</span>
            <span className="text-zinc-500">Followers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mt-4">
        <div className="flex-1 text-center font-bold py-4 hover:bg-zinc-900 transition cursor-pointer relative">
          Tweets
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full"></div>
        </div>
        <div className="flex-1 text-center text-zinc-500 font-bold py-4 hover:bg-zinc-900 transition cursor-pointer">
          Replies
        </div>
        <div className="flex-1 text-center text-zinc-500 font-bold py-4 hover:bg-zinc-900 transition cursor-pointer">
          Media
        </div>
        <div className="flex-1 text-center text-zinc-500 font-bold py-4 hover:bg-zinc-900 transition cursor-pointer">
          Likes
        </div>
      </div>

      {/* Tweets */}
      <div className="divide-y divide-zinc-800">
        {tweets.map(tweet => (
          <Tweet key={tweet.id} tweet={tweet} />
        ))}
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          profile={profile}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updatedProfile) => {
            setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
          }}
        />
      )}
    </div>
  );
}
