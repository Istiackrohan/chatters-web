export function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    let initials = words.map(word => {
      const realFirst = Array.from(word)[0] || '';
      return realFirst.toUpperCase();
    }).join('');
    return initials.slice(0, 2) || '?';
  }