import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProfileCache } from "../contexts/ProfileCacheContext";
import { useNavigate } from "react-router-dom";
import SideNavbar from "../components/SideNavbar";
import ChatList from "../components/ChatList";
import ConversationArea from "../components/ConversationArea";
import ChatDetails from "../components/ChatDetails";
import { api } from "../api/client";
import { supabase } from "../lib/supabase";
import { useDebounce } from "../hooks/useDebounce";
import { loadMutedChats, toggleMutedChat } from "../utils/mutedChats";
import { encodeMessageContent, getMessagePreview } from "../utils/messageContent";

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
  const [messageSearchHits, setMessageSearchHits] = useState([]);
  const [pinnedMessageIdsByChat, setPinnedMessageIdsByChat] = useState({});
  const [mutedChatIds, setMutedChatIds] = useState(() => loadMutedChats());
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const subscriptionRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const { fetchProfiles, getProfile } = useProfileCache();

  const notifications = useMemo(() => {
    const directNotifications = chats
      .filter(chat => chat.unread > 0 && !mutedChatIds.includes(chat.id))
      .map(chat => ({
        id: `chat-${chat.id}`,
        chatId: chat.id,
        title: chat.name || chat.otherUser?.full_name || 'New message',
        subtitle: chat.lastMessage || 'You have unread messages.',
        time: chat.lastMessageTime || chat.updated_at,
        unread: chat.unread,
      }));

    const groupNotifications = groups
      .filter(group => group.unread > 0 && !mutedChatIds.includes(group.id))
      .map(group => ({
        id: `group-${group.id}`,
        chatId: group.id,
        title: group.name,
        subtitle: group.lastMessage || 'New activity in group.',
        time: group.lastMessageTime || group.updated_at,
        unread: group.unread,
      }));

    return [...directNotifications, ...groupNotifications].sort((a, b) => {
      const aTime = new Date(a.time || 0).getTime();
      const bTime = new Date(b.time || 0).getTime();
      return bTime - aTime;
    });
  }, [chats, groups, mutedChatIds]);

  useEffect(() => {
    const handleMutedChatsUpdated = () => setMutedChatIds(loadMutedChats());
    window.addEventListener('mutedChatsUpdated', handleMutedChatsUpdated);
    return () => window.removeEventListener('mutedChatsUpdated', handleMutedChatsUpdated);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const syncOnlineUsers = () => {
      const presenceState = channel.presenceState();
      const userIds = Object.values(presenceState)
        .flat()
        .map(presence => presence.user_id)
        .filter(Boolean);
      setOnlineUserIds([...new Set(userIds)]);
    };

    channel
      .on('presence', { event: 'sync' }, syncOnlineUsers)
      .on('presence', { event: 'join' }, syncOnlineUsers)
      .on('presence', { event: 'leave' }, syncOnlineUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = channel;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel.untrack();
      supabase.removeChannel(channel);
      if (presenceChannelRef.current === channel) {
        presenceChannelRef.current = null;
      }
      setOnlineUserIds([]);
    };
  }, [user?.id]);

  const handleSelectChat = useCallback((chatId) => {
    if (!chatId) return;
    setActiveChat(chatId);
    setChats(prevChats => prevChats.map(chat => chat.id === chatId ? { ...chat, unread: 0 } : chat));
    setGroups(prevGroups => prevGroups.map(group => group.id === chatId ? { ...group, unread: 0 } : group));
  }, []);

  const handleOpenNotification = useCallback((chatId) => {
    if (!chatId) return;
    const isGroup = groups.some(group => group.id === chatId);
    setActiveTab(isGroup ? 'groups' : 'chats');
    handleSelectChat(chatId);
  }, [groups, handleSelectChat]);

  const handleClearNotifications = useCallback(() => {
    setChats(prevChats => prevChats.map(chat => chat.unread ? { ...chat, unread: 0 } : chat));
    setGroups(prevGroups => prevGroups.map(group => group.unread ? { ...group, unread: 0 } : group));
  }, []);

  // Ensure we have profiles for any senders in the provided messages
  const ensureProfilesForMessages = useCallback(async (msgs = []) => {
    try {
      const missingIds = [...new Set(
        msgs
          .map(m => m.sender_id)
          .filter(id => id && id !== user?.id)
      )];
      if (missingIds.length === 0) return;

      const profiles = await fetchProfiles(missingIds);
      const formatted = profiles.filter(Boolean).map(u => ({
        id: u.id,
        name: u.full_name,
        avatar: (u.full_name?.[0] || 'U').toUpperCase(),
        online: u.status === 'online',
        status: u.status || 'Available'
      }));

      if (formatted.length) {
        setContacts(prev => {
          const existing = new Set(prev.map(p => p.id));
          return [...prev, ...formatted.filter(f => !existing.has(f.id))];
        });
      }
    } catch (err) {
      console.error('Failed to fetch sender profiles:', err);
    }
  }, [fetchProfiles, user?.id]);


  async function refreshChats() {
    const allChats = await api.getChats();
    const normalizedChats = allChats.map(chat => ({
      ...chat,
      lastMessage: getMessagePreview(chat.lastMessage),
    }));
    const direct = normalizedChats.filter(c => c.type === 'direct');
    const groupList = normalizedChats.filter(c => c.type === 'group');
    setChats(direct);
    setGroups(groupList);
    return normalizedChats;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setLoading(true);
        const allChats = await refreshChats();
        const allUsers = await api.getAllUsers();
        const formattedContacts = allUsers.map(user => ({
          id: user.id,
          name: user.full_name,
          avatar: (user.full_name?.[0] || 'U').toUpperCase(),
          online: user.status === 'online',
          status: user.status || 'Available'
        }));

        if (isMounted) {
          setContacts(formattedContacts);
        }
        await fetchProfiles(formattedContacts.map(user => user.id));

        // preload participant profiles from chats (direct chat other_user_id)
        if (Array.isArray(allChats) && allChats.length) {
          const directIds = allChats
            .filter(c => c.type === 'direct')
            .map(c => c.other_user_id)
            .filter(Boolean);
          if (directIds.length) {
            await fetchProfiles(directIds);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
    // We intentionally run this effect once on mount to avoid repeated reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search contacts and messages with debounce
  useEffect(() => {
    async function search() {
      try {
        setMessageSearchHits([]);

        if (activeTab === 'contacts') {
          const results = debouncedSearch.trim()
            ? await api.searchUsers(debouncedSearch)
            : await api.getAllUsers();

          const formatted = results.map(u => ({
            id: u.id,
            name: u.full_name,
            avatar: (u.full_name?.[0] || 'U').toUpperCase(),
            online: u.status === 'online',
            status: u.status || 'Available'
          }));

          setContacts(formatted);
        } else if (activeTab === 'chats' && debouncedSearch.trim()) {
          const hits = await api.searchMessages(debouncedSearch);
          setMessageSearchHits(hits.map(hit => hit.chat_id));
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }

    search();
  }, [debouncedSearch, activeTab]);

  const handleStartDirectChat = async (contactId) => {
    try {
      const { chatId } = await api.createDirectChat(contactId);
      await refreshChats();
      setActiveTab('chats');
      setActiveChat(chatId);
    } catch (err) {
      console.error('Failed to start direct chat:', err);
    }
  };

  const handleCreateGroup = async (groupName, memberIds) => {
    try {
      if (!groupName || !memberIds?.length) {
        console.error('Group name and members are required');
        return;
      }
      const { chatId } = await api.createGroupChat(memberIds, groupName);
      await refreshChats();
      setActiveTab('groups');
      setActiveChat(chatId);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  // Load messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    async function loadMessages() {
      try {
        const msgs = await api.getMessages(activeChat, 50);
        setMessages(prev => ({ ...prev, [activeChat]: msgs }));
        // Ensure we have sender profiles for these messages
        ensureProfilesForMessages(msgs);
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
          // Ensure sender profile exists for this incoming message
          ensureProfilesForMessages([newMessage]);
          setMessages(prev => {
            const existing = prev[activeChat] || [];
            if (existing.some(msg => msg.id === newMessage.id)) return prev;
            if (newMessage.sender_id === user?.id) {
              const pendingIndex = existing.findIndex(msg =>
                msg.delivery_status === 'sent' &&
                msg.sender_id === user?.id &&
                msg.content === newMessage.content
              );

              if (pendingIndex !== -1) {
                const updated = [...existing];
                updated[pendingIndex] = { ...newMessage, delivery_status: 'delivered' };
                return {
                  ...prev,
                  [activeChat]: updated
                };
              }
            }

            return {
              ...prev,
              [activeChat]: [...existing, { ...newMessage, delivery_status: 'delivered' }]
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
            const messagePreview = getMessagePreview(newMessage.content);
            setChats(prevChats => {
              const updated = prevChats.map(chat =>
                chat.id === newMessage.chat_id
                  ? { ...chat, lastMessage: messagePreview, lastMessageTime: newMessage.created_at }
                  : chat
              );
              return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            });
            setGroups(prevGroups => {
              const updated = prevGroups.map(group =>
                group.id === newMessage.chat_id
                  ? { ...group, lastMessage: messagePreview, lastMessageTime: newMessage.created_at }
                  : group
              );
              return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants',
          filter: `chat_id=eq.${activeChat}`,
        },
        (payload) => {
          const participant = payload.new;
          if (!participant?.user_id || participant.user_id === user?.id) return;

          setChats(prevChats => prevChats.map(chat =>
            chat.id === participant.chat_id
              ? { ...chat, other_last_read_at: participant.last_read_at }
              : chat
          ));
          setGroups(prevGroups => prevGroups.map(group =>
            group.id === participant.chat_id
              ? {
                  ...group,
                  group_members: (group.group_members || []).map(member =>
                    member.id === participant.user_id
                      ? { ...member, last_read_at: participant.last_read_at }
                      : member
                  )
                }
              : group
          ));
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [activeChat, user?.id, ensureProfilesForMessages]);

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

  const handleSendMessage = async (chatId, message) => {
    const payload = typeof message === 'string'
      ? { content: message, type: 'text', mediaUrl: null }
      : {
          content: message?.content || '',
          type: message?.type || 'text',
          mediaUrl: message?.mediaUrl || null,
          replyTo: message?.replyTo || null,
        };

    if (!payload.content && !payload.mediaUrl) return;

    const createdAt = new Date().toISOString();
    const encodedContent = encodeMessageContent(payload.content, payload.replyTo);
    const messagePreview = getMessagePreview(encodedContent);
    const pendingMessage = {
      id: `pending-${createdAt}`,
      chat_id: chatId,
      sender_id: user?.id,
      content: encodedContent,
      type: payload.type,
      media_url: payload.mediaUrl,
      created_at: createdAt,
      delivery_status: 'sent',
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), pendingMessage]
    }));

    try {
      const newMsg = await api.sendMessage(chatId, encodedContent, payload.type, payload.mediaUrl);
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(msg =>
          msg.id === pendingMessage.id ? { ...newMsg, delivery_status: 'delivered' } : msg
        )
      }));
      // Optimistically reorder chat list
      setChats(prevChats => {
        const updated = prevChats.map(chat =>
          chat.id === chatId ? { ...chat, lastMessage: messagePreview, lastMessageTime: createdAt } : chat
        );
        return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      });
      setGroups(prevGroups => {
        const updated = prevGroups.map(group =>
          group.id === chatId ? { ...group, lastMessage: messagePreview, lastMessageTime: createdAt } : group
        );
        return updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      });
    } catch (err) {
      console.error('Send failed:', err);
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(msg => msg.id !== pendingMessage.id)
      }));
    }
  };

  const handleClearChat = (chatId) => {
    if (!chatId) return;
    setMessages(prev => ({ ...prev, [chatId]: [] }));
    setHasMoreMessages(prev => ({ ...prev, [chatId]: false }));
  };

  const handleToggleMuteChat = (chatId) => {
    if (!chatId) return;
    setMutedChatIds(toggleMutedChat(chatId));
  };

  const handleTogglePinnedMessage = (chatId, messageId) => {
    if (!chatId || !messageId) return;
    setPinnedMessageIdsByChat(prev => {
      const existing = prev[chatId] || [];
      const next = existing.includes(messageId)
        ? existing.filter(id => id !== messageId)
        : [...existing, messageId];
      return { ...prev, [chatId]: next };
    });
  };

  const handleAddGroupMembers = async (chatId, memberIds) => {
    if (!chatId || !memberIds?.length) return;
    await api.addGroupMembers(chatId, memberIds);
    await refreshChats();
  };

  const handleLeaveGroupChat = async (chatId) => {
    if (!chatId) return;
    await api.leaveGroupChat(chatId);
    setGroups(prev => prev.filter(group => group.id !== chatId));
    setMessages(prev => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    setPinnedMessageIdsByChat(prev => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (activeChat === chatId) {
      setActiveChat(null);
    }
  };

  const handleForwardMessage = async (contactId, text) => {
    if (!contactId || !text) return;

    try {
      const { chatId } = await api.createDirectChat(contactId);
      const newMsg = await api.sendMessage(chatId, text);
      await refreshChats();
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), { ...newMsg, delivery_status: 'delivered' }]
      }));
      setActiveTab('chats');
      setActiveChat(chatId);
    } catch (err) {
      console.error('Forward failed:', err);
      throw err;
    }
  };

  const handleCreateGroupWithUser = async (contactId, contactName) => {
    if (!contactId) return;
    const groupName = contactName ? `You and ${contactName}` : 'New group';
    const { chatId } = await api.createGroupChat([contactId], groupName);
    await refreshChats();
    setActiveTab('groups');
    setActiveChat(chatId);
  };

  const handleShareContact = async (recipientId, sharedContact) => {
    if (!recipientId || !sharedContact?.id) return;
    const { chatId } = await api.createDirectChat(recipientId);
    const contactName = sharedContact.full_name || sharedContact.name || 'Contact';
    const contactStatus = sharedContact.status ? `\nStatus: ${sharedContact.status}` : '';
    const contactText = `Shared contact: ${contactName}${contactStatus}`;
    const newMsg = await api.sendMessage(chatId, contactText);
    await refreshChats();
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), { ...newMsg, delivery_status: 'delivered' }]
    }));
    setActiveTab('chats');
    setActiveChat(chatId);
  };

  const displayedContacts = useMemo(
    () => contacts.map(contact => ({
      ...contact,
      online: onlineUserIds.includes(contact.id),
      status: onlineUserIds.includes(contact.id) ? 'Online' : (contact.status || 'Offline'),
    })),
    [contacts, onlineUserIds]
  );

  const displayedChats = useMemo(
    () => chats.map(chat => ({
      ...chat,
      online: onlineUserIds.includes(chat.other_user_id || chat.otherUser?.id),
      otherUser: chat.otherUser
        ? {
            ...chat.otherUser,
            status: onlineUserIds.includes(chat.other_user_id || chat.otherUser?.id) ? 'online' : 'offline',
          }
        : chat.otherUser,
    })),
    [chats, onlineUserIds]
  );

  const displayedGroups = useMemo(
    () => groups.map(group => {
      const groupMembers = (group.group_members || []).map(member => ({
        ...member,
        status: onlineUserIds.includes(member.id) ? 'online' : 'offline',
      }));

      return {
        ...group,
        group_members: groupMembers,
        online: groupMembers.filter(member => member.status === 'online').length,
      };
    }),
    [groups, onlineUserIds]
  );

  const contactsMap = useMemo(
    () => Object.fromEntries(displayedContacts.map(contact => [contact.id, contact])),
    [displayedContacts]
  );

  const activeChatData = [...displayedChats, ...displayedGroups].find(chat => chat.id === activeChat);
  const activeMessages = messages[activeChat] || [];
  const activePinnedMessageIds = pinnedMessageIdsByChat[activeChat] || [];
  const activePinnedMessages = activeMessages.filter(message => activePinnedMessageIds.includes(message.id));

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
      <div className="h-full w-full flex overflow-hidden">
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
          chats={displayedChats}
          groups={displayedGroups}
          contacts={displayedContacts}
          activeChat={activeChat}
          mutedChatIds={mutedChatIds}
          onSelectChat={handleSelectChat}
          onStartDirectChat={handleStartDirectChat}
          onCreateGroup={handleCreateGroup}
          messageSearchHits={messageSearchHits}
          notifications={notifications}
          onOpenNotification={handleOpenNotification}
          onClearNotifications={handleClearNotifications}
        />

        <ConversationArea
          activeChatId={activeChat}
          activeChatData={activeChatData}
          messages={activeMessages}
          contacts={displayedContacts}
          contactsMap={contactsMap}
          pinnedMessageIds={activePinnedMessageIds}
          onSendMessage={handleSendMessage}
          onForwardMessage={handleForwardMessage}
          onTogglePin={(messageId) => handleTogglePinnedMessage(activeChat, messageId)}
          muted={mutedChatIds.includes(activeChat)}
          onToggleMute={() => handleToggleMuteChat(activeChat)}
          onLoadMore={() => loadMoreMessages(activeChat)}
          hasMoreMessages={hasMoreMessages[activeChat] !== false}
          onClearChat={handleClearChat}
        />

        <ChatDetails
          activeChatData={activeChatData}
          contacts={displayedContacts}
          messages={activeMessages}
          pinnedMessages={activePinnedMessages}
          sharedMedia={sharedMedia}
          onAddMembers={handleAddGroupMembers}
          onCreateGroupWithUser={handleCreateGroupWithUser}
          onLeaveChat={handleLeaveGroupChat}
          onShareContact={handleShareContact}
        />
      </div>
    </div>
  );
}

export default Home;
