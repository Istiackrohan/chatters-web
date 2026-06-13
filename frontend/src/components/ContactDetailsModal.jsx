import { getInitials } from "../utils/avatar";

function ContactDetailsModal({ open, contact = {}, blocked = false, onClose, onBlockUser }) {
  if (!open) return null;

  const displayName = contact.full_name || contact.name || 'Unknown contact';
  const email = contact.email || contact.contact_email || 'No email available';
  const status = contact.status || (contact.online ? 'Online' : 'Offline') || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="text-lg font-semibold text-gray-900">Contact details</p>
            <p className="text-sm text-gray-500">Information about the person you are chatting with.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
        </div>
        <div className="px-5 py-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
              {contact.avatar || getInitials(displayName)}
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-500">{status}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p>{email}</p>
            </div>
            {contact.phone && (
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <p>{contact.phone}</p>
              </div>
            )}
            {contact.bio && (
              <div>
                <p className="font-medium text-gray-900">About</p>
                <p>{contact.bio}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onBlockUser?.(contact.id)}
              className="w-full rounded-2xl bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 transition"
            >
              {blocked ? 'Unblock user' : 'Block user'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-gray-700 hover:border-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactDetailsModal;
