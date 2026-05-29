// backend/seed.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// CONFIGURATION: Change this to your login email
const YOUR_EMAIL = 'istiackador@gmail.com';

// Test users data (emails, passwords, names)
const testUsers = [
  { email: 'alice@chatters.test', password: 'Alice123!', full_name: 'Alice Johnson' },
  { email: 'bob@chatters.test',   password: 'Bob123!',   full_name: 'Bob Smith' },
  { email: 'carol@chatters.test', password: 'Carol123!', full_name: 'Carol Davis' },
  { email: 'david@chatters.test', password: 'David123!', full_name: 'David Wilson' },
  { email: 'emma@chatters.test',  password: 'Emma123!',  full_name: 'Emma Brown' },
];

// Groups data
const groupsData = [
  { name: 'Design Team',   avatar: 'DT', members: ['Alice Johnson', 'Bob Smith', 'Carol Davis'] },
  { name: 'Project Alpha', avatar: 'PA', members: ['Bob Smith', 'David Wilson', 'Emma Brown'] },
  { name: 'Family Group',  avatar: 'FG', members: ['Alice Johnson', 'Carol Davis', 'Emma Brown'] },
];

// Helper: Get user ID by email from auth.users (via admin API)
async function getUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find(u => u.email === email);
  return user ? user.id : null;
}

// Helper: Create a new user (auth + profile)
async function createUser(email, password, fullName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error) throw error;
  console.log(`  ✅ Created user: ${fullName} (${data.user.id})`);
  return data.user.id;
}

// Helper: Ensure a direct chat exists between two users
async function ensureDirectChat(userId1, userId2) {
  // Check if already exists
  const { data: user1Chats } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId1);
  const chatIds = user1Chats.map(p => p.chat_id);
  if (chatIds.length) {
    const { data: mutual } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId2)
      .in('chat_id', chatIds);
    if (mutual && mutual.length) {
      return mutual[0].chat_id;
    }
  }
  // Create new chat
  const { data: newChat, error } = await supabase
    .from('chats')
    .insert({ type: 'direct' })
    .select()
    .single();
  if (error) throw error;
  await supabase.from('chat_participants').insert([
    { chat_id: newChat.id, user_id: userId1 },
    { chat_id: newChat.id, user_id: userId2 }
  ]);
  return newChat.id;
}

// Helper: Insert messages only if chat has none
async function seedMessagesForChat(chatId, messagesArray) {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId);
  if (count > 0) {
    console.log(`  Skipping messages for chat ${chatId} (already have ${count})`);
    return;
  }
  for (const msg of messagesArray) {
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: msg.sender_id,
      content: msg.content,
      type: msg.type,
      media_url: msg.media_url || null,
      created_at: msg.created_at
    });
  }
  console.log(`  ✅ Inserted ${messagesArray.length} messages for chat ${chatId}`);
}

// ---------- MAIN ----------
async function seed() {
  console.log('🌱 Seeding started...');

  // 1. Get your user ID
  const myUserId = await getUserIdByEmail(YOUR_EMAIL);
  if (!myUserId) {
    throw new Error(`User with email ${YOUR_EMAIL} not found. Please sign in to your app at least once.`);
  }
  console.log(`✅ Your user ID: ${myUserId}`);

  // 2. Create test users if they don't exist, store their IDs
  const userIds = {};
  for (const u of testUsers) {
    let id = await getUserIdByEmail(u.email);
    if (!id) {
      id = await createUser(u.email, u.password, u.full_name);
    } else {
      console.log(`  ℹ️ User ${u.full_name} already exists (${id})`);
    }
    userIds[u.full_name] = id;
  }

  // 3. Create direct chats between you and each test user
  console.log('\n📩 Creating direct chats...');
  for (const [name, otherId] of Object.entries(userIds)) {
    const chatId = await ensureDirectChat(myUserId, otherId);
    console.log(`  Direct chat with ${name}: ${chatId}`);
  }

  // 4. Seed messages for Alice chat (id 1 in sample)
  const aliceChatId = await ensureDirectChat(myUserId, userIds['Alice Johnson']);
  const aliceId = userIds['Alice Johnson'];
  const messagesForAlice = [
    { sender_id: aliceId, content: "Hey! How are you?", type: 'text', created_at: '2025-05-29T10:30:00Z' },
    { sender_id: myUserId, content: "I'm doing great! Thanks for asking.", type: 'text', created_at: '2025-05-29T10:35:00Z' },
    { sender_id: aliceId, content: "Check out this photo!", type: 'image', media_url: 'https://picsum.photos/200/150', created_at: '2025-05-29T10:38:00Z' },
    { sender_id: aliceId, content: "Want to grab coffee later?", type: 'text', created_at: '2025-05-29T10:40:00Z' },
    { sender_id: myUserId, content: "Sure! What time?", type: 'text', created_at: '2025-05-29T10:42:00Z' },
  ];
  await seedMessagesForChat(aliceChatId, messagesForAlice);

  // 5. Add shared media (documents, links) as additional messages
  const sharedMediaMessages = [
    { sender_id: aliceId, content: 'Project Proposal.pdf', type: 'file', media_url: 'https://example.com/proposal.pdf', created_at: '2024-01-10T12:00:00Z' },
    { sender_id: aliceId, content: 'Interesting Article', type: 'link', media_url: 'https://example.com/article', created_at: '2024-01-08T15:30:00Z' },
  ];
  await seedMessagesForChat(aliceChatId, sharedMediaMessages);

  // 6. Create groups
  console.log('\n👥 Creating groups...');
  for (const grp of groupsData) {
    // Check if group already exists
    let { data: existingGroup } = await supabase
      .from('chats')
      .select('id')
      .eq('name', grp.name)
      .eq('type', 'group')
      .single();
    let groupId;
    if (existingGroup) {
      groupId = existingGroup.id;
      console.log(`  Group "${grp.name}" already exists (${groupId})`);
    } else {
      const { data: newGroup, error } = await supabase
        .from('chats')
        .insert({ type: 'group', name: grp.name, avatar_url: grp.avatar })
        .select()
        .single();
      if (error) throw error;
      groupId = newGroup.id;
      console.log(`  ✅ Created group "${grp.name}" (${groupId})`);
    }
    // Add participants (you + members)
    const memberNames = [grp.members];
    const memberIds = [myUserId, ...grp.members.map(name => userIds[name])];
    for (const uid of memberIds) {
      const { data: exists } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', groupId)
        .eq('user_id', uid)
        .single();
      if (!exists) {
        await supabase.from('chat_participants').insert({ chat_id: groupId, user_id: uid });
      }
    }
    console.log(`    Participants ensured for "${grp.name}"`);
  }

  // 7. Seed group messages (optional)
  // For brevity, we can add a sample message to each group if empty
  for (const grp of groupsData) {
    const { data: groupChat } = await supabase
      .from('chats')
      .select('id')
      .eq('name', grp.name)
      .eq('type', 'group')
      .single();
    if (groupChat) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', groupChat.id);
      if (count === 0) {
        const firstMember = grp.members[0];
        const senderId = userIds[firstMember];
        if (senderId) {
          await supabase.from('messages').insert({
            chat_id: groupChat.id,
            sender_id: senderId,
            content: `${firstMember}: Welcome to ${grp.name}!`,
            type: 'text',
            created_at: new Date().toISOString()
          });
          console.log(`  ✅ Added welcome message to group "${grp.name}"`);
        }
      }
    }
  }

  console.log('\n✅ Seeding completed successfully!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});