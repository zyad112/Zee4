import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Shield, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [features, setFeatures] = useState({
    canMembersEditName: false,
    canMembersEditImage: false,
    canMembersAddOthers: false,
    onlyOwnerCanMessage: false,
    requireApprovalToJoin: false,
    hideMemberNames: false,
    autoDeleteMessages: false,
    allowReactions: true,
    isEncrypted: true,
  });

  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');

  useEffect(() => {
    if (!user || !id) return;

    const fetchGroupDetails = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', id));
        if (groupDoc.exists()) {
          const data = groupDoc.data();
          if (data.ownerId !== user.uid) {
            toast.error('Only the group owner can access settings.');
            navigate(`/messages/g/${id}`);
            return;
          }
          setGroup({ id: groupDoc.id, ...data });
          setGroupName(data.name || '');
          setGroupImage(data.image || '');
          if (data.features) {
            setFeatures(prev => ({ ...prev, ...data.features }));
          }
        } else {
          navigate('/messages');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `groups/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [id, user, navigate]);

  const handleSave = async () => {
    if (!id || !groupName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'groups', id), {
        name: groupName.trim(),
        image: groupImage.trim(),
        features: features,
        updatedAt: Date.now(),
      });
      toast.success('Group settings updated successfully!');
      navigate(`/messages/g/${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureName: keyof typeof features) => {
    if (featureName === 'isEncrypted') {
      toast.info('End-to-end encryption cannot be disabled for security reasons.');
      return;
    }
    setFeatures(prev => ({ ...prev, [featureName]: !prev[featureName] }));
  };

  if (loading) {
    return <div className="w-full max-w-2xl mx-auto min-h-screen flex items-center justify-center text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen pb-20 flex flex-col bg-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/messages/g/${id}`)} className="p-2 hover:bg-zinc-900 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Group Settings</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || !groupName.trim()}
          className="bg-white text-black font-bold py-1.5 px-5 rounded-full hover:bg-zinc-200 transition disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="p-4 space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-500" />
            Basic Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-white focus:border-blue-500 outline-none transition"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Group Image URL</label>
            <input
              type="text"
              value={groupImage}
              onChange={(e) => setGroupImage(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-white focus:border-blue-500 outline-none transition"
              maxLength={2000}
            />
          </div>
        </div>

        {/* 9 Features */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Owner Controls (9 Features)
          </h2>
          
          <div className="space-y-2">
            {[
              { id: 'canMembersEditName', label: '1. Members can edit group name', desc: 'Allow any member to change the group name.' },
              { id: 'canMembersEditImage', label: '2. Members can edit group image', desc: 'Allow any member to change the group picture.' },
              { id: 'canMembersAddOthers', label: '3. Members can add others', desc: 'Allow members to add their friends to the group.' },
              { id: 'onlyOwnerCanMessage', label: '4. Broadcast Mode', desc: 'Only the owner can send messages. Members can only read.' },
              { id: 'requireApprovalToJoin', label: '5. Require approval to join', desc: 'New members must be approved by the owner.' },
              { id: 'hideMemberNames', label: '6. Hide member list', desc: 'Members cannot see who else is in the group.' },
              { id: 'autoDeleteMessages', label: '7. Auto-delete messages', desc: 'Messages disappear 24 hours after being sent.' },
              { id: 'allowReactions', label: '8. Allow message reactions', desc: 'Members can react to messages with emojis.' },
              { id: 'isEncrypted', label: '9. End-to-End Encryption', desc: 'All messages and media are fully encrypted. (Always On)' },
            ].map((feature) => (
              <div key={feature.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="pr-4">
                  <p className="font-bold text-sm">{feature.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">{feature.desc}</p>
                </div>
                <button
                  onClick={() => toggleFeature(feature.id as keyof typeof features)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${features[feature.id as keyof typeof features] ? 'bg-blue-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${features[feature.id as keyof typeof features] ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
