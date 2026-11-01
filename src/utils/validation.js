
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  const value = String(email || '').trim();
  if (!value) return 'Enter your email address';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Enter a password';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validateName(name) {
  if (!String(name || '').trim()) return 'Enter your full name';
  return null;
}

export function validateTitle(title) {
  const value = String(title || '').trim();
  if (!value) return 'Enter a document title';
  if (value.length > 80) return 'Title is too long (max 80 characters)';
  return null;
}
