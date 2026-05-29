const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const verifyToken = require('../middleware/auth');

// GET /api/chats
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: participants, error: partError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);
    if (partError) throw partError;
    const chatIds = participants.map(p => p.chat_id);
    if (chatIds.length === 0) return res.json([]);

    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });
    if (chatError) throw chatError;

    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: participant } = await supabase
        .from('chat_participants')
        .select('last_read_at')
        .eq('chat_id', chat.id)
        .eq('user_id', userId)
        .single();
      const lastRead = participant?.last_read_at || new Date(0).toISOString();
      
      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', userId)
        .gt('created_at', lastRead);
      
      let otherUser = null;
      if (chat.type === 'direct') {
        const { data: otherParticipants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chat.id)
          .neq('user_id', userId);
        if (otherParticipants && otherParticipants.length) {
          const otherId = otherParticipants[0].user_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, status')
            .eq('id', otherId)
            .single();
          otherUser = profile;
        }
      }
      
      return {
        ...chat,
        lastMessage: lastMsg?.content || '',
        lastMessageTime: lastMsg?.created_at,
        unread: unread || 0,
        otherUser,
        name: chat.type === 'direct' ? otherUser?.full_name : chat.name,
        avatar: chat.type === 'direct' ? otherUser?.avatar_url : chat.avatar_url,
        online: chat.type === 'direct' ? otherUser?.status === 'online' : null,
      };
    }));
    
    res.json(enrichedChats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats
router.post('/', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { type, otherUserId, groupName, groupAvatar } = req.body;
  try {
    if (type === 'direct') {
      const { data: existing } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId);
      const chatIds = existing.map(c => c.chat_id);
      if (chatIds.length) {
        const { data: mutual } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', otherUserId)
          .in('chat_id', chatIds);
        if (mutual && mutual.length) {
          return res.json({ chatId: mutual[0].chat_id, existing: true });
        }
      }
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'direct' })
        .select()
        .single();
      if (chatError) throw chatError;
      await supabase.from('chat_participants').insert([
        { chat_id: newChat.id, user_id: userId },
        { chat_id: newChat.id, user_id: otherUserId }
      ]);
      return res.json({ chatId: newChat.id });
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'group', name: groupName, avatar_url: groupAvatar })
        .select()
        .single();
      if (chatError) throw chatError;
      await supabase.from('chat_participants').insert({ chat_id: newChat.id, user_id: userId });
      return res.json({ chatId: newChat.id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;