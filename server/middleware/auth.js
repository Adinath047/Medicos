// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '4h';

// ── Startup guard ─────────────────────────────────────────────────────────────
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET is missing or too short. Set a 256-bit random secret in .env');
  process.exit(1);
}

// ── In-memory token blocklist (for logout invalidation) ───────────────────────
// Keys: jti (JWT ID). Values: expiry timestamp (ms). Pruned periodically.
const blocklist = new Map();

// Prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of blocklist) {
    if (exp < now) blocklist.delete(jti);
  }
}, 5 * 60 * 1000);

// ── Token factory ─────────────────────────────────────────────────────────────
const { randomBytes } = require('crypto');

function createToken(payload) {
  return jwt.sign(
    { ...payload, jti: randomBytes(8).toString('hex') },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── Invalidate a token (add to blocklist) ─────────────────────────────────────
function invalidateToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti && decoded?.exp) {
      blocklist.set(decoded.jti, decoded.exp * 1000); // exp is in seconds
    }
  } catch { /* ignore malformed tokens */ }
}

// ── Auth middleware ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  let token = req.cookies?.emr_token;
  
  if (!token && header) {
    token = header.startsWith('Bearer ') ? header.slice(7) : header;
  }
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check blocklist (logout invalidation)
    if (decoded.jti && blocklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    req.user  = decoded;
    req.token = token;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Token expired — please log in again'
      : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}

// ── Role guard ─────────────────────────────────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
}

// ── Hospital scope guard ───────────────────────────────────────────────────────
// Rejects requests where req.body.hospital_id or a queried record's hospital_id
// does not match the token's hospitalId (unless super_admin)
function requireSameHospital(getHospitalId) {
  return async (req, res, next) => {
    if (req.user?.role === 'super_admin') return next();
    try {
      const recordHospitalId = typeof getHospitalId === 'function'
        ? await getHospitalId(req)
        : req.body?.hospital_id;
      if (recordHospitalId && recordHospitalId !== req.user.hospitalId) {
        return res.status(403).json({ error: 'Cross-hospital access denied' });
      }
      next();
    } catch {
      next();
    }
  };
}

module.exports = { authMiddleware, requireRole, requireSameHospital, createToken, invalidateToken, JWT_SECRET };
