import { Link } from "react-router-dom";

function SideNavbar({ activeTab, setActiveTab, user, showUserMenu, setShowUserMenu, handleLogout }) {
  // Derive user data from authenticated user
  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
    avatar: (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase(),
    email: user?.email || "",
  };

  return (
    <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 space-y-6">
      {/* Logo */}
      <img
        alt="Logo"
        src="https://i.ibb.co.com/BHQ0PrqS/image-removebg-preview-4.png"
        className="relative h-20 w-auto object-contain"
        style={{ filter: "drop-shadow(0 0 6px rgba(37,150,190,0.5))" }}
        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40?text=C'; }}
      />

      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col items-center space-y-4">
        <button
          onClick={() => setActiveTab("chats")}
          className={`p-3 rounded-xl transition-all duration-200 relative group ${
            activeTab === "chats" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Chats</span>
        </button>

        <button
          onClick={() => setActiveTab("groups")}
          className={`p-3 rounded-xl transition-all duration-200 relative group ${
            activeTab === "groups" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Groups</span>
        </button>

        <button
          onClick={() => setActiveTab("contacts")}
          className={`p-3 rounded-xl transition-all duration-200 relative group ${
            activeTab === "contacts" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Contacts</span>
        </button>
      </nav>

      {/* User Menu Button */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 flex items-center justify-center text-white font-semibold hover:scale-105 transition-transform duration-200"
        >
          {currentUser.avatar}
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.email}</p>
            </div>
            <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Profile Settings
            </Link>
            <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Account Settings
            </Link>
            <hr className="my-1" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SideNavbar;