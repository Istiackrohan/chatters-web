const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const verifyToken = require('../middleware/auth');

const PROFILE_SELECT = 'id, full_name, avatar_url, status, show_profile, allow_search';

function isDiscoverableProfile(profile) {
    return profile?.allow_search !== false && profile?.show_profile !== false;
}

function formatPublicProfile(profile) {
    if (!profile) return null;

    const showProfile = profile.show_profile !== false;

    return {
        id: profile.id,
        full_name: showProfile ? profile.full_name : 'Private user',
        avatar_url: showProfile ? profile.avatar_url : null,
        status: showProfile ? profile.status : 'offline',
        show_profile: profile.show_profile ?? true,
        allow_search: profile.allow_search ?? true,
    };
}

// GET /api/users/all
router.get('/all', verifyToken, async (req, res) => {
    const currentUserId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_SELECT)
            .neq('id', currentUserId);
        if (error) throw error;
        res.json((data || []).filter(isDiscoverableProfile).map(formatPublicProfile));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/search?q=query - search users by name
router.get('/search', verifyToken, async (req, res) => {
    const { q } = req.query;
    const currentUserId = req.user.id;
    if (!q) return res.json([]);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_SELECT)
            .neq('id', currentUserId)
            .ilike('full_name', `%${q}%`)
            .limit(20);
        if (error) throw error;
        res.json((data || []).filter(isDiscoverableProfile).map(formatPublicProfile));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function fetchProfileOrAuthUser(id) {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', id)
        .limit(1)
        .maybeSingle();
    if (profileError) throw profileError;
    if (profile) return formatPublicProfile(profile);

    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(id);
    if (authError) throw authError;
    const user = authResult?.user;
    if (!user) return null;
    return {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email || user.id,
        avatar_url: null,
        status: null,
        show_profile: true,
        allow_search: true,
    };
}

// GET /api/users?ids=id1,id2 - batch fetch
router.get('/', verifyToken, async (req, res) => {
    const { ids } = req.query;
    if (!ids) return res.json([]);
    const idList = String(ids).split(',').map(s => s.trim()).filter(Boolean);
    if (!idList.length) return res.json([]);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_SELECT)
            .in('id', idList);
        if (error) throw error;

        const foundIds = new Set((data || []).map(profile => profile.id));
        const missingIds = idList.filter(id => !foundIds.has(id));

        const fallbackProfiles = await Promise.all(missingIds.map(async (id) => {
            try {
                return await fetchProfileOrAuthUser(id);
            } catch (err) {
                console.error('Failed to fetch fallback auth user for id', id, err.message);
                return null;
            }
        }));

        res.json([...(data || []).map(formatPublicProfile), ...fallbackProfiles.filter(Boolean)]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/:id - fetch a single user profile
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const profile = await fetchProfileOrAuthUser(id);
        if (!profile) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
