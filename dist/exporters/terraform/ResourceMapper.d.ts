/**
 * Terraform Resource Mapper
 *
 * Maps intent resources to Terraform resource definitions for multiple
 * cloud providers (AWS, GCP, Azure). Supports compute, network, storage,
 * database, and Kubernetes resources.
 *
 * All mappings are deterministic and produce stable output.
 *
 * @module exporters/terraform/ResourceMapper
 * @version 1.0.0
 */
import type { CloudProvider, IntentResource } from '../../core/types.js';
import type { ComputeSpec, DatabaseSpec, KubernetesSpec, NetworkSpec, StorageSpec, TerraformResource } from './types.js';
/**
 * Sort object keys alphabetically for deterministic output.
 */
declare function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T;
/**
 * Convert a name to Terraform-safe identifier.
 */
declare function toTerraformName(name: string): string;
/**
 * Create tags object with deterministic ordering.
 */
declare function createTags(baseTags: Readonly<Record<string, string>> | undefined, additionalTags?: Readonly<Record<string, string>>): Record<string, string>;
/**
 * Maps intent resources to Terraform resources for a specific provider.
 *
 * All mappings are deterministic and produce stable output with sorted
 * keys and consistent ordering.
 */
export declare class ResourceMapper {
    /**
     * Map compute resources to Terraform resources.
     */
    mapCompute(spec: ComputeSpec, provider: CloudProvider): readonly TerraformResource[];
    /**
     * Map network resources to Terraform resources.
     */
    mapNetwork(spec: NetworkSpec, provider: CloudProvider): readonly TerraformResource[];
    /**
     * Map storage resources to Terraform resources.
     */
    mapStorage(spec: StorageSpec, provider: CloudProvider): readonly TerraformResource[];
    /**
     * Map database resources to Terraform resources.
     */
    mapDatabase(spec: DatabaseSpec, provider: CloudProvider): readonly TerraformResource[];
    /**
     * Map Kubernetes resources to Terraform resources.
     */
    mapKubernetes(spec: KubernetesSpec, provider: CloudProvider): readonly TerraformResource[];
    /**
     * Map a generic intent resource based on its type.
     */
    mapResource(resource: IntentResource, provider: CloudProvider): readonly TerraformResource[];
}
export { toTerraformName, sortObjectKeys, createTags };
//# sourceMappingURL=ResourceMapper.d.ts.map