import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getInitials } from "../utils/avatar";

function ConversationArea({ activeChatId, activeChatData, messages = [], onSendMessage, onLoadMore, hasMoreMessages }) {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && activeChatId) {
      onSendMessage(activeChatId, messageInput);
      setMessageInput("");
    }
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

  if (!activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">Select a chat</h3>
          <p className="text-sm text-gray-500">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const renderMessages = messages.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: msg.sender_id === user?.id ? 'me' : 'them',
    time: formatTime(msg.created_at),
    type: msg.type,
    mediaUrl: msg.media_url,
  }));

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
              {activeChatData?.avatar || getInitials(activeChatData?.name)}
            </div>
            {activeChatData?.online && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></div>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{activeChatData?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">
              {activeChatData?.online ? 'Online' : 'Offline'}
              {activeChatData?.typing && ' • Typing...'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 relative">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowChatMenu(!showChatMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showChatMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">View contact</button>
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mute notifications</button>
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Clear chat</button>
              <hr className="my-1" />
              <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Block user</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
        <div className="space-y-3">
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
                <div className={`max-w-[70%] ${message.sender === 'me' ? 'order-2' : 'order-1'}`}>
                  {message.type === 'image' ? (
                    <div className="rounded-lg overflow-hidden cursor-pointer">
                      <img src={message.mediaUrl} alt="Shared" className="max-w-[200px] rounded-lg" />
                    </div>
                  ) : message.type === 'file' ? (
                    <div className="bg-gray-100 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <p className={`text-xs text-gray-400 mt-0.5 ${message.sender === 'me' ? 'text-right' : 'text-left'}`}>
                    {message.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-center">
          <button type="button" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
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