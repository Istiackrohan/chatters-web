import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SideNavbar from "../components/SideNavbar";
import ChatList from "../components/ChatList";
import ConversationArea from "../components/ConversationArea";
import ChatDetails from "../components/ChatDetails";
import { api } from "../api/client";
import { supabase } from "../lib/supabase";

function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // State for real data
  const [chats, setChats] = useState([]);        // direct chats
  const [groups, setGroups] = useState([]);      // group chats
  const [contacts, setContacts] = useState([]);  // all other users
  const [messages, setMessages] = useState({});  // object mapping chatId -> array of messages
  const [sharedMedia, setSharedMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs for subscription cleanup
  const subscriptionRef = useRef(null);

  // Load chats and contacts on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const allChats = await api.getChats();
        const direct = allChats.filter(c => c.type === 'direct');
        const groupList = allChats.filter(c => c.type === 'group');
        setChats(direct);
        setGroups(groupList);

        const allUsers = await api.getAllUsers();
        const formattedContacts = allUsers.map(user => ({
          id: user.id,
          name: user.full_name,
          avatar: (user.full_name?.[0] || 'U').toUpperCase(),
          online: user.status === 'online',
          status: user.status || 'Available'
        }));
        setContacts(formattedContacts);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Load messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    async function loadMessages() {
      try {
        const msgs = await api.getMessages(activeChat, 50);
        setMessages(prev => ({ ...prev, [activeChat]: msgs }));

        const media = msgs.filter(m => m.type === 'image' || m.type === 'file' || m.type === 'link')
          .map(m => ({
            id: m.id,
            type: m.type,
            url: m.media_url,
            name: m.content,
            date: m.created_at,
            size: m.type === 'file' ? 'unknown' : null
          }));
        setSharedMedia(media);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
    loadMessages();

    // Cleanup previous subscription if any
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Subscribe to new messages for the active chat
    const subscription = supabase
      .channel(`messages:chat_id=eq.${activeChat}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${activeChat}`,
        },
        (payload) => {
          const newMessage = payload.new;
          // Only add if not already present (avoid duplicates)
          setMessages(prev => {
            const existing = prev[activeChat] || [];
            if (existing.some(msg => msg.id === newMessage.id)) return prev;
            return {
              ...prev,
              [activeChat]: [...existing, newMessage]
            };
          });
          // Update shared media if needed
          if (newMessage.type === 'image' || newMessage.type === 'file' || newMessage.type === 'link') {
            setSharedMedia(prev => [
              ...prev,
              {
                id: newMessage.id,
                type: newMessage.type,
                url: newMessage.media_url,
                name: newMessage.content,
                date: newMessage.created_at
              }
            ]);
          }
          // Optionally update chat list (bump updated_at, unread count)
          // For simplicity, you could refetch chats or optimistically update
          if (newMessage.sender_id !== user?.id) {
            // Incoming message – you might want to increment unread count and reorder chat list
            // We'll refetch chats to keep it simple (or you can do a more targeted update)
            api.getChats().then(allChats => {
              const direct = allChats.filter(c => c.type === 'direct');
              const groupList = allChats.filter(c => c.type === 'group');
              setChats(direct);
              setGroups(groupList);
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [activeChat, user?.id]);

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      navigate("/login");
    } else {
      console.error("Logout failed:", result.error);
    }
  };

  const handleSendMessage = async (chatId, text) => {
    try {
      const newMsg = await api.sendMessage(chatId, text);
      // Optimistically add message to local state
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg]
      }));
      // Also update the chat list order (bump this chat to top)
      setChats(prevChats => {
        const updated = prevChats.map(chat =>
          chat.id === chatId ? { ...chat, lastMessage: text, lastMessageTime: new Date().toISOString() } : chat
        );
        // Sort by lastMessageTime descending
        return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      });
      // Similarly for groups if needed
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const activeChatData = [...chats, ...groups].find(chat => chat.id === activeChat);
  const activeMessages = messages[activeChat] || [];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      <div className="h-full max-w-[1600px] mx-auto flex">
        <SideNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          handleLogout={handleLogout}
        />

        <ChatList
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chats={chats}
          groups={groups}
          contacts={contacts}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
        />

        <ConversationArea
          activeChatId={activeChat}
          activeChatData={activeChatData}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
        />

        <ChatDetails activeChatData={activeChatData} sharedMedia={sharedMedia} />
      </div>
    </div>
  );
}

export default Home;