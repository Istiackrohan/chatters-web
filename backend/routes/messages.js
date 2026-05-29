const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const verifyToken = require('../middleware/auth');

// GET /api/messages/:chatId?limit=20&before=timestamp
router.get('/:chatId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const { limit = 20, before } = req.query;
  
  try {
    const { data: participant, error: partErr } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    if (partErr || !participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }
    
    let query = supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (before) {
      query = query.lt('created_at', before);
    }
    
    const { data: messages, error: msgErr } = await query;
    if (msgErr) throw msgErr;
    
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages
router.post('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { chatId, content, type = 'text', mediaUrl } = req.body;
  try {
    const { data: participant, error: partErr } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    if (partErr || !participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }
    
    const { data: newMsg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: userId,
        content,
        type,
        media_url: mediaUrl
      })
      .select()
      .single();
    if (msgErr) throw msgErr;
    
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);
    
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;