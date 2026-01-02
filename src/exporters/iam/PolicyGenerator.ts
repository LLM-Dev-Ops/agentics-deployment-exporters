/**
 * IAM Policy Generator
 *
 * This module provides pure functions for generating IAM policy documents
 * including trust policies and permission policies.
 *
 * All operations are deterministic and produce identical output for
 * identical input, regardless of execution environment.
 *
 * @module exporters/iam/PolicyGenerator
 * @version 1.0.0
 */

import type { IntentResource } from '../../core/types.js';
import type {
  IAMConfiguration,
  IAMPolicy,
  IAMRole,
  NamedPolicy,
  PermissionPolicy,
  ServiceAccount,
  Statement,
  TrustPolicy,
} from './types.js';
import { AWS_SERVICES } from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const IAM_POLICY_VERSION = '2012-10-17' as const;

// =============================================================================
// STATEMENT ID GENERATION
// =============================================================================

/**
 * Generate a deterministic statement ID from components.
 * Uses a stable algorithm to ensure consistent output.
 *
 * @param service - Service name or identifier
 * @param action - Action type (Allow/Deny)
 * @param index - Statement index for uniqueness
 * @returns Deterministic Sid string
 *
 * @example
 * ```typescript
 * const sid = generateStatementId('S3', 'Allow', 0);
 * // Returns: "S3Allow0"
 * ```
 */
export function generateStatementId(
  service: string,
  action: string,
  index: number
): string {
  // Clean the service name to be a valid Sid component
  const cleanService = service
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[^a-zA-Z]+/, ''); // Must start with letter

  // Ensure valid Sid format: alphanumeric, starts with letter
  const prefix = cleanService.charAt(0).toUpperCase() + cleanService.slice(1);
  const suffix = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();

  return `${prefix}${suffix}${index}`;
}

// =============================================================================
// TRUST POLICY GENERATION
// =============================================================================

/**
 * Generate a trust policy for an IAM role.
 *
 * @param principals - Services or accounts that can assume the role
 * @param conditions - Optional conditions for assuming the role
 * @returns Trust policy document
 *
 * @example
 * ```typescript
 * const trustPolicy = generateTrustPolicy({
 *   services: ['lambda.amazonaws.com', 'ec2.amazonaws.com'],
 * });
 * ```
 */
export function generateTrustPolicy(options: {
  readonly services?: readonly string[];
  readonly awsAccounts?: readonly string[];
  readonly federatedProviders?: readonly string[];
  readonly conditions?: Readonly<Record<string, Readonly<Record<string, string | readonly string[]>>>>;
  readonly allowCrossAccount?: boolean;
}): TrustPolicy {
  const statements: Statement[] = [];

  // Service trust
  if (options.services && options.services.length > 0) {
    const serviceStatement: Statement = {
      Sid: 'AllowServiceAssume',
      Effect: 'Allow',
      Principal: {
        Service: options.services.length === 1
          ? options.services[0]
          : [...options.services].sort((a, b) => a.localeCompare(b, 'en')),
      },
      Action: 'sts:AssumeRole',
    };

    if (options.conditions) {
      statements.push({
        ...serviceStatement,
        Condition: options.conditions,
      });
    } else {
      statements.push(serviceStatement);
    }
  }

  // AWS account trust
  if (options.awsAccounts && options.awsAccounts.length > 0) {
    const sortedAccounts = [...options.awsAccounts].sort((a, b) => a.localeCompare(b, 'en'));
    const principals = sortedAccounts.map(account =>
      account.startsWith('arn:') ? account : `arn:aws:iam::${account}:root`
    );

    statements.push({
      Sid: 'AllowAccountAssume',
      Effect: 'Allow',
      Principal: {
        AWS: principals.length === 1 ? principals[0] : principals,
      },
      Action: 'sts:AssumeRole',
    });
  }

  // Federated trust (SAML, OIDC)
  if (options.federatedProviders && options.federatedProviders.length > 0) {
    const sortedProviders = [...options.federatedProviders].sort((a, b) => a.localeCompare(b, 'en'));

    statements.push({
      Sid: 'AllowFederatedAssume',
      Effect: 'Allow',
      Principal: {
        Federated: sortedProviders.length === 1 ? sortedProviders[0] : sortedProviders,
      },
      Action: 'sts:AssumeRoleWithSAML',
    });
  }

  return Object.freeze({
    Version: IAM_POLICY_VERSION,
    Statement: Object.freeze(statements),
  });
}

/**
 * Generate a trust policy for a specific AWS service.
 *
 * @param service - AWS service identifier (e.g., 'lambda', 'ec2')
 * @returns Trust policy document
 */
export function generateServiceTrustPolicy(
  service: keyof typeof AWS_SERVICES
): TrustPolicy {
  const servicePrincipal = AWS_SERVICES[service];

  return generateTrustPolicy({
    services: [servicePrincipal],
  });
}

// =============================================================================
// PERMISSION POLICY GENERATION
// =============================================================================

/**
 * Group actions by service prefix.
 *
 * @param actions - Array of IAM actions
 * @returns Map of service to actions
 */
export function groupActionsByService(
  actions: readonly string[]
): Map<string, string[]> {
  const serviceActions = new Map<string, string[]>();

  for (const action of actions) {
    const colonIndex = action.indexOf(':');
    if (colonIndex === -1) continue;

    const service = action.substring(0, colonIndex);
    const actionName = action.substring(colonIndex + 1);

    const existing = serviceActions.get(service) ?? [];
    existing.push(actionName);
    serviceActions.set(service, existing);
  }

  // Sort actions within each service for determinism
  for (const [service, serviceActionList] of serviceActions) {
    serviceActions.set(
      service,
      serviceActionList.sort((a, b) => a.localeCompare(b, 'en'))
    );
  }

  return serviceActions;
}

/**
 * Generate permission policy statements from actions and resources.
 *
 * @param actions - IAM actions to allow
 * @param resources - Resources the actions apply to
 * @param options - Additional options
 * @returns Array of policy statements
 */
export function generatePermissionStatements(
  actions: readonly string[],
  resources: readonly string[],
  options?: {
    readonly groupByService?: boolean;
    readonly effect?: 'Allow' | 'Deny';
    readonly conditions?: Readonly<Record<string, Readonly<Record<string, string | readonly string[]>>>>;
  }
): readonly Statement[] {
  const effect = options?.effect ?? 'Allow';
  const groupByService = options?.groupByService ?? true;

  if (!groupByService || actions.length <= 3) {
    // Single statement for all actions
    const statement: Statement = {
      Sid: generateStatementId('Policy', effect, 0),
      Effect: effect,
      Action: actions.length === 1 ? actions[0] : [...actions].sort((a, b) => a.localeCompare(b, 'en')),
      Resource: resources.length === 1 ? resources[0] : [...resources].sort((a, b) => a.localeCompare(b, 'en')),
    };

    if (options?.conditions) {
      return Object.freeze([{ ...statement, Condition: options.conditions }]);
    }

    return Object.freeze([statement]);
  }

  // Group by service
  const serviceActions = groupActionsByService(actions);
  const statements: Statement[] = [];
  let index = 0;

  // Sort services for deterministic output
  const sortedServices = [...serviceActions.keys()].sort((a, b) => a.localeCompare(b, 'en'));

  for (const service of sortedServices) {
    const serviceActionList = serviceActions.get(service)!;
    const fullActions = serviceActionList.map(a => `${service}:${a}`);

    const statement: Statement = {
      Sid: generateStatementId(service, effect, index++),
      Effect: effect,
      Action: fullActions.length === 1 ? fullActions[0] : fullActions,
      Resource: resources.length === 1 ? resources[0] : [...resources].sort((a, b) => a.localeCompare(b, 'en')),
    };

    if (options?.conditions) {
      statements.push({ ...statement, Condition: options.conditions });
    } else {
      statements.push(statement);
    }
  }

  return Object.freeze(statements);
}

/**
 * Generate a complete permission policy.
 *
 * @param statements - Policy statements
 * @param id - Optional policy ID
 * @returns Permission policy document
 */
export function generatePermissionPolicy(
  statements: readonly Statement[],
  id?: string
): PermissionPolicy {
  const policy: PermissionPolicy = {
    Version: IAM_POLICY_VERSION,
    Statement: statements,
  };

  if (id) {
    return Object.freeze({ ...policy, Id: id });
  }

  return Object.freeze(policy);
}

// =============================================================================
// POLICY GENERATION FROM INTENT RESOURCES
// =============================================================================

/**
 * Extract IAM configuration from intent resources.
 *
 * @param resources - Intent resources
 * @returns IAM configuration
 */
export function extractIAMConfiguration(
  resources: readonly IntentResource[]
): IAMConfiguration {
  const roles: IAMRole[] = [];
  const policies: IAMPolicy[] = [];
  const serviceAccounts: ServiceAccount[] = [];

  // Sort resources for deterministic processing
  const sortedResources = [...resources].sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  );

  for (const resource of sortedResources) {
    const resourceType = resource.type.toLowerCase();

    if (resourceType === 'iam-role' || resourceType.includes('role')) {
      const role = extractIAMRole(resource);
      if (role) {
        roles.push(role);
      }
    } else if (resourceType === 'iam-policy' || resourceType.includes('policy')) {
      const policy = extractIAMPolicy(resource);
      if (policy) {
        policies.push(policy);
      }
    } else if (resourceType === 'service-account' || resourceType.includes('service-account')) {
      const account = extractServiceAccount(resource);
      if (account) {
        serviceAccounts.push(account);
      }
    }
  }

  return Object.freeze({
    roles: Object.freeze(roles),
    policies: Object.freeze(policies),
    serviceAccounts: Object.freeze(serviceAccounts),
  });
}

/**
 * Extract IAM role from intent resource.
 */
function extractIAMRole(resource: IntentResource): IAMRole | null {
  const props = resource.properties;

  // Determine trust policy principals
  const services = extractStringArray(props.services);
  const trustPolicy = generateTrustPolicy({
    services: services.length > 0 ? services : ['ec2.amazonaws.com'],
    awsAccounts: extractStringArray(props.trustedAccounts),
    federatedProviders: extractStringArray(props.federatedProviders),
  });

  // Build inline policies from permissions
  const inlinePolicies: NamedPolicy[] = [];
  const permissions = extractPermissions(props);

  if (permissions.length > 0) {
    const statements = generatePermissionStatements(
      permissions,
      extractStringArray(props.resources) || ['*']
    );

    inlinePolicies.push({
      name: `${resource.name}Policy`,
      document: generatePermissionPolicy(statements),
    });
  }

  return Object.freeze({
    name: resource.name,
    description: typeof props.description === 'string' ? props.description : undefined,
    path: typeof props.path === 'string' ? props.path : '/',
    trustPolicy,
    inlinePolicies: inlinePolicies.length > 0 ? Object.freeze(inlinePolicies) : undefined,
    managedPolicyArns: extractStringArray(props.managedPolicies),
    maxSessionDuration: typeof props.maxSessionDuration === 'number' ? props.maxSessionDuration : undefined,
    tags: extractTags(props.tags),
    permissionsBoundary: typeof props.permissionsBoundary === 'string' ? props.permissionsBoundary : undefined,
  });
}

/**
 * Extract standalone IAM policy from intent resource.
 */
function extractIAMPolicy(resource: IntentResource): IAMPolicy | null {
  const props = resource.properties;
  const permissions = extractPermissions(props);

  if (permissions.length === 0) {
    return null;
  }

  const statements = generatePermissionStatements(
    permissions,
    extractStringArray(props.resources) || ['*']
  );

  return Object.freeze({
    name: resource.name,
    description: typeof props.description === 'string' ? props.description : undefined,
    path: typeof props.path === 'string' ? props.path : '/',
    document: generatePermissionPolicy(statements, resource.name),
    tags: extractTags(props.tags),
  });
}

/**
 * Extract service account from intent resource.
 */
function extractServiceAccount(resource: IntentResource): ServiceAccount | null {
  const props = resource.properties;
  const permissions = extractPermissions(props);
  const inlinePolicies: NamedPolicy[] = [];

  if (permissions.length > 0) {
    const statements = generatePermissionStatements(
      permissions,
      extractStringArray(props.resources) || ['*']
    );

    inlinePolicies.push({
      name: `${resource.name}Policy`,
      document: generatePermissionPolicy(statements),
    });
  }

  return Object.freeze({
    name: resource.name,
    description: typeof props.description === 'string' ? props.description : undefined,
    path: typeof props.path === 'string' ? props.path : '/',
    inlinePolicies: inlinePolicies.length > 0 ? Object.freeze(inlinePolicies) : undefined,
    managedPolicyArns: extractStringArray(props.managedPolicies),
    tags: extractTags(props.tags),
    permissionsBoundary: typeof props.permissionsBoundary === 'string' ? props.permissionsBoundary : undefined,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract string array from property value.
 */
function extractStringArray(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

/**
 * Extract permissions (actions) from properties.
 */
function extractPermissions(props: Readonly<Record<string, unknown>>): readonly string[] {
  const permissions: string[] = [];

  // Check various possible property names
  const actionSources = ['actions', 'permissions', 'allowedActions'];

  for (const source of actionSources) {
    const value = props[source];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          permissions.push(item);
        }
      }
    } else if (typeof value === 'string') {
      permissions.push(value);
    }
  }

  // Sort for determinism and remove duplicates
  return [...new Set(permissions)].sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Extract tags from property value.
 */
function extractTags(value: unknown): Readonly<Record<string, string>> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const tags: Record<string, string> = {};

    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string') {
        tags[key] = val;
      }
    }

    if (Object.keys(tags).length > 0) {
      return Object.freeze(tags);
    }
  }

  return undefined;
}

// =============================================================================
// COMMON POLICY TEMPLATES
// =============================================================================

/**
 * Generate a read-only policy for specified services.
 *
 * @param services - AWS services (e.g., 's3', 'ec2')
 * @returns Permission policy
 */
export function generateReadOnlyPolicy(services: readonly string[]): PermissionPolicy {
  const actions = services.flatMap(service => [
    `${service}:Get*`,
    `${service}:List*`,
    `${service}:Describe*`,
  ]);

  const statements = generatePermissionStatements(actions, ['*'], { groupByService: true });
  return generatePermissionPolicy(statements, 'ReadOnlyPolicy');
}

/**
 * Generate a full access policy for specified services.
 *
 * @param services - AWS services
 * @returns Permission policy
 */
export function generateFullAccessPolicy(services: readonly string[]): PermissionPolicy {
  const actions = services.map(service => `${service}:*`);
  const statements = generatePermissionStatements(actions, ['*']);
  return generatePermissionPolicy(statements, 'FullAccessPolicy');
}

/**
 * Generate an S3 bucket access policy.
 *
 * @param bucketArn - S3 bucket ARN
 * @param permissions - Permissions level
 * @returns Permission policy
 */
export function generateS3BucketPolicy(
  bucketArn: string,
  permissions: 'read' | 'write' | 'full'
): PermissionPolicy {
  let actions: readonly string[];

  switch (permissions) {
    case 'read':
      actions = ['s3:GetObject', 's3:GetObjectVersion', 's3:ListBucket'];
      break;
    case 'write':
      actions = ['s3:PutObject', 's3:DeleteObject', 's3:ListBucket'];
      break;
    case 'full':
      actions = ['s3:*'];
      break;
  }

  const resources = [bucketArn, `${bucketArn}/*`];
  const statements = generatePermissionStatements(actions, resources);
  return generatePermissionPolicy(statements, 'S3BucketPolicy');
}
