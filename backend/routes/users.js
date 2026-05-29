const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const verifyToken = require('../middleware/auth');

// GET /api/users/all
router.get('/all', verifyToken, async (req, res) => {
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

// GET /api/users?search=query - search users by name
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

module.exports = router;