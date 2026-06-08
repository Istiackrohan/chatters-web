import { useMemo, useState } from 'react';
import { getInitials } from '../utils/avatar';
import { addBlockedUser, isUserBlocked, removeBlockedUser } from '../utils/blockList';

function DetailAction({ label, children, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-800 hover:bg-gray-100'
      }`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${danger ? 'bg-red-50' : 'bg-gray-100'}`}>
        {children}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MemberAvatar({ member }) {
  return (
    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white">
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={member.full_name || 'Member'} className="h-full w-full object-cover" />
      ) : (
        getInitials(member.full_name)
      )}
    </div>
  );
}

function ChatDetails({ activeChatData, contacts = [], messages = [], pinnedMessages = [], sharedMedia, onAddMembers, onCreateGroupWithUser, onLeaveChat, onShareContact }) {
  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [shareSearch, setShareSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [sharingContactId, setSharingContactId] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [blockedVersion, setBlockedVersion] = useState(0);

  const isGroup = activeChatData?.type === 'group';
  const groupMembers = activeChatData?.group_members || [];
  const existingMemberIds = new Set(groupMembers.map(member => member.id));
  const directContact = activeChatData?.otherUser || {
    id: activeChatData?.other_user_id,
    full_name: activeChatData?.name,
    name: activeChatData?.name,
    avatar_url: activeChatData?.avatar,
    status: activeChatData?.online ? 'online' : 'offline',
  };
  const directContactId = directContact?.id;
  const directContactName = directContact?.full_name || directContact?.name || activeChatData?.name || 'Contact';
  const directContactBlocked = useMemo(
    () => (directContactId ? isUserBlocked(directContactId) : false),
    [directContactId, blockedVersion]
  );

  const addableContacts = useMemo(() => (
    contacts.filter(contact =>
      !existingMemberIds.has(contact.id) &&
      (!memberSearch.trim() || contact.name?.toLowerCase().includes(memberSearch.trim().toLowerCase()))
    )
  ), [contacts, existingMemberIds, memberSearch]);

  const searchResults = useMemo(() => (
    messages.filter(message =>
      searchQuery.trim() &&
      message.content?.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
  ), [messages, searchQuery]);

  const shareContacts = useMemo(() => (
    contacts.filter(contact =>
      contact.id !== directContactId &&
      (!shareSearch.trim() || contact.name?.toLowerCase().includes(shareSearch.trim().toLowerCase()))
    )
  ), [contacts, directContactId, shareSearch]);

  if (!activeChatData) return null;

  const toggleSelectedMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(memberId => memberId !== id) : [...prev, id]
    );
  };

  const handleAddMembers = async () => {
    if (!selectedMemberIds.length || savingMembers) return;
    try {
      setSavingMembers(true);
      await onAddMembers?.(activeChatData.id, selectedMemberIds);
      setSelectedMemberIds([]);
      setMemberSearch('');
      setActiveModal(null);
    } finally {
      setSavingMembers(false);
    }
  };

  const handleLeaveChat = async () => {
    if (leaving) return;
    try {
      setLeaving(true);
      await onLeaveChat?.(activeChatData.id);
      setActiveModal(null);
    } finally {
      setLeaving(false);
    }
  };

  const handleCreateGroupWithUser = async () => {
    if (!directContactId || creatingGroup) return;
    try {
      setCreatingGroup(true);
      await onCreateGroupWithUser?.(directContactId, directContactName);
      setActiveModal(null);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleShareContact = async (recipientId) => {
    if (!recipientId || sharingContactId) return;
    try {
      setSharingContactId(recipientId);
      await onShareContact?.(recipientId, directContact);
      setShareSearch('');
      setActiveModal(null);
    } finally {
      setSharingContactId(null);
    }
  };

  const handleToggleBlock = () => {
    if (!directContactId) return;
    if (directContactBlocked) {
      removeBlockedUser(directContactId);
    } else {
      addBlockedUser({
        id: directContactId,
        name: directContactName,
        email: directContact?.email || directContact?.contact_email || '',
      });
    }
    setBlockedVersion(prev => prev + 1);
  };

  return (
    <div className="w-80 min-w-0 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 text-center">
        <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 flex items-center justify-center text-white font-semibold text-2xl mx-auto mb-3">
          {activeChatData?.avatar || getInitials(activeChatData?.name || activeChatData?.otherUser?.full_name)}
        </div>
        <h3 className="text-base font-semibold text-gray-900">{activeChatData?.name}</h3>
        <p className="text-xs text-gray-900 mt-1">
          {isGroup ? `${groupMembers.length} members` : (activeChatData?.online ? 'Online' : 'Last seen recently')}
        </p>
      </div>

      {isGroup && (
        <div className="border-b border-gray-200 p-3">
          <div className="space-y-1">
            <DetailAction label="Add members" onClick={() => setActiveModal('add-members')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M18 9v3m0 0v3m0-3h3m-3 0h-3M15 21a6 6 0 00-12 0M9 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </DetailAction>
            <DetailAction label="Search" onClick={() => setActiveModal('search')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 21l-5.2-5.2m1.7-4.3a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </DetailAction>
            <DetailAction label="See chat members" onClick={() => setActiveModal('members')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 20h5v-1.5A3.5 3.5 0 0018.5 15M9 20H2v-1.5A3.5 3.5 0 015.5 15M12 20v-2a4 4 0 00-8 0v2m16 0v-2a4 4 0 00-6-3.46M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </DetailAction>
            <DetailAction label="Pinned messages" onClick={() => setActiveModal('pinned')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14 4l6 6-4 1-4.5 4.5.5 3.5-1 1-7-7 1-1 3.5.5L13 8l1-4z" />
              </svg>
            </DetailAction>
            <DetailAction label="Leave chat" danger onClick={() => setActiveModal('leave')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 12H3m0 0l4-4m-4 4l4 4m5-10V5a2 2 0 012-2h5a2 2 0 012 2v14a2 2 0 01-2 2h-5a2 2 0 01-2-2v-1" />
              </svg>
            </DetailAction>
          </div>
        </div>
      )}

      {!isGroup && (
        <div className="border-b border-gray-200 p-3">
          <div className="space-y-1">
            <DetailAction label="View profile" onClick={() => setActiveModal('profile')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0116.5 0" />
              </svg>
            </DetailAction>
            <DetailAction label="Search" onClick={() => setActiveModal('search')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 21l-5.2-5.2m1.7-4.3a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </DetailAction>
            <DetailAction label="Pinned message" onClick={() => setActiveModal('pinned')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14 4l6 6-4 1-4.5 4.5.5 3.5-1 1-7-7 1-1 3.5.5L13 8l1-4z" />
              </svg>
            </DetailAction>
            <DetailAction label={`Create group with ${directContactName}`} onClick={() => setActiveModal('create-group')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M18 9v3m0 0v3m0-3h3m-3 0h-3M15 21a6 6 0 00-12 0M9 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </DetailAction>
            <DetailAction label="Share contact" onClick={() => setActiveModal('share-contact')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7h8M8 11h5m-9 9l3.5-3.5H18a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v15z" />
              </svg>
            </DetailAction>
            <DetailAction label={directContactBlocked ? 'Unblock' : 'Block'} danger onClick={() => setActiveModal('block')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </DetailAction>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex">
          {['Media', 'Links', 'Docs'].map((tab) => (
            <button key={tab} className="flex-1 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {sharedMedia.filter(m => m.type === 'image').map((media) => (
            <div key={media.id} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90">
              <img src={media.url} alt="Shared" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {sharedMedia.filter(m => m.type === 'link').map((link) => (
          <div key={link.id} className="mt-3 p-2 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-900 truncate">{link.title}</p>
            <p className="text-xs text-gray-900 truncate">{link.url}</p>
          </div>
        ))}
      </div>

      {activeModal === 'add-members' && (
        <Modal title="Add members" onClose={() => setActiveModal(null)}>
          <input
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Search contacts..."
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
            {addableContacts.length ? addableContacts.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => toggleSelectedMember(contact.id)}
                className={`flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left last:border-b-0 ${selectedMemberIds.includes(contact.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white">
                  {contact.avatar || getInitials(contact.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                  <p className="truncate text-xs text-gray-600">{contact.status || 'Available'}</p>
                </div>
                <span className="text-xs font-semibold text-blue-700">{selectedMemberIds.includes(contact.id) ? 'Selected' : 'Add'}</span>
              </button>
            )) : (
              <p className="p-4 text-center text-sm text-gray-600">No contacts available</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddMembers}
            disabled={!selectedMemberIds.length || savingMembers}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingMembers ? 'Adding...' : `Add ${selectedMemberIds.length || ''} member${selectedMemberIds.length === 1 ? '' : 's'}`}
          </button>
        </Modal>
      )}

      {activeModal === 'search' && (
        <Modal title="Search messages" onClose={() => setActiveModal(null)}>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={`Search this ${isGroup ? 'group' : 'chat'}...`}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            {searchResults.length ? searchResults.map(message => (
              <div key={message.id} className="border-b border-gray-100 p-3 last:border-b-0">
                <p className="text-sm text-gray-900">{message.content}</p>
                <p className="mt-1 text-xs text-gray-500">{new Date(message.created_at).toLocaleString()}</p>
              </div>
            )) : (
              <p className="p-4 text-center text-sm text-gray-600">{searchQuery ? 'No messages found' : 'Type to search messages'}</p>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'members' && (
        <Modal title="Chat members" onClose={() => setActiveModal(null)}>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            {groupMembers.map(member => (
              <div key={member.id} className="flex items-center gap-3 border-b border-gray-100 p-3 last:border-b-0">
                <MemberAvatar member={member} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{member.full_name || 'Member'}</p>
                  <p className="truncate text-xs text-gray-600">{member.status || 'Offline'}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {activeModal === 'pinned' && (
        <Modal title="Pinned messages" onClose={() => setActiveModal(null)}>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            {pinnedMessages.length ? pinnedMessages.map(message => (
              <div key={message.id} className="border-b border-gray-100 p-3 last:border-b-0">
                <p className="text-sm text-gray-900">{message.content}</p>
                <p className="mt-1 text-xs text-gray-500">{new Date(message.created_at).toLocaleString()}</p>
              </div>
            )) : (
              <p className="p-4 text-center text-sm text-gray-600">No pinned messages yet</p>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'leave' && (
        <Modal title="Leave chat" onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-700">You will stop receiving messages from this group and it will be removed from your group list.</p>
          <button
            type="button"
            onClick={handleLeaveChat}
            disabled={leaving}
            className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {leaving ? 'Leaving...' : 'Leave chat'}
          </button>
        </Modal>
      )}

      {activeModal === 'profile' && (
        <Modal title="View profile" onClose={() => setActiveModal(null)}>
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-semibold text-white">
              {directContact?.avatar_url ? (
                <img src={directContact.avatar_url} alt={directContactName} className="h-full w-full object-cover" />
              ) : (
                getInitials(directContactName)
              )}
            </div>
            <p className="mt-3 text-base font-semibold text-gray-900">{directContactName}</p>
            <p className="mt-1 text-sm text-gray-600">{directContact?.status || (activeChatData?.online ? 'Online' : 'Offline')}</p>
            {directContact?.email && <p className="mt-1 text-sm text-gray-600">{directContact.email}</p>}
          </div>
        </Modal>
      )}

      {activeModal === 'create-group' && (
        <Modal title={`Create group with ${directContactName}`} onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-700">This will create a new group chat with you and {directContactName}.</p>
          <button
            type="button"
            onClick={handleCreateGroupWithUser}
            disabled={creatingGroup}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creatingGroup ? 'Creating...' : 'Create group'}
          </button>
        </Modal>
      )}

      {activeModal === 'share-contact' && (
        <Modal title="Share contact" onClose={() => setActiveModal(null)}>
          <p className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">Share {directContactName} with another contact.</p>
          <input
            value={shareSearch}
            onChange={(event) => setShareSearch(event.target.value)}
            placeholder="Search contacts..."
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
            {shareContacts.length ? shareContacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-3 border-b border-gray-100 p-3 last:border-b-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white">
                  {contact.avatar || getInitials(contact.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                  <p className="truncate text-xs text-gray-600">{contact.status || 'Available'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareContact(contact.id)}
                  disabled={Boolean(sharingContactId)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sharingContactId === contact.id ? 'Sharing...' : 'Share'}
                </button>
              </div>
            )) : (
              <p className="p-4 text-center text-sm text-gray-600">No contacts found</p>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'block' && (
        <Modal title={directContactBlocked ? 'Unblock contact' : 'Block contact'} onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-700">
            {directContactBlocked
              ? `${directContactName} will be removed from your blocked contacts.`
              : `${directContactName} will be added to your blocked contacts.`}
          </p>
          <button
            type="button"
            onClick={() => {
              handleToggleBlock();
              setActiveModal(null);
            }}
            className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${directContactBlocked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {directContactBlocked ? 'Unblock' : 'Block'}
          </button>
        </Modal>
      )}
    </div>
  );
}

export default ChatDetails;
