import { useState, useEffect } from 'react';

const ADJECTIVES = [
  'Swift', 'Bold', 'Bright', 'Fierce', 'Calm', 'Wild', 'Cool', 'Brave',
  'Sharp', 'Keen', 'Dark', 'Vivid', 'Silent', 'Rapid', 'Gentle', 'Cyber',
  'Neon', 'Phantom', 'Shadow', 'Crimson',
];
const NOUNS = [
  'Fox', 'Wolf', 'Bear', 'Eagle', 'Tiger', 'Hawk', 'Lion', 'Puma',
  'Lynx', 'Raven', 'Shark', 'Viper', 'Drake', 'Storm', 'Blaze', 'Ghost',
  'Glitch', 'Byte', 'Pulse', 'Flux',
];
const COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF69B4', '#00F5D4', '#F72585', '#4CC9F0',
  '#06D6A0', '#FF9F1C', '#E040FB', '#00B4D8', '#F4A261',
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createUser() {
  return {
    id: Math.random().toString(36).slice(2, 11),
    name: rand(ADJECTIVES) + rand(NOUNS),
    color: rand(COLORS),
  };
}

export function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pb_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        const newUser = createUser();
        localStorage.setItem('pb_user', JSON.stringify(newUser));
        setUser(newUser);
      }
    } catch {
      setUser(createUser());
    }
  }, []);

  const rename = (name) => {
    const updated = { ...user, name: name.trim() || user.name };
    try { localStorage.setItem('pb_user', JSON.stringify(updated)); } catch {}
    setUser(updated);
  };

  const recolor = (color) => {
    const updated = { ...user, color };
    try { localStorage.setItem('pb_user', JSON.stringify(updated)); } catch {}
    setUser(updated);
  };

  return { user, rename, recolor };
}
