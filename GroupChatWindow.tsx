import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { ArrowLeft, Send, Smile, Image as ImageIcon, ShieldCheck, Users, Settings } from 'lucide-react';
import CryptoJS from 'crypto-js';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GroupChatWindow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use group ID as a simple shared secret for group messages
  // In a real app, you'd use a more complex key exchange mechanism for groups
  const getSecretKey = (groupId: string) => {
    return `group_${groupId}_secret_key_2024`;
  };

  useEffect(() => {
    if (!user || !id) return;

    const fetchGroupDetails = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', id));
        if (groupDoc.exists()) {
          const data = groupDoc.data();
          setGroup({ id: groupDoc.id, ...data });

          // Fetch member details
          const memberData: Record<string, UserProfile> = {};
          await Promise.all(data.members.map(async (memberId: string) => {
            const userSnap = await getDoc(doc(db, 'users', memberId));
            if (userSnap.exists()) {
              memberData[memberId] = userSnap.data() as UserProfile;
            }
          }));
          setMembers(memberData);
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

    const q = query(collection(db, 'group_messages'), where('groupId', '==', id), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [id, user, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !group || !id) return;

    const secretKey = getSecretKey(id);
    const encryptedText = CryptoJS.AES.encrypt(newMessage.trim(), secretKey).toString();

    try {
      await addDoc(collection(db, 'group_messages'), {
        groupId: id,
        senderId: user.uid,
        text: encryptedText,
        createdAt: Date.now(),
      });

      await updateDoc(doc(db, 'groups', id), {
        updatedAt: Date.now(),
        lastMessage: encryptedText,
      });

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'group_messages');
    }
  };

  const decryptMessage = (encryptedText: string) => {
    if (!id) return '...';
    try {
      const secretKey = getSecretKey(id);
      const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8) || 'Decryption failed';
    } catch (e) {
      return 'Decryption failed';
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  if (loading) {
    return <div className="w-full max-w-2xl mx-auto min-h-screen flex items-center justify-center text-zinc-500">Loading group...</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 h-screen flex flex-col bg-black relative">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/messages')} className="p-2 hover:bg-zinc-900 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {group && (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/messages/g/${id}/settings`)}>
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {group.image ? (
                  <img src={group.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-zinc-500" />
                )}
              </div>
              <div>
                <p className="font-bold flex items-center gap-1">
                  {group.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {group?.features?.hideMemberNames && group.ownerId !== user?.uid 
                    ? 'Members hidden' 
                    : `${group.members?.length || 0} members`}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted</span>
          </div>
          {group?.ownerId === user?.uid && (
            <button onClick={() => navigate(`/messages/g/${id}/settings`)} className="p-2 hover:bg-zinc-900 rounded-full transition">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isMine = msg.senderId === user?.uid;
          const sender = members[msg.senderId];
          const showSenderName = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              {!isMine && (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden mr-2 self-end mb-1 shrink-0">
                  {group?.features?.hideMemberNames ? (
                    <Users className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <img 
                      src={sender?.photoURL || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
              )}
              <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {showSenderName && (
                  <span className="text-xs text-zinc-500 ml-1 mb-1">
                    {group?.features?.hideMemberNames && !isMine ? 'Hidden Member' : (sender?.displayName || 'Unknown')}
                  </span>
                )}
                <div className={`rounded-2xl px-4 py-2 ${isMine ? 'bg-blue-500 text-white rounded-tr-sm' : 'bg-zinc-800 text-white rounded-tl-sm'}`}>
                  <p className="whitespace-pre-wrap break-words">{decryptMessage(msg.text)}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-200' : 'text-zinc-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-black relative z-10">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full mb-2 right-4 z-50"
            >
              <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {group?.features?.onlyOwnerCanMessage && group.ownerId !== user?.uid ? (
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center px-4 py-3 text-zinc-500 text-sm">
              Only the group owner can send messages
            </div>
          ) : (
            <>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center px-2 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-zinc-400 hover:text-blue-500 transition rounded-full hover:bg-zinc-800"
                >
                  <Smile className="w-6 h-6" />
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    setNewMessage(e.target.value);
                  }}
                  placeholder="Message group"
                  className="flex-1 bg-transparent text-white outline-none resize-none py-3 px-2 max-h-[120px]"
                  rows={1}
                />
                <button 
                  type="button" 
                  className="p-2 text-zinc-400 hover:text-blue-500 transition rounded-full hover:bg-zinc-800"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
              </div>
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white p-3 rounded-full transition shrink-0 h-12 w-12 flex items-center justify-center"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
