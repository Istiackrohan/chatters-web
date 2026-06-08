import { useState } from 'react';
import { getInitials } from '../utils/avatar';
import Notifications from './Notifications';

function ChatList({
  activeTab,
  searchQuery,
  setSearchQuery,
  chats,
  groups,
  contacts,
  activeChat,
  mutedChatIds = [],
  onSelectChat,
  onStartDirectChat,
  onCreateGroup,
  messageSearchHits = [],
  notifications = [],
  onOpenNotification,
  onClearNotifications,
}) {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const matchQuery = searchQuery.toLowerCase();

  const getFilteredItems = () => {
    if (activeTab === 'chats') {
      return chats.filter(chat => {
        const matchesName = chat.name?.toLowerCase().includes(matchQuery);
        const matchesMessage = chat.lastMessage?.toLowerCase().includes(matchQuery);
        const matchesSearchHit = matchQuery && messageSearchHits.includes(chat.id);
        return matchQuery ? matchesName || matchesMessage || matchesSearchHit : true;
      });
    } else if (activeTab === 'groups') {
      return groups.filter(group =>
        !matchQuery || group.name?.toLowerCase().includes(matchQuery) || group.lastMessage?.toLowerCase().includes(matchQuery)
      );
    }

    return contacts.filter(contact => contact.name.toLowerCase().includes(matchQuery));
  };

  const filteredItems = getFilteredItems();

  const toggleGroupMember = (contactId) => {
    setSelectedGroupMembers(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleCreateGroupSubmit = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) {
      return;
    }

    if (onCreateGroup) {
      await onCreateGroup(groupName.trim(), selectedGroupMembers);
    }
    setGroupName('');
    setSelectedGroupMembers([]);
    setShowCreateGroupModal(false);
  };

  const handleContactClick = (contact) => {
    if (onStartDirectChat) {
      onStartDirectChat(contact.id);
    }
  };

  return (
    <div className="w-80 min-w-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg font-semibold text-gray-900 capitalize">{activeTab}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Create group"
            >
              <svg className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <Notifications
              notifications={notifications}
              onOpenChat={onOpenNotification}
              onClearAll={onClearNotifications}
            />
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "chats" && filteredItems.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat?.(chat.id)}
            className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 ${activeChat === chat.id ? 'bg-blue-50' : ''
              }`}
          >
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                {chat.avatar || getInitials(chat.name || chat.otherUser?.full_name)}
              </div>
              {chat.online && (
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex justify-between items-baseline">
                <div className="flex min-w-0 items-center gap-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{chat.name || chat.otherUser?.full_name || 'Unknown'}</h3>
                  {mutedChatIds.includes(chat.id) && (
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Muted conversation">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636M9 9v6h4l5 4V8.5M8.5 5.5L13 9" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-900 flex-shrink-0 ml-2">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-900 truncate">
                  {chat.typing ? <span className="text-blue-600">Typing...</span> : chat.lastMessage}
                </p>
                {chat.unread > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 flex-shrink-0 ml-2 min-w-[20px] text-center">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}

        {activeTab === "groups" && filteredItems.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectChat?.(group.id)}
            className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 ${activeChat === group.id ? 'bg-blue-50' : ''}`}
          >
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                {group.avatar || getInitials(group.name)}
              </div>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex justify-between items-baseline">
                <div className="flex min-w-0 items-center gap-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{group.name}</h3>
                  {mutedChatIds.includes(group.id) && (
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Muted conversation">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636M9 9v6h4l5 4V8.5M8.5 5.5L13 9" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-900 flex-shrink-0 ml-2">{group.time}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-900 truncate">{group.lastMessage}</p>
                {group.unread > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 flex-shrink-0 ml-2">
                    {group.unread}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-900 mt-0.5">{group.members} members • {group.online} online</p>
            </div>
          </button>
        ))}

        {activeTab === 'contacts' && (
          <>
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">Create group</span>
              </button>
            </div>
            {filteredItems.map((contact) => (
              <div
                key={contact.id}
                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 cursor-pointer"
                onClick={() => handleContactClick(contact)}
              >
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                    {contact.avatar || (contact.name?.[0] || 'U').toUpperCase()}
                  </div>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-medium text-gray-900">{contact.name}</h3>
                  <p className="text-xs text-gray-900">{contact.status || 'Available'}</p>
                </div>
                <button
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContactClick(contact);
                  }}
                >
                  Chat
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Create group</h2>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Weekend Plans"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Select contacts</p>
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-2">
                  {contacts.map(contact => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleGroupMember(contact.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${selectedGroupMembers.includes(contact.id) ? 'bg-blue-100 text-blue-900' : 'hover:bg-white bg-transparent'}`}
                    >
                      <span>{contact.name}</span>
                      {selectedGroupMembers.includes(contact.id) && (
                        <span className="text-xs font-semibold text-blue-700">Selected</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-4">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroupSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!groupName.trim() || selectedGroupMembers.length === 0}
              >
                Create group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatList;
