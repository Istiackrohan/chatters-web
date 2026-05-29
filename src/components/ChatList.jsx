function ChatList({ activeTab, searchQuery, setSearchQuery, chats, groups, contacts, activeChat, setActiveChat }) {
    const getFilteredItems = () => {
      if (activeTab === "chats") {
        return chats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()));
      } else if (activeTab === "groups") {
        return groups.filter(group => group.name.toLowerCase().includes(searchQuery.toLowerCase()));
      } else {
        return contacts.filter(contact => contact.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
    };
  
    const filteredItems = getFilteredItems();
  
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-gray-900 capitalize">{activeTab}</p>
            <div className="flex gap-1">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative group">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
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
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
  
        <div className="flex-1 overflow-y-auto">
          {activeTab === "chats" && filteredItems.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 ${
                activeChat === chat.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                  {chat.avatar}
                </div>
                {chat.online && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-xs text-gray-500 truncate">
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
              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100"
            >
              <div className="relative flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                  {group.avatar}
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{group.name}</h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{group.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-xs text-gray-500 truncate">{group.lastMessage}</p>
                  {group.unread > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 flex-shrink-0 ml-2">
                      {group.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{group.members} members • {group.online} online</p>
              </div>
            </button>
          ))}
  
          {activeTab === "contacts" && (
            <>
              <div className="p-3 border-b border-gray-200">
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Find new contact</span>
                </button>
              </div>
              {filteredItems.map((contact) => (
                <button
                  key={contact.id}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100"
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                      {contact.avatar}
                    </div>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-sm font-medium text-gray-900">{contact.name}</h3>
                    <p className="text-xs text-gray-500">{contact.status}</p>
                  </div>
                  <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add
                  </button>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }
  
  export default ChatList;