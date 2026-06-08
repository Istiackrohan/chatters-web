import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProfileCache } from "../contexts/ProfileCacheContext";
import { getInitials } from "../utils/avatar";

function MessageTicks({ status }) {
  if (!status) return null;

  const isSeen = status === 'seen';
  const isDelivered = status === 'delivered' || isSeen;
  const label = status === 'sent' ? 'Sent' : isSeen ? 'Seen' : 'Delivered';
  const colorClass = isSeen ? 'text-sky-400' : 'text-gray-500';

  return (
    <span className={`inline-flex items-center ${colorClass}`} title={label} aria-label={label}>
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5L6.1 11.5L13 4.5" />
      </svg>
      {isDelivered && (
        <svg className="-ml-2 h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5L6.1 11.5L13 4.5" />
        </svg>
      )}
    </span>
  );
}

function MessageActionMenu({ message, onAction }) {
  const ownActions = [
    { key: 'react', label: 'React' },
    { key: 'edit', label: 'Edit' },
    { key: 'pin', label: 'Pin' },
    { key: 'reply', label: 'Reply' },
    { key: 'copy', label: 'Copy' },
    { key: 'forward', label: 'Forward' },
    { key: 'unsend-you', label: 'Unsend for you', danger: true },
    { key: 'unsend-everyone', label: 'Unsend for everyone', danger: true },
  ];

  const otherActions = [
    { key: 'react', label: 'React' },
    { key: 'reply', label: 'Reply' },
    { key: 'copy', label: 'Copy' },
    { key: 'forward', label: 'Forward' },
    { key: 'delete-you', label: 'Delete for you', danger: true },
    { key: 'pin', label: 'Pin' },
  ];

  const actions = message.sender === 'me' ? ownActions : otherActions;

  return (
    <div className="w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
      {actions.map(action => (
        <button
          key={action.key}
          type="button"
          onClick={() => onAction(action.key, message)}
          className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${action.danger ? 'text-red-600' : 'text-gray-800'}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function ConversationArea({ activeChatId, activeChatData, messages = [], contacts = [], contactsMap = {}, pinnedMessageIds = [], muted = false, onSendMessage, onForwardMessage, onTogglePin, onToggleMute, onLoadMore, hasMoreMessages, onClearChat }) {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [messageMenuPosition, setMessageMenuPosition] = useState(null);
  const [reactionPickerMessage, setReactionPickerMessage] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const [reactions, setReactions] = useState({});
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [localMessageText, setLocalMessageText] = useState({});
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardingContactId, setForwardingContactId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachingFile, setAttachingFile] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const chatMenuRef = useRef(null);
  const messageMenuRef = useRef(null);
  const composerExtrasRef = useRef(null);
  const fileInputRef = useRef(null);
  const { getProfile } = useProfileCache();

  useEffect(() => {
    if (!showChatMenu && !activeMessageMenu && !reactionPickerMessage) return;

    const handleOutsideClick = (event) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
        setShowChatMenu(false);
      }
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        setActiveMessageMenu(null);
        setMessageMenuPosition(null);
        setReactionPickerMessage(null);
        setReactionPickerPosition(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showChatMenu, activeMessageMenu, reactionPickerMessage]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleOutsideClick = (event) => {
      if (composerExtrasRef.current && !composerExtrasRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (editingMessage) {
      if (messageInput.trim()) {
        setLocalMessageText(prev => ({ ...prev, [editingMessage.id]: messageInput.trim() }));
      }
      setEditingMessage(null);
      setMessageInput("");
      return;
    }

    if (messageInput.trim() && activeChatId) {
      onSendMessage(activeChatId, messageInput);
      setMessageInput("");
      setReplyToMessage(null);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessageInput(prev => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handleAttachmentChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !activeChatId || attachingFile) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('Attachment must be under 5 MB');
      return;
    }

    try {
      setAttachingFile(true);
      const mediaUrl = await readFileAsDataUrl(file);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      onSendMessage(activeChatId, {
        content: file.name,
        type,
        mediaUrl,
      });
      setToastMessage(type === 'image' ? 'Image attached' : 'File attached');
    } catch {
      setToastMessage('Attachment failed');
    } finally {
      setAttachingFile(false);
    }
  };

  const handleClearChatClick = () => {
    setShowChatMenu(false);
    setShowClearConfirm(true);
  };

  const handleToggleMuteClick = () => {
    setShowChatMenu(false);
    onToggleMute?.();
    setToastMessage(muted ? 'Notifications unmuted' : 'Notifications muted');
  };

  const handleConfirmClearChat = () => {
    setShowClearConfirm(false);
    onClearChat?.(activeChatId);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await onLoadMore();
    setLoadingMore(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const directChatName = activeChatData?.otherUser?.full_name;
  const chatTitle = activeChatData?.name || directChatName || (() => {
    const otherMessage = messages.find(msg => msg.sender_id !== user?.id);
    if (!otherMessage) return null;
    const profile = getProfile(otherMessage.sender_id);
    return profile?.full_name || contactsMap[otherMessage.sender_id]?.name || null;
  })() || 'Unknown';

  const getSenderName = (senderId) => {
    if (senderId === user?.id) return 'You';
    const p = getProfile(senderId);
    if (p?.full_name) return p.full_name;
    return contactsMap[senderId]?.name || directChatName || activeChatData?.name || null;
  };

  const getMessageStatus = (message) => {
    if (activeChatData?.type !== 'direct' || message.sender !== 'me') return null;
    if (message.deliveryStatus === 'sent') return 'sent';

    const messageTime = new Date(message.created_at).getTime();
    const otherLastReadTime = activeChatData?.other_last_read_at
      ? new Date(activeChatData.other_last_read_at).getTime()
      : 0;

    if (otherLastReadTime && otherLastReadTime >= messageTime) {
      return 'seen';
    }

    return 'delivered';
  };

  const copyMessageText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage('Message copied');
    } catch {
      setToastMessage('Copy failed');
    }
  };

  const handleMessageAction = (action, message) => {
    setActiveMessageMenu(null);
    setMessageMenuPosition(null);
    setReactionPickerMessage(null);

    if (action === 'react') {
      setReactionPickerMessage(message.id);
      setReactionPickerPosition(messageMenuPosition);
      return;
    }

    if (action === 'reply') {
      setReplyToMessage(message);
      return;
    }

    if (action === 'copy') {
      copyMessageText(message.text);
      return;
    }

    if (action === 'edit') {
      setEditingMessage(message);
      setReplyToMessage(null);
      setMessageInput(message.text || '');
      return;
    }

    if (action === 'pin') {
      setToastMessage(pinnedMessageIds.includes(message.id) ? 'Message unpinned' : 'Message pinned');
      onTogglePin?.(message.id);
      return;
    }

    if (action === 'forward') {
      setForwardMessage(message);
      return;
    }

    if (action === 'unsend-you' || action === 'delete-you') {
      setHiddenMessageIds(prev => [...new Set([...prev, message.id])]);
      return;
    }

    if (action === 'unsend-everyone') {
      setLocalMessageText(prev => ({ ...prev, [message.id]: 'This message was unsent' }));
    }
  };

  const handleReact = (messageId, reaction) => {
    setReactions(prev => ({ ...prev, [messageId]: reaction }));
    setReactionPickerMessage(null);
    setReactionPickerPosition(null);
  };

  const handleForwardToContact = async (contactId) => {
    if (!forwardMessage || !contactId || forwardingContactId) return;

    try {
      setForwardingContactId(contactId);
      await onForwardMessage?.(contactId, forwardMessage.text);
      setForwardMessage(null);
      setForwardSearch("");
      setToastMessage('Message forwarded');
    } catch {
      setToastMessage('Forward failed');
    } finally {
      setForwardingContactId(null);
    }
  };

  if (!activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">Select a chat</h3>
          <p className="text-sm text-gray-900">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const renderMessages = messages
    .filter(msg => !hiddenMessageIds.includes(msg.id))
    .map(msg => ({
    id: msg.id,
    text: localMessageText[msg.id] ?? msg.content,
    sender: msg.sender_id === user?.id ? 'me' : 'them',
    senderName: getSenderName(msg.sender_id),
    sender_id: msg.sender_id,
    created_at: msg.created_at,
    time: formatTime(msg.created_at),
    type: msg.type,
    mediaUrl: msg.media_url,
    deliveryStatus: msg.delivery_status,
  }));

  const pinnedMessages = renderMessages.filter(message => pinnedMessageIds.includes(message.id));
  const activeMenuMessage = renderMessages.find(message => message.id === activeMessageMenu);
  const reactionMessage = renderMessages.find(message => message.id === reactionPickerMessage);
  const groupReadReceipts = (() => {
    if (activeChatData?.type !== 'group') return {};

    const receipts = {};
    const members = activeChatData?.group_members || [];

    members
      .filter(member => member.id !== user?.id && member.last_read_at)
      .forEach(member => {
        const readTime = new Date(member.last_read_at).getTime();
        const lastReadMessage = [...renderMessages]
          .filter(message =>
            message.sender_id !== member.id &&
            new Date(message.created_at).getTime() <= readTime
          )
          .pop();

        if (!lastReadMessage) return;

        receipts[lastReadMessage.id] = [...(receipts[lastReadMessage.id] || []), member];
      });

    return receipts;
  })();
  const forwardContacts = contacts.filter(contact =>
    !forwardSearch.trim() ||
    contact.name?.toLowerCase().includes(forwardSearch.trim().toLowerCase()) ||
    contact.status?.toLowerCase().includes(forwardSearch.trim().toLowerCase())
  );

  const getFloatingMenuPosition = (target, message, width = 192) => {
    const rect = target.getBoundingClientRect();
    const gap = 8;
    const estimatedHeight = message.sender === 'me' ? 288 : 224;
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - estimatedHeight - 8));
    const preferredLeft = message.sender === 'me' ? rect.left - width - gap : rect.right + gap;
    const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - width - 8));

    return { top, left };
  };

  const handleToggleMessageMenu = (event, message) => {
    event.stopPropagation();

    if (activeMessageMenu === message.id) {
      setActiveMessageMenu(null);
      setMessageMenuPosition(null);
      return;
    }

    setReactionPickerMessage(null);
    setReactionPickerPosition(null);
    setActiveMessageMenu(message.id);
    setMessageMenuPosition(getFloatingMenuPosition(event.currentTarget, message));
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
              {activeChatData?.avatar || getInitials(activeChatData?.name || directChatName)}
            </div>
            {activeChatData?.online && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></div>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{chatTitle}</p>
            <p className="text-xs text-gray-900">
              {activeChatData?.online ? 'Online' : 'Offline'}
              {activeChatData?.typing && ' • Typing...'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 relative" ref={chatMenuRef}>
          <button
            onClick={() => setShowChatMenu(prev => !prev)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showChatMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                type="button"
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleToggleMuteClick}
              >
                {muted ? 'Unmute notifications' : 'Mute notifications'}
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleClearChatClick}
              >
                Clear chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
        <div className="space-y-3">
          {pinnedMessages.length > 0 && (
            <div className="sticky top-0 z-20 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
              <p className="font-semibold">Pinned</p>
              <p className="truncate">{pinnedMessages[pinnedMessages.length - 1].text}</p>
            </div>
          )}
          {hasMoreMessages && (
            <div className="flex justify-center my-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}
          {renderMessages.map((message) => (
            <div key={message.id}>
              <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`group relative max-w-[82%] ${message.sender === 'me' ? 'order-2' : 'order-1'}`}>
                  <div className={`absolute top-0 ${message.sender === 'me' ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 transition-opacity group-hover:opacity-100`}>
                    <button
                      type="button"
                      onClick={(event) => handleToggleMessageMenu(event, message)}
                      className="rounded-full border border-gray-200 bg-white p-1 text-gray-700 shadow-sm hover:bg-gray-100"
                      aria-label="Message actions"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M5 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0Zm6.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0ZM18 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0Z" />
                      </svg>
                    </button>
                  </div>
                  {message.sender !== 'me' && (
                    <p className="text-xs font-semibold text-gray-900 mb-1">
                      {(() => {
                        const senderName = getSenderName(message.sender_id);
                        return senderName ? senderName : (
                          <span className="inline-block w-20 h-3 bg-gray-200 rounded animate-pulse" />
                        );
                      })()}
                    </p>
                  )}
                  {message.type === 'image' ? (
                    <div className="rounded-lg overflow-hidden cursor-pointer">
                      <img src={message.mediaUrl} alt="Shared" className="max-w-[200px] rounded-lg" />
                    </div>
                  ) : message.type === 'file' ? (
                    <div className="bg-gray-100 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                        {message.text}
                      </a>
                    </div>
                  ) : message.type === 'link' ? (
                    <div className="bg-gray-100 rounded-2xl px-3 py-1.5">
                      <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                        {message.text}
                      </a>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl px-3 py-1.5 ${
                        message.sender === 'me'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  )}
                  <p className={`text-xs text-gray-900 mt-0.5 flex items-center gap-1 ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <span>{message.time}</span>
                    <MessageTicks status={getMessageStatus(message)} />
                  </p>
                  {reactions[message.id] && (
                    <div className={`mt-1 flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-800 shadow-sm">
                        {reactions[message.id]}
                      </span>
                    </div>
                  )}
                  {groupReadReceipts[message.id]?.length > 0 && (
                    <div className={`mt-1 flex -space-x-1 ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      {groupReadReceipts[message.id].slice(0, 5).map(member => (
                        <span
                          key={member.id}
                          title={member.full_name || 'Seen'}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gradient-to-br from-blue-500 to-cyan-500 text-[0.55rem] font-semibold text-white shadow-sm"
                        >
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.full_name || 'Seen'} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            getInitials(member.full_name)
                          )}
                        </span>
                      ))}
                      {groupReadReceipts[message.id].length > 5 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-gray-200 px-1 text-[0.55rem] font-semibold text-gray-700 shadow-sm">
                          +{groupReadReceipts[message.id].length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeMenuMessage && messageMenuPosition && (
        <div
          ref={messageMenuRef}
          className="fixed z-[100]"
          style={{ top: `${messageMenuPosition.top}px`, left: `${messageMenuPosition.left}px` }}
        >
          <MessageActionMenu message={activeMenuMessage} onAction={handleMessageAction} />
        </div>
      )}

      {reactionMessage && reactionPickerPosition && (
        <div
          ref={messageMenuRef}
          className="fixed z-[100] flex gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-xl"
          style={{ top: `${reactionPickerPosition.top}px`, left: `${reactionPickerPosition.left}px` }}
        >
          {[
            { label: 'Like', value: '👍' },
            { label: 'Love', value: '❤️' },
            { label: 'Laugh', value: '😂' },
            { label: 'Sad', value: '😢' },
            { label: 'Angry', value: '😡' },
          ].map(reaction => (
            <button
              key={reaction.label}
              type="button"
              onClick={() => handleReact(reactionMessage.id, reaction.value)}
              className="rounded-full px-2 py-1 text-lg leading-none hover:bg-gray-100"
              aria-label={reaction.label}
              title={reaction.label}
            >
              {reaction.value}
            </button>
          ))}
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
            <p className="text-lg font-semibold text-gray-900">Clear this chat?</p>
            <p className="mt-2 text-sm text-gray-600">This will remove all messages from the current conversation. This action cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmClearChat}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 transition"
              >
                Clear chat
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-2 text-gray-700 hover:border-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {forwardMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/10">
            <p className="text-base font-semibold text-gray-900">Forward message</p>
            <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{forwardMessage.text}</p>
            <input
              type="text"
              value={forwardSearch}
              onChange={(event) => setForwardSearch(event.target.value)}
              placeholder="Search contacts..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
              {forwardContacts.length > 0 ? (
                forwardContacts.map(contact => (
                  <div key={contact.id} className="flex items-center gap-3 border-b border-gray-100 p-3 last:border-b-0">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white">
                      {contact.avatar || getInitials(contact.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                      <p className="truncate text-xs text-gray-600">{contact.status || 'Available'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleForwardToContact(contact.id)}
                      disabled={Boolean(forwardingContactId)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {forwardingContactId === contact.id ? 'Sending...' : 'Forward'}
                    </button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-gray-600">No contacts found</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setForwardMessage(null);
                  setForwardSearch("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
        {replyToMessage && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-blue-900">Replying to {replyToMessage.sender === 'me' ? 'yourself' : replyToMessage.senderName || 'message'}</p>
              <p className="truncate text-blue-800">{replyToMessage.text}</p>
            </div>
            <button type="button" onClick={() => setReplyToMessage(null)} className="ml-3 text-blue-800 hover:text-blue-950">
              Close
            </button>
          </div>
        )}
        {editingMessage && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
            <p className="font-semibold text-amber-900">Editing message</p>
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setMessageInput("");
              }}
              className="text-amber-800 hover:text-amber-950"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <div className="relative flex items-center gap-1" ref={composerExtrasRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Add emoji"
              title="Add emoji"
            >
              <span className="block text-lg leading-none">😊</span>
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 z-50 mb-2 grid w-56 grid-cols-7 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {['😀', '😄', '😂', '😍', '😘', '😎', '🤔', '😢', '😡', '👍', '👏', '🙏', '🔥', '🎉', '❤️', '💙', '✅', '✨', '👀', '💯', '🙌'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="rounded-lg p-1.5 text-lg leading-none hover:bg-gray-100"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachingFile}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Attach file"
              title="Attach file"
            >
              {attachingFile ? (
                <span className="block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
              ) : (
                <svg className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
            />
          </div>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button type="submit" className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all duration-200">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConversationArea;
