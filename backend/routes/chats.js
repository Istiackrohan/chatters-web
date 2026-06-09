const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const verifyToken = require('../middleware/auth');

function formatChatProfile(profile) {
  if (!profile) return null;

  const showProfile = profile.show_profile !== false;

  return {
    id: profile.id,
    full_name: showProfile ? profile.full_name : 'Private user',
    avatar_url: showProfile ? profile.avatar_url : null,
    status: showProfile ? profile.status : 'offline',
  };
}

async function resolveChatUserProfile(userId) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, status, show_profile')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile) return formatChatProfile(profile);

  const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(userId);
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
        .maybeSingle();

      const { data: participant } = await supabase
        .from('chat_participants')
        .select('last_read_at')
        .eq('chat_id', chat.id)
        .eq('user_id', userId)
        .maybeSingle();
      const lastRead = participant?.last_read_at || new Date(0).toISOString();
      
      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', userId)
        .gt('created_at', lastRead);
      
      let otherUser = null;
      let otherId = null;
      let otherLastReadAt = null;
      let groupMembers = [];
      if (chat.type === 'direct') {
        const { data: otherParticipants } = await supabase
          .from('chat_participants')
          .select('user_id, last_read_at')
          .eq('chat_id', chat.id)
          .neq('user_id', userId);
        if (otherParticipants && otherParticipants.length) {
          otherId = otherParticipants[0].user_id;
          otherLastReadAt = otherParticipants[0].last_read_at;
          otherUser = await resolveChatUserProfile(otherId);
        }
      } else if (chat.type === 'group') {
        const { data: groupParticipants, error: groupParticipantsError } = await supabase
          .from('chat_participants')
          .select('user_id, last_read_at')
          .eq('chat_id', chat.id);
        if (groupParticipantsError) throw groupParticipantsError;

        groupMembers = await Promise.all((groupParticipants || []).map(async (member) => {
          const profile = await resolveChatUserProfile(member.user_id);
          return {
            id: member.user_id,
            last_read_at: member.last_read_at,
            full_name: profile?.full_name,
            avatar_url: profile?.avatar_url,
            status: profile?.status,
          };
        }));
      }

      return {
        ...chat,
        lastMessage: lastMsg?.content || '',
        lastMessageTime: lastMsg?.created_at,
        unread: unread || 0,
        otherUser,
        other_user_id: otherId,
        other_last_read_at: otherLastReadAt,
        group_members: groupMembers,
        members: chat.type === 'group' ? groupMembers.length : undefined,
        online: chat.type === 'group'
          ? groupMembers.filter(member => member.status === 'online').length
          : (chat.type === 'direct' ? otherUser?.status === 'online' : null),
        name: chat.type === 'direct' ? otherUser?.full_name : chat.name,
        avatar: chat.type === 'direct' ? otherUser?.avatar_url : chat.avatar_url,
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
  const { type, otherUserId, memberIds = [], groupName, groupAvatar } = req.body;
  try {
    if (type === 'direct') {
      if (!otherUserId) {
        return res.status(400).json({ error: 'A contact is required to start a chat' });
      }

      if (otherUserId === userId) {
        return res.status(400).json({ error: 'You cannot start a direct chat with yourself' });
      }

      const otherUser = await resolveChatUserProfile(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const { data: existing, error: existingError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId);
      if (existingError) throw existingError;

      const chatIds = existing.map(c => c.chat_id);
      if (chatIds.length) {
        const { data: mutual, error: mutualError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', otherUserId)
          .in('chat_id', chatIds);
        if (mutualError) throw mutualError;

        const mutualChatIds = mutual.map(c => c.chat_id);
        if (mutualChatIds.length) {
          const { data: directChats, error: directChatsError } = await supabase
            .from('chats')
            .select('id')
            .eq('type', 'direct')
            .in('id', mutualChatIds)
            .limit(1);
          if (directChatsError) throw directChatsError;

          if (directChats && directChats.length) {
            return res.json({ chatId: directChats[0].id, existing: true });
          }
        }
      }

      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'direct' })
        .select()
        .single();
      if (chatError) throw chatError;

      const { error: participantError } = await supabase.from('chat_participants').insert([
        { chat_id: newChat.id, user_id: userId },
        { chat_id: newChat.id, user_id: otherUserId }
      ]);
      if (participantError) throw participantError;

      return res.json({ chatId: newChat.id });
    } else {
      if (!groupName || !groupName.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }
      const members = Array.isArray(memberIds)
        ? [...new Set(memberIds.filter(id => id && id !== userId))]
        : [];
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'group', name: groupName.trim(), avatar_url: groupAvatar })
        .select()
        .single();
      if (chatError) throw chatError;
      const participants = [{ chat_id: newChat.id, user_id: userId }, ...members.map(id => ({ chat_id: newChat.id, user_id: id }))];
      if (participants.length) {
        await supabase.from('chat_participants').insert(participants);
      }
      return res.json({ chatId: newChat.id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/:chatId/members
router.post('/:chatId/members', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const { memberIds = [] } = req.body;

  try {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, type')
      .eq('id', chatId)
      .maybeSingle();
    if (chatError) throw chatError;
    if (!chat || chat.type !== 'group') {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    const { data: requester, error: requesterError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .maybeSingle();
    if (requesterError) throw requesterError;
    if (!requester) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const members = Array.isArray(memberIds)
      ? [...new Set(memberIds.filter(id => id && id !== userId))]
      : [];
    if (!members.length) {
      return res.status(400).json({ error: 'No members selected' });
    }

    const { data: existingMembers, error: existingError } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId);
    if (existingError) throw existingError;

    const existingIds = new Set((existingMembers || []).map(member => member.user_id));
    const newMembers = members.filter(id => !existingIds.has(id));
    if (!newMembers.length) {
      return res.json({ added: 0 });
    }

    const { error: insertError } = await supabase
      .from('chat_participants')
      .insert(newMembers.map(id => ({ chat_id: chatId, user_id: id })));
    if (insertError) throw insertError;

    res.json({ added: newMembers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chats/:chatId/members/me
router.delete('/:chatId/members/me', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  try {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, type')
      .eq('id', chatId)
      .maybeSingle();
    if (chatError) throw chatError;
    if (!chat || chat.type !== 'group') {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    const { error: deleteError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    if (deleteError) throw deleteError;

    res.json({ left: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
