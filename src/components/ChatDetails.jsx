import { getInitials } from '../utils/avatar';

function ChatDetails({ activeChatData, sharedMedia }) {
    if (!activeChatData) return null;
  
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* User Info */}
        <div className="p-4 border-b border-gray-200 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 flex items-center justify-center text-white font-semibold text-2xl mx-auto mb-3">
            {activeChatData?.avatar}
          </div>
          <h3 className="text-base font-semibold text-gray-900">{activeChatData?.name}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {activeChatData?.online ? 'Online' : 'Last seen recently'}
          </p>
          <div className="flex gap-2 mt-3 justify-center">
            <button className="p-1.5 rounded-lg hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
  
        {/* Tabs for Media, Links, Docs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {['Media', 'Links', 'Docs'].map((tab) => (
              <button key={tab} className="flex-1 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
                {tab}
              </button>
            ))}
          </div>
        </div>
  
        {/* Shared Media */}
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
              <p className="text-xs text-gray-500 truncate">{link.url}</p>
            </div>
          ))}
  
          {sharedMedia.filter(m => m.type === 'document').map((doc) => (
            <div key={doc.id} className="mt-3 flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.size}</p>
              </div>
              <button className="text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  export default ChatDetails;