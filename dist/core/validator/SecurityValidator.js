/**
 * Security Validator
 *
 * Validates against injection attacks and security vulnerabilities.
 * Prevents SQL, shell, template, and path traversal injections.
 */
import { ValidationErrorCodes } from './types.js';
// -----------------------------------------------------------------------------
// Injection Patterns
// -----------------------------------------------------------------------------
/**
 * SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
    {
        id: 'SQL_UNION',
        type: 'sql',
        pattern: /\b(UNION\s+(ALL\s+)?SELECT)\b/i,
        description: 'SQL UNION injection attempt',
        severity: 'error',
    },
    {
        id: 'SQL_COMMENT',
        type: 'sql',
        pattern: /(--|#|\/\*)/,
        description: 'SQL comment injection',
        severity: 'error',
    },
    {
        id: 'SQL_OR_1',
        type: 'sql',
        pattern: /'\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
        description: 'SQL boolean injection (OR 1=1)',
        severity: 'error',
    },
    {
        id: 'SQL_DROP',
        type: 'sql',
        pattern: /\b(DROP|DELETE|TRUNCATE|ALTER)\s+(TABLE|DATABASE|INDEX)\b/i,
        description: 'SQL destructive statement',
        severity: 'error',
    },
    {
        id: 'SQL_EXEC',
        type: 'sql',
        pattern: /\b(EXEC|EXECUTE|CALL)\s*\(/i,
        description: 'SQL procedure execution',
        severity: 'error',
    },
];
/**
 * Shell injection patterns
 */
const SHELL_INJECTION_PATTERNS = [
    {
        id: 'SHELL_COMMAND_SUB',
        type: 'shell',
        pattern: /\$\(.*\)/,
        description: 'Shell command substitution',
        severity: 'error',
    },
    {
        id: 'SHELL_BACKTICK',
        type: 'shell',
        pattern: /`[^`]+`/,
        description: 'Shell backtick command substitution',
        severity: 'error',
    },
    {
        id: 'SHELL_PIPE',
        type: 'shell',
        pattern: /\|\s*(bash|sh|zsh|ksh|cmd|powershell)/i,
        description: 'Shell pipe to interpreter',
        severity: 'error',
    },
    {
        id: 'SHELL_REDIRECT',
        type: 'shell',
        pattern: /[;&|]\s*(rm|chmod|chown|dd|mkfs)\s/i,
        description: 'Shell command chaining with dangerous commands',
        severity: 'error',
    },
    {
        id: 'SHELL_ENV_EXPANSION',
        type: 'shell',
        pattern: /\$\{[^}]+\}/,
        description: 'Shell environment variable expansion with braces',
        severity: 'warning',
    },
];
/**
 * Template injection patterns
 */
const TEMPLATE_INJECTION_PATTERNS = [
    {
        id: 'TEMPLATE_JINJA',
        type: 'template',
        pattern: /\{\{.*\}\}/,
        description: 'Jinja/Mustache template expression',
        severity: 'warning',
    },
    {
        id: 'TEMPLATE_ERB',
        type: 'template',
        pattern: /<%.*%>/,
        description: 'ERB template expression',
        severity: 'error',
    },
    {
        id: 'TEMPLATE_FREEMARKER',
        type: 'template',
        pattern: /\$\{.*\}/,
        description: 'FreeMarker/ES6 template expression',
        severity: 'warning',
    },
    {
        id: 'TEMPLATE_VELOCITY',
        type: 'template',
        pattern: /#(if|foreach|set|include|parse)\s*\(/,
        description: 'Velocity template directive',
        severity: 'error',
    },
];
/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
    {
        id: 'PATH_DOTDOT',
        type: 'path',
        pattern: /\.\.[\/\\]/,
        description: 'Directory traversal with ..',
        severity: 'error',
    },
    {
        id: 'PATH_ABSOLUTE_UNIX',
        type: 'path',
        pattern: /^\/(?:etc|var|usr|bin|sbin|root|home|tmp)\//,
        description: 'Absolute Unix path to sensitive directory',
        severity: 'error',
    },
    {
        id: 'PATH_ABSOLUTE_WIN',
        type: 'path',
        pattern: /^[a-zA-Z]:[\\\/](?:Windows|System32|Program Files)/i,
        description: 'Absolute Windows path to sensitive directory',
        severity: 'error',
    },
    {
        id: 'PATH_NULL_BYTE',
        type: 'path',
        pattern: /%00|\x00/,
        description: 'Null byte injection',
        severity: 'error',
    },
];
/**
 * All injection patterns combined
 */
const ALL_INJECTION_PATTERNS = [
    ...SQL_INJECTION_PATTERNS,
    ...SHELL_INJECTION_PATTERNS,
    ...TEMPLATE_INJECTION_PATTERNS,
    ...PATH_TRAVERSAL_PATTERNS,
];
// -----------------------------------------------------------------------------
// Security Validator Class
// -----------------------------------------------------------------------------
/**
 * Validates intent values against security vulnerabilities.
 * Scans for injection attacks and dangerous patterns.
 */
export class SecurityValidator {
    patterns;
    scannedPatterns;
    constructor() {
        this.patterns = ALL_INJECTION_PATTERNS;
        this.scannedPatterns = this.patterns.map(p => p.id);
    }
    /**
     * Scan the intent for security issues.
     *
     * @param intent - The parsed intent to scan
     * @returns Security scan result with all issues found
     */
    scan(intent) {
        const issues = [];
        const data = intent.data;
        // Recursively scan all string values in the intent
        this.scanObject(data, '$', issues);
        return {
            safe: issues.length === 0,
            issues,
            scannedPatterns: this.scannedPatterns,
        };
    }
    /**
     * Validate a single string value for security issues.
     *
     * @param value - The string value to validate
     * @param path - The JSONPath to this value
     * @returns Array of validation issues found
     */
    validateString(value, path) {
        const issues = [];
        for (const pattern of this.patterns) {
            if (pattern.pattern.test(value)) {
                issues.push(this.createSecurityIssue(pattern, value, path));
            }
        }
        return issues;
    }
    /**
     * Get all registered injection patterns.
     */
    getPatterns() {
        return this.patterns;
    }
    /**
     * Add a custom injection pattern.
     */
    addPattern(pattern) {
        this.patterns.push(pattern);
        this.scannedPatterns.push(pattern.id);
    }
    // ---------------------------------------------------------------------------
    // Private Methods
    // ---------------------------------------------------------------------------
    /**
     * Recursively scan an object for security issues.
     */
    scanObject(obj, basePath, issues) {
        if (obj === null || obj === undefined) {
            return;
        }
        if (typeof obj === 'string') {
            issues.push(...this.validateString(obj, basePath));
            return;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                this.scanObject(obj[i], `${basePath}[${i}]`, issues);
            }
            return;
        }
        if (typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                this.scanObject(value, `${basePath}.${key}`, issues);
            }
        }
    }
    /**
     * Create a security issue from a pattern match.
     */
    createSecurityIssue(pattern, value, path) {
        const errorCode = this.getErrorCode(pattern.type);
        return {
            code: errorCode,
            category: 'SECURITY_ERROR',
            severity: pattern.severity,
            message: `${pattern.description} detected`,
            path,
            expected: 'Safe value without injection patterns',
            actual: this.truncateValue(value),
            remediation: this.getRemediation(pattern.type),
            documentationUrl: this.getDocumentationUrl(pattern.type),
        };
    }
    /**
     * Get the appropriate error code for an injection type.
     */
    getErrorCode(type) {
        switch (type) {
            case 'sql':
                return ValidationErrorCodes.SECURITY_SQL_INJECTION;
            case 'shell':
                return ValidationErrorCodes.SECURITY_SHELL_INJECTION;
            case 'template':
                return ValidationErrorCodes.SECURITY_TEMPLATE_INJECTION;
            case 'path':
                return ValidationErrorCodes.SECURITY_PATH_TRAVERSAL;
            default:
                return ValidationErrorCodes.SECURITY_FORBIDDEN_PATTERN;
        }
    }
    /**
     * Get remediation guidance for an injection type.
     */
    getRemediation(type) {
        switch (type) {
            case 'sql':
                return 'Use parameterized queries or prepared statements. Avoid dynamic SQL construction with user input.';
            case 'shell':
                return 'Avoid shell command execution with user input. Use safe APIs and escape all inputs.';
            case 'template':
                return 'Use safe template rendering with proper escaping. Avoid raw/unescaped output.';
            case 'path':
                return 'Use relative paths only. Validate and sanitize all path inputs. Reject paths with traversal sequences.';
            default:
                return 'Review and sanitize the input value to remove potentially dangerous patterns.';
        }
    }
    /**
     * Get documentation URL for an injection type.
     */
    getDocumentationUrl(type) {
        const baseUrl = 'https://docs.agentics.io/security';
        switch (type) {
            case 'sql':
                return `${baseUrl}/sql-injection`;
            case 'shell':
                return `${baseUrl}/shell-injection`;
            case 'template':
                return `${baseUrl}/template-injection`;
            case 'path':
                return `${baseUrl}/path-traversal`;
            default:
                return `${baseUrl}/overview`;
        }
    }
    /**
     * Truncate a value for display in error messages.
     */
    truncateValue(value, maxLength = 100) {
        if (value.length <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + '...';
    }
}
//# sourceMappingURL=SecurityValidator.js.map