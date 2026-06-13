import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/auth';
import { supabase } from '../lib/supabase';
import { loadBlockedUsers, removeBlockedUser } from '../utils/blockList';

function normalizeSettings(data = {}) {
  return {
    showProfile: data.show_profile ?? true,
    allowSearch: data.allow_search ?? true,
    twoFactorEnabled: data.two_factor_enabled ?? false,
  };
}

function normalizeSettingChanges(changes = {}) {
  const next = {};
  if (Object.prototype.hasOwnProperty.call(changes, 'show_profile')) {
    next.showProfile = changes.show_profile;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'allow_search')) {
    next.allowSearch = changes.allow_search;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'two_factor_enabled')) {
    next.twoFactorEnabled = changes.two_factor_enabled;
  }
  return next;
}

function AccountSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Privacy/security toggles stored on profiles
  const [settings, setSettings] = useState({
    showProfile: true,
    allowSearch: true,
    twoFactorEnabled: false,
  });
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadProfileSettings() {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('show_profile,allow_search,two_factor_enabled').eq('id', user.id).maybeSingle();
        if (!mounted) return;
        if (data) {
          setSettings(normalizeSettings(data));
        }
      } catch (err) {
        console.error('Failed to load profile settings', err);
      }
    }

    loadProfileSettings();

    const handleBlockedUsersUpdated = () => {
      setBlockedUsers(loadBlockedUsers());
    };

    handleBlockedUsersUpdated();
    window.addEventListener('blockedUsersUpdated', handleBlockedUsersUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('blockedUsersUpdated', handleBlockedUsersUpdated);
    };
  }, [user]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const result = await authService.updatePassword(newPassword);
      if (result.success) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update password' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (changes) => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = { id: user.id, ...changes };
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setSettings(prev => ({ ...prev, ...normalizeSettingChanges(changes) }));
      setMessage({ type: 'success', text: 'Settings saved' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    // Simple local storage store for reports (no backend endpoint available)
    const reports = JSON.parse(window.localStorage.getItem('app_reports') || '[]');
    reports.unshift({ id: Date.now(), email: form.get('email'), subject: form.get('subject'), message: form.get('message'), created_at: new Date().toISOString() });
    window.localStorage.setItem('app_reports', JSON.stringify(reports));
    setMessage({ type: 'success', text: 'Report submitted. Thank you!' });
    e.target.reset();
  };

  const handleUnblockUser = (userId) => {
    removeBlockedUser(userId);
    setBlockedUsers(loadBlockedUsers());
    setMessage({ type: 'success', text: 'Contact removed from block list.' });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6 text-gray-900">
      <div className="mx-auto max-w-3xl">
      <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }} className="text-2xl font-semibold mb-4 text-gray-950">Account Settings</h1>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-50 text-gray-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <section className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg text-gray-900 font-semibold mb-2">Change Password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
              disabled={loading}
            >
              {showNewPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
              disabled={loading}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <div>
            <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Update password</button>
          </div>
        </form>
      </section>

      <section className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg text-gray-950 font-semibold mb-2">Privacy & Safety</h2>
        <div className="space-y-3 text-gray-800">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={settings.showProfile} onChange={(e) => saveSettings({ show_profile: e.target.checked })} />
            <span>Show my profile to others</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={settings.allowSearch} onChange={(e) => saveSettings({ allow_search: e.target.checked })} />
            <span>Allow my account to be searchable</span>
          </label>
        </div>
      </section>

      <section className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Blocked contacts</h2>
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-gray-600">You have not blocked any contacts yet.</p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-3">
                <div>
                  <p className="font-medium text-gray-900">{contact.name}</p>
                  {contact.email && <p className="text-sm text-gray-500">{contact.email}</p>}
                  <p className="text-xs text-gray-500">Blocked on {new Date(contact.blockedAt).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblockUser(contact.id)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Security</h2>
        <div className="space-y-3 text-gray-800">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={settings.twoFactorEnabled} onChange={(e) => saveSettings({ two_factor_enabled: e.target.checked })} />
            <span>Enable Two-step verification (simulated)</span>
          </label>
        </div>
      </section>

      <section className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg text-gray-950 font-semibold mb-2">Report an issue</h2>
        <form onSubmit={handleReportIssue} className="space-y-3">
          <input name="email" type="email" placeholder="Your email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <input name="subject" type="text" placeholder="Subject" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <textarea name="message" placeholder="Describe the issue" className="w-full rounded-lg border border-gray-300 px-3 py-2 h-28 text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Submit report</button>
          </div>
        </form>
      </section>

      <section className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg text-gray-950 font-semibold mb-2">Terms & Policies</h2>
        <p className="text-sm text-gray-700 mb-2">By using this app you agree to our terms and privacy policy.</p>
        <details className="text-sm text-gray-700">
          <summary className="cursor-pointer">View full terms & policies</summary>
          <div className="mt-2 prose text-sm">
            <p>This is a demo application. Replace this section with your real terms and policies.</p>
          </div>
        </details>
      </section>
      </div>
    </div>
  );
}

export default AccountSettings;
