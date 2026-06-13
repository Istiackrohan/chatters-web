import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
    status: 'online',
  });

  useEffect(() => {
    if (!user) return;
    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, status')
        .eq('id', user.id)
        .single();
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          status: data.status || 'online',
        });
      }
    }
    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        status: formData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Profile updated successfully!');
      await supabase.auth.updateUser({ data: { full_name: formData.full_name } });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white shadow-[0_35px_60px_-30px_rgba(15,23,42,0.18)]">
        <div className="px-8 py-10 sm:px-12">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Profile Settings</p>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginTop:'5xp', marginBottom: '5px'}} className="mt-4 text-3xl font-semibold text-slate-950">Edit your profile</h1>
            <p className="mt-2 text-sm text-slate-600">Update your display name, avatar, and online status.</p>
          </div>

          {message && (
            <div className={`mb-6 rounded-3xl px-5 py-4 text-sm font-medium ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-800 mb-2">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-800 mb-2">Avatar URL</label>
                <input
                  type="url"
                  name="avatar_url"
                  value={formData.avatar_url}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {formData.avatar_url && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                      <img src={formData.avatar_url} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm text-slate-600">Preview avatar image</span>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-800 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex justify-center rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center rounded-3xl bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:from-blue-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
