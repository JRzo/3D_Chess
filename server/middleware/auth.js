import jwt from 'jsonwebtoken';

// JWT_SECRET is loaded from .env by index.js before any request arrives
const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
};

export const authenticate = (req, res, next) => {
  // Prefer httpOnly cookie; fall back to Authorization header (for API tools / curl)
  const token = req.cookies?.['chess3d-token']
    || req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, getSecret());
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
