import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createLogger } from './logger.js';
import { getUserConfig, getApiKeyFromConfig } from '../services/configService.js';

const log = createLogger('auth');

const JWT_EXPIRY_PERSISTENT = '7d';
const JWT_EXPIRY_SESSION = '24h';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Computes a deterministic, non-reversible identifier for an API key.
 * Uses HMAC-SHA256 keyed with JWT_SECRET.
 */
export function computeApiKeyId(apiKey) {
  return crypto.createHmac('sha256', getJwtSecret()).update(apiKey).digest('hex');
}

/**
 * Generates a JWT containing the apiKeyId.
 * @param {string} apiKey - The TMDB API key
 * @param {boolean} rememberMe - If true, token expires in 7 days; otherwise 24 hours
 */
export function generateToken(apiKey, rememberMe = true) {
  const apiKeyId = computeApiKeyId(apiKey);
  const expiresIn = rememberMe ? JWT_EXPIRY_PERSISTENT : JWT_EXPIRY_SESSION;
  const token = jwt.sign({ apiKeyId }, getJwtSecret(), { expiresIn });
  return { token, expiresIn };
}

/**
 * Verifies a JWT and returns the decoded payload.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      log.debug('Token expired');
    } else {
      log.debug('Token verification failed', { error: error.message });
    }
    return null;
  }
}

/**
 * Middleware: Requires a valid JWT.
 * Sets `req.apiKeyId` from the token.
 * Does NOT set `req.apiKey` - use `requireConfigOwnership` for config-specific routes.
 */
export async function requireAuth(req, res, next) {
  const bearerToken = req.headers.authorization?.replace('Bearer ', '');

  if (!bearerToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(bearerToken);
  if (!decoded || !decoded.apiKeyId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.apiKeyId = decoded.apiKeyId;
  next();
}

/**
 * Middleware: Verifies that the authenticated user owns the config specified in `req.params.userId`.
 * Must be used AFTER `requireAuth`.
 * Sets `req.config` and `req.apiKey` on success.
 */
export async function requireConfigOwnership(req, res, next) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required in path' });
  }

  try {
    const config = await getUserConfig(userId);
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const configApiKey = getApiKeyFromConfig(config);
    if (!configApiKey) {
      log.error('Config has no API key', { userId });
      return res.status(500).json({ error: 'Configuration error' });
    }

    const expectedApiKeyId = computeApiKeyId(configApiKey);

    if (req.apiKeyId !== expectedApiKeyId) {
      log.warn('Ownership check failed', { userId, tokenApiKeyId: req.apiKeyId?.slice(0, 8) });
      return res.status(403).json({ error: 'Access denied' });
    }

    req.config = config;
    req.apiKey = configApiKey;
    next();
  } catch (error) {
    log.error('Ownership check error', { userId, error: error.message });
    return res.status(500).json({ error: 'Authorization failed' });
  }
}

/**
 * Optional auth middleware - sets apiKeyId if token present, continues if not.
 * Used for endpoints that can work with or without authentication.
 */
export async function optionalAuth(req, res, next) {
  const bearerToken = req.headers.authorization?.replace('Bearer ', '');

  if (bearerToken) {
    const decoded = verifyToken(bearerToken);
    if (decoded?.apiKeyId) {
      req.apiKeyId = decoded.apiKeyId;
    }
  }

  next();
}
