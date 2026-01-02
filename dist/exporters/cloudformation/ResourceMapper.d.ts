/**
 * CloudFormation Resource Mapper
 *
 * Maps intent resources to CloudFormation resource definitions.
 * Supports containers (ECS), databases (RDS), storage (S3), and more.
 *
 * All mappings are deterministic and produce stable output.
 *
 * @module exporters/cloudformation/ResourceMapper
 * @version 1.0.0
 */
import type { IntentResource } from '../../core/types.js';
import type { CFNResource, ContainerSpec, DatabaseSpec, NetworkSpec, StorageSpec } from './types.js';
import { createRef, createGetAtt, createSub, createJoin } from './types.js';
/**
 * Convert a component ID to a valid CloudFormation logical ID.
 * CloudFormation logical IDs must be alphanumeric and unique within the template.
 */
export declare function toCFNLogicalId(name: string): string;
/**
 * Sort object keys alphabetically for deterministic output.
 */
export declare function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T;
/**
 * Maps intent resources to CloudFormation resources.
 *
 * All mappings are deterministic and produce stable output with sorted
 * keys and consistent ordering.
 */
export declare class ResourceMapper {
    /**
     * Map a component type to CloudFormation resource type.
     */
    mapComponentToCFN(componentType: string): string;
    /**
     * Get additional resources for a component type.
     */
    getAdditionalResources(componentType: string): readonly string[];
    /**
     * Map a container resource to CloudFormation resources.
     */
    mapContainer(spec: ContainerSpec): Record<string, CFNResource>;
    /**
     * Map a database resource to CloudFormation resources.
     */
    mapDatabase(spec: DatabaseSpec): Record<string, CFNResource>;
    /**
     * Map a network resource to CloudFormation resources.
     */
    mapNetwork(spec: NetworkSpec): Record<string, CFNResource>;
    /**
     * Map a storage resource to CloudFormation resources.
     */
    mapStorage(spec: StorageSpec): Record<string, CFNResource>;
    /**
     * Map a generic intent resource based on its type.
     */
    mapResource(resource: IntentResource): Record<string, CFNResource>;
    /**
     * Check if a component type is AWS-targetable.
     */
    isAWSTargetable(componentType: string): boolean;
}
export { createRef, createGetAtt, createSub, createJoin };
//# sourceMappingURL=ResourceMapper.d.ts.map