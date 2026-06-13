const MESSAGE_CONTENT_TYPE = 'chatters.message.v1';

export function encodeMessageContent(text = '', replyTo = null) {
  if (!replyTo) return text || '';

  return JSON.stringify({
    type: MESSAGE_CONTENT_TYPE,
    text: text || '',
    replyTo: {
      id: replyTo.id || null,
      text: replyTo.text || '',
      senderName: replyTo.senderName || 'Message',
    },
  });
}

export function decodeMessageContent(content) {
  if (typeof content !== 'string') {
    return { text: content || '', replyTo: null };
  }

  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) {
    return { text: content, replyTo: null };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.type !== MESSAGE_CONTENT_TYPE) {
      return { text: content, replyTo: null };
    }

    return {
      text: parsed.text || '',
      replyTo: parsed.replyTo || null,
    };
  } catch {
    return { text: content, replyTo: null };
  }
}

export function getMessagePreview(content) {
  return decodeMessageContent(content).text;
}
