import { useEffect, useRef, useState } from 'react';

function Notifications({ notifications = [], onOpenChat, onClearAll }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const dropdownWidth = 320;

  useEffect(() => {
    if (!isOpen) return;

    const updateDropdownPosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const left = Math.max(
        viewportPadding,
        Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - viewportPadding)
      );

      setDropdownStyle({
        top: `${rect.bottom + 8}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
      });
    };

    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    updateDropdownPosition();
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen]);

  const unreadCount = notifications.reduce((count, notification) => count + (notification.unread || 0), 0);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-900"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 z-20 inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-red-600 px-1.5 text-[0.65rem] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed z-[100] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl"
          style={dropdownStyle}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No new notifications'}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => onClearAll?.()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">You’re all caught up.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    onOpenChat?.(notification.chatId);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{notification.title}</p>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">{notification.time || 'Now'}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{notification.subtitle}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;
