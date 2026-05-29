import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SideNavbar from "../components/SideNavbar";
import ChatList from "../components/ChatList";
import ConversationArea from "../components/ConversationArea";
import ChatDetails from "../components/ChatDetails";
import { api } from "../api/client";
import { supabase } from "../lib/supabase";
import { useDebounce } from "../hooks/useDebounce";

function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});
  const [sharedMedia, setSharedMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState({});

  const subscriptionRef = useRef(null);

  // Load chats and contacts
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

  // Search contacts with debounce
  useEffect(() => {
    async function searchContacts() {
      if (!debouncedSearch.trim()) {
        const allUsers = await api.getAllUsers();
        const formatted = allUsers.map(u => ({
          id: u.id,
          name: u.full_name,
          avatar: (u.full_name?.[0] || 'U').toUpperCase(),
          online: u.status === 'online',
          status: u.status || 'Available'
        }));
        setContacts(formatted);
        return;
      }
      try {
        const results = await api.searchUsers(debouncedSearch);
        const formatted = results.map(u => ({
          id: u.id,
          name: u.full_name,
          avatar: (u.full_name?.[0] || 'U').toUpperCase(),
          online: u.status === 'online',
          status: u.status || 'Available'
        }));
        setContacts(formatted);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }
    searchContacts();
  }, [debouncedSearch]);

  // Load messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    async function loadMessages() {
      try {
        const msgs = await api.getMessages(activeChat, 50);
        setMessages(prev => ({ ...prev, [activeChat]: msgs }));
        setHasMoreMessages(prev => ({ ...prev, [activeChat]: msgs.length === 50 }));

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

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

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
          setMessages(prev => {
            const existing = prev[activeChat] || [];
            if (existing.some(msg => msg.id === newMessage.id)) return prev;
            return {
              ...prev,
              [activeChat]: [...existing, newMessage]
            };
          });
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
          // Update chat list order for incoming message
          if (newMessage.sender_id !== user?.id) {
            setChats(prevChats => {
              const updated = prevChats.map(chat =>
                chat.id === newMessage.chat_id
                  ? { ...chat, lastMessage: newMessage.content, lastMessageTime: newMessage.created_at }
                  : chat
              );
              return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            });
            setGroups(prevGroups => {
              const updated = prevGroups.map(group =>
                group.id === newMessage.chat_id
                  ? { ...group, lastMessage: newMessage.content, lastMessageTime: newMessage.created_at }
                  : group
              );
              return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
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

  const loadMoreMessages = async (chatId) => {
    const currentMessages = messages[chatId] || [];
    if (currentMessages.length === 0) return;
    const oldestTimestamp = currentMessages[0]?.created_at;
    if (!oldestTimestamp) return;
    try {
      const olderMessages = await api.getMessages(chatId, 20, oldestTimestamp);
      if (olderMessages.length === 0) {
        setHasMoreMessages(prev => ({ ...prev, [chatId]: false }));
        return;
      }
      setMessages(prev => ({
        ...prev,
        [chatId]: [...olderMessages, ...prev[chatId]]
      }));
      setHasMoreMessages(prev => ({ ...prev, [chatId]: olderMessages.length === 20 }));
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  };

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
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMsg]
      }));
      // Optimistically reorder chat list
      setChats(prevChats => {
        const updated = prevChats.map(chat =>
          chat.id === chatId ? { ...chat, lastMessage: text, lastMessageTime: new Date().toISOString() } : chat
        );
        return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      });
      setGroups(prevGroups => {
        const updated = prevGroups.map(group =>
          group.id === chatId ? { ...group, lastMessage: text, lastMessageTime: new Date().toISOString() } : group
        );
        return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      });
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
          onLoadMore={() => loadMoreMessages(activeChat)}
          hasMoreMessages={hasMoreMessages[activeChat] !== false}
        />

        <ChatDetails activeChatData={activeChatData} sharedMedia={sharedMedia} />
      </div>
    </div>
  );
}

export default Home;