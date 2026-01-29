/**
 * Simple structured logger for TMDB Discover+
 *
 * Supports log levels: debug, info, warn, error
 * Set LOG_LEVEL env var to control output (default: 'info')
 * Set LOG_FORMAT=json for JSON output (useful for log aggregation)
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;
const useJson = process.env.LOG_FORMAT === 'json';

const SENSITIVE_KEYS = [
  'api_key', 'apikey', 'tmdbapikey', 'password', 'token', 'secret',
  'auth', 'authorization', 'bearer', 'key', 'credential',
  'pass', 'email'
];

function sanitizeValue(value, key = '') {
  if (value === null || value === undefined) return value;
  
  const lowerKey = String(key).toLowerCase();
  if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return value
      .replace(/([?&](?:api_key|apikey|token|key|password|id)=)[^&\s/]+/gi, '$1[REDACTED]')
      .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, '$1[REDACTED]')
      .replace(/(Basic\s+)[a-zA-Z0-9._-]+/gi, '$1[REDACTED]');
  }

  if (value instanceof Error) {
    return {
      message: value.message,
      stack: '[REDACTED]'
    };
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeValue(v, k);
    }
    return out;
  }

  return value;
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {string} Formatted message
 */
function formatMessage(level, context, message, data = null) {
  const timestamp = new Date().toISOString();

  if (useJson) {
    const safeData = data ? sanitizeValue(data) : null;
    return JSON.stringify({
      timestamp,
      level,
      context,
      message,
      ...(safeData && { data: safeData }),
    });
  }

  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  if (data) {
    // In dev mode, format data nicely but avoid logging sensitive info
    const safeData = sanitizeValue(data);
    return `${prefix} ${message} ${JSON.stringify(safeData)}`;
  }
  return `${prefix} ${message}`;
}

/**
 * Remove sensitive fields from log data (Legacy wrapper)
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeLogData(data) {
  return sanitizeValue(data);
}

/**
 * Create a logger instance for a specific context/module
 * @param {string} context - Module or context name
 * @returns {Object} Logger instance
 */
export function createLogger(context) {
  return {
    debug(message, data = null) {
      if (currentLevel <= LOG_LEVELS.debug) {
        console.log(formatMessage('debug', context, message, data));
      }
    },

    info(message, data = null) {
      if (currentLevel <= LOG_LEVELS.info) {
        console.log(formatMessage('info', context, message, data));
      }
    },

    warn(message, data = null) {
      if (currentLevel <= LOG_LEVELS.warn) {
        console.warn(formatMessage('warn', context, message, data));
      }
    },

    error(message, data = null) {
      if (currentLevel <= LOG_LEVELS.error) {
        console.error(formatMessage('error', context, message, data));
      }
    },
  };
}

export const logger = createLogger('app');
