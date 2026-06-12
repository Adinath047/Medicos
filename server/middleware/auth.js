// server/middleware/auth.js
const supabase = require('../utils/supabase');
const { queryOne } = require('../db/database');

/**
 * Auth middleware using Supabase Auth
 */
async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  let token = null;
  
  if (header) {
    token = header.startsWith('Bearer ') ? header.slice(7) : header;
  } else {
    token = req.cookies?.emr_token;
  }
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    // Validate token against Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token expired or invalid — please log in again' });
    }

    // Retrieve user details from our users table
    const dbUser = await queryOne(
      'SELECT name, role, staff_type, hospital_id, photo_url, is_active, specialization, license_number, consultation_fee, followup_fee, letterhead FROM users WHERE id = $1',
      [user.id]
    );

    if (!dbUser || dbUser.is_active !== 1) {
      return res.status(401).json({ error: 'Account disabled or user profile not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: dbUser.name,
      role: dbUser.role,
      staff_type: dbUser.staff_type || 'front_desk',
      hospitalId: dbUser.hospital_id,
      photoUrl: dbUser.photo_url || null,
      specialization: dbUser.specialization || null,
      licenseNumber: dbUser.license_number || null,
      consultationFee: parseFloat(dbUser.consultation_fee) || 0,
      followupFee: parseFloat(dbUser.followup_fee) || 0,
      letterhead: dbUser.letterhead || null,
    };
    req.token = token;
    next();
  } catch (err) {
    console.error('[authMiddleware] error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role guard
 */
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

/**
 * Hospital scope guard
 */
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
    } catch (err) {
      // Deny access on error — never grant access when we can't verify hospital scope
      console.error('[requireSameHospital] error verifying hospital scope:', err.message);
      return res.status(500).json({ error: 'Could not verify access scope' });
    }
  };
}

module.exports = { authMiddleware, requireRole, requireSameHospital };
