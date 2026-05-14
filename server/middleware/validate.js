// server/middleware/validate.js
// ── Lightweight, zero-dependency validation layer ──────────────────────────

/**
 * Sanitise a string: trim, collapse internal whitespace.
 */
function sanitize(v) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v;
}

// ── Primitive checks ────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,15}$/;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE  = /^\d{2}:\d{2}(:\d{2})?$/;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isEmail(v)  { return EMAIL_RE.test(v); }
function isPhone(v)  { return PHONE_RE.test(v); }
function isDate(v)   { return DATE_RE.test(v) && !isNaN(Date.parse(v)); }
function isTime(v)   { return TIME_RE.test(v); }
function isUUID(v)   { return UUID_RE.test(v); }
function isInt(v)    { return Number.isInteger(Number(v)) && String(Number(v)) !== 'NaN'; }
function isFloat(v)  { return !isNaN(parseFloat(v)) && isFinite(v); }

function inRange(v, min, max) {
  const n = Number(v);
  return !isNaN(n) && n >= min && n <= max;
}

// ── Schema-based request validator ─────────────────────────────────────────
/**
 * Usage:
 *   const { body, query, params } = validate;
 *   router.post('/', body({ name: [required, str(1, 100)], email: [required, email] }), handler)
 *
 * Each field spec is an array of checker functions that return an error string
 * or null/undefined on pass.
 */

function required(v) {
  if (v === undefined || v === null || v === '') return 'is required';
}

function str(min = 1, max = 1000) {
  return (v) => {
    if (v === undefined || v === null || v === '') return; // optional — use required() for mandatory
    const s = String(v).trim();
    if (s.length < min) return `must be at least ${min} character(s)`;
    if (s.length > max) return `must be at most ${max} characters`;
  };
}

function email(v) {
  if (v === undefined || v === null || v === '') return;
  if (!isEmail(String(v).trim())) return 'must be a valid email address';
}

function phone(v) {
  if (v === undefined || v === null || v === '') return;
  if (!isPhone(String(v).trim())) return 'must be a valid phone number (7–15 digits)';
}

function date(v) {
  if (v === undefined || v === null || v === '') return;
  if (!isDate(String(v).trim())) return 'must be a valid date (YYYY-MM-DD)';
}

function notFutureDate(v) {
  if (!v) return;
  if (!isDate(String(v))) return;
  if (new Date(v) > new Date()) return 'cannot be a future date';
}

function time(v) {
  if (v === undefined || v === null || v === '') return;
  if (!isTime(String(v).trim())) return 'must be a valid time (HH:MM)';
}

function integer(min, max) {
  return (v) => {
    if (v === undefined || v === null || v === '') return;
    if (!isInt(v)) return 'must be a whole number';
    if (min !== undefined && Number(v) < min) return `must be at least ${min}`;
    if (max !== undefined && Number(v) > max) return `must be at most ${max}`;
  };
}

function float(min, max) {
  return (v) => {
    if (v === undefined || v === null || v === '') return;
    if (!isFloat(v)) return 'must be a number';
    if (min !== undefined && Number(v) < min) return `must be at least ${min}`;
    if (max !== undefined && Number(v) > max) return `must be at most ${max}`;
  };
}

function oneOf(values) {
  return (v) => {
    if (v === undefined || v === null || v === '') return;
    if (!values.includes(v)) return `must be one of: ${values.join(', ')}`;
  };
}

function uuid(v) {
  if (v === undefined || v === null || v === '') return;
  if (!isUUID(String(v))) return 'must be a valid UUID';
}

function password(minLen = 8) {
  return (v) => {
    if (!v) return;
    if (v.length < minLen) return `must be at least ${minLen} characters`;
    if (!/[A-Z]/.test(v)) return 'must contain at least one uppercase letter';
    if (!/[a-z]/.test(v)) return 'must contain at least one lowercase letter';
    if (!/\d/.test(v))    return 'must contain at least one digit';
  };
}

// ── Factory: builds an Express middleware from a spec object ────────────────
function makeBodyValidator(spec) {
  return (req, res, next) => {
    const errors = {};
    const body   = req.body || {};

    for (const [field, checkers] of Object.entries(spec)) {
      const raw = body[field];
      const val = typeof raw === 'string' ? sanitize(raw) : raw;

      for (const checker of checkers) {
        const err = checker(val);
        if (err) {
          if (!errors[field]) errors[field] = [];
          errors[field].push(err);
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        error: 'Validation failed',
        fields: errors,
        // Flatten to a single readable string for legacy clients
        message: Object.entries(errors)
          .map(([k, msgs]) => `${k}: ${msgs.join(', ')}`)
          .join('; '),
      });
    }

    next();
  };
}

function makeQueryValidator(spec) {
  return (req, res, next) => {
    const errors = {};
    for (const [field, checkers] of Object.entries(spec)) {
      const val = req.query[field];
      for (const checker of checkers) {
        const err = checker(val);
        if (err) {
          if (!errors[field]) errors[field] = [];
          errors[field].push(err);
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ error: 'Invalid query parameters', fields: errors });
    }
    next();
  };
}

function makeParamValidator(spec) {
  return (req, res, next) => {
    const errors = {};
    for (const [field, checkers] of Object.entries(spec)) {
      const val = req.params[field];
      for (const checker of checkers) {
        const err = checker(val);
        if (err) {
          if (!errors[field]) errors[field] = [];
          errors[field].push(err);
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ error: 'Invalid URL parameter', fields: errors });
    }
    next();
  };
}

// ── Public API ──────────────────────────────────────────────────────────────
module.exports = {
  // Middleware factories
  body:   makeBodyValidator,
  query:  makeQueryValidator,
  params: makeParamValidator,

  // Individual checkers (composable)
  required,
  str,
  email,
  phone,
  date,
  notFutureDate,
  time,
  integer,
  float,
  oneOf,
  uuid,
  password,

  // Raw predicates (for custom logic inside routes)
  isEmail,
  isPhone,
  isDate,
  isUUID,
};
