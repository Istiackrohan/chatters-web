const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const verifyToken = require('../middleware/auth');

// GET /api/users/all
router.get('/all', verifyToken, async (req, res) => {
    console.log("Users req, res:", req, " ", res);
    const currentUserId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, status')
            .neq('id', currentUserId);
        if (error) throw error;
        res.json(data);
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
            .select('id, full_name, avatar_url, status')
            .neq('id', currentUserId)
            .ilike('full_name', `%${q}%`)
            .limit(20);
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function fetchProfileOrAuthUser(id) {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, status')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
    if (profileError) throw profileError;
    if (profile) return profile;

    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(id);
    if (authError) throw authError;
    const user = authResult?.user;
    if (!user) return null;
    return {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email || user.id,
        avatar_url: null,
        status: null,
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
            .select('id, full_name, avatar_url, status')
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

        res.json([...(data || []), ...fallbackProfiles.filter(Boolean)]);
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