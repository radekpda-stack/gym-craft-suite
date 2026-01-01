/**
 * Data Sanitization Utilities
 * 
 * Ensures no PII, secrets, or tokens are logged or exported.
 * Used across analytics, error tracking, and data export.
 */

// Keys that should be completely redacted (sensitive data)
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'api-key',
  'authorization',
  'auth',
  'credential',
  'private_key',
  'privatekey',
  'access_token',
  'refresh_token',
  'session_id',
  'sessionid',
  'cookie',
  'jwt',
  'bearer',
];

// Keys that contain PII - should be masked or anonymized
const PII_KEYS = [
  'email',
  'phone',
  'mobile',
  'address',
  'street',
  'city',
  'zip',
  'postal',
  'birth_date',
  'birthdate',
  'date_of_birth',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'iban',
  'bank_account',
  'health_restrictions',
  'health_notes',
  'medical',
  'diagnosis',
];

// Keys that should show partial data (first/last chars)
const PARTIAL_MASK_KEYS = [
  'name',
  'first_name',
  'last_name',
  'full_name',
  'client_name',
  'user_name',
  'username',
];

/**
 * Check if a key matches any pattern in the list
 */
function matchesPattern(key: string, patterns: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return patterns.some(pattern => lowerKey.includes(pattern));
}

/**
 * Mask a string value (show first and last 2 chars)
 */
function maskPartial(value: string): string {
  if (typeof value !== 'string' || value.length <= 4) {
    return '[MASKED]';
  }
  return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
}

/**
 * Anonymize an email address
 */
function anonymizeEmail(email: string): string {
  if (typeof email !== 'string' || !email.includes('@')) {
    return '[EMAIL]';
  }
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';
  return `${maskedLocal}@[DOMAIN]`;
}

/**
 * Sanitize a single value based on its key
 */
function sanitizeValue(key: string, value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle nested objects
  if (typeof value === 'object' && !Array.isArray(value)) {
    return sanitizePayload(value);
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item, index) => 
      typeof item === 'object' 
        ? sanitizePayload(item) 
        : sanitizeValue(key, item)
    );
  }
  
  // Check sensitive keys - complete redaction
  if (matchesPattern(key, SENSITIVE_KEYS)) {
    return '[REDACTED]';
  }
  
  // Check PII keys - anonymize
  if (matchesPattern(key, PII_KEYS)) {
    if (key.toLowerCase().includes('email')) {
      return anonymizeEmail(String(value));
    }
    return '[PII]';
  }
  
  // Check partial mask keys
  if (matchesPattern(key, PARTIAL_MASK_KEYS)) {
    return maskPartial(String(value));
  }
  
  return value;
}

/**
 * Sanitize an entire payload object
 * Removes or masks all sensitive data
 */
export function sanitizePayload(payload: Record<string, any>): Record<string, any> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = sanitizeValue(key, value);
  }
  
  return sanitized;
}

/**
 * Sanitize error message to remove any embedded PII
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return message;
  
  // Remove email patterns
  let sanitized = message.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]'
  );
  
  // Remove phone patterns
  sanitized = sanitized.replace(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/g,
    '[PHONE]'
  );
  
  // Remove UUID patterns (might contain user IDs)
  sanitized = sanitized.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[UUID]'
  );
  
  // Remove JWT patterns
  sanitized = sanitized.replace(
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    '[JWT]'
  );
  
  return sanitized;
}

/**
 * Sanitize a stack trace to remove file paths and line numbers
 * that might reveal internal structure
 */
export function sanitizeStackTrace(stack: string): string {
  if (!stack) return stack;
  
  // Remove full file paths, keep only filename
  let sanitized = stack.replace(
    /at\s+.*?\((.*?\/)?([^\/]+):(\d+):(\d+)\)/g,
    'at [FILE]:$3:$4'
  );
  
  // Remove webpack internal paths
  sanitized = sanitized.replace(
    /webpack-internal:\/\/\/[^\s]+/g,
    '[WEBPACK]'
  );
  
  // Remove node_modules paths
  sanitized = sanitized.replace(
    /node_modules\/[^\s]+/g,
    '[MODULE]'
  );
  
  return sanitized;
}

/**
 * Create a sanitized copy of an error object
 */
export function sanitizeError(error: Error): Record<string, any> {
  return {
    name: error.name,
    message: sanitizeErrorMessage(error.message),
    stack: sanitizeStackTrace(error.stack || ''),
  };
}

/**
 * Sanitize analytics event metadata
 */
export function sanitizeAnalyticsMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = sanitizePayload(metadata);
  
  // Additionally remove any route params that might contain IDs
  if (sanitized.route && typeof sanitized.route === 'string') {
    sanitized.route = sanitized.route.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/[ID]'
    );
  }
  
  return sanitized;
}

/**
 * Check if a value appears to contain sensitive data
 */
export function containsSensitiveData(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /api.?key/i,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(value));
}
