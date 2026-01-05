/**
 * Financial Artifact Types
 *
 * Type definitions for recognizing and processing financial artifacts
 * produced by enterprise-roi-engine. These types enable the exporter
 * to identify ROI calculations and transform them into enterprise reports.
 *
 * The exporter remains a passive translator - it does NOT modify financial
 * calculations or generate new ROI projections. It only recognizes and
 * exports existing financial artifacts.
 *
 * @module core/financial/types
 * @version 1.0.0
 */
import { z } from 'zod';
/**
 * Types of financial sources that can be detected.
 */
export declare const FinancialSourceValues: readonly ["enterprise-roi-engine", "cost-calculator", "tco-analyzer", "budget-planner", "financial-modeler", "custom", "unknown"];
export type FinancialSource = (typeof FinancialSourceValues)[number];
export declare const FinancialSourceSchema: z.ZodEnum<["enterprise-roi-engine", "cost-calculator", "tco-analyzer", "budget-planner", "financial-modeler", "custom", "unknown"]>;
/**
 * Types of financial artifacts that can be recognized.
 */
export declare const FinancialArtifactTypeValues: readonly ["roi-calculation", "tco-analysis", "cost-breakdown", "budget-projection", "savings-analysis", "payback-period", "npv-analysis", "irr-calculation", "cost-comparison", "resource-costing", "license-cost", "operational-cost", "capital-cost", "migration-cost", "risk-adjusted-return"];
export type FinancialArtifactType = (typeof FinancialArtifactTypeValues)[number];
export declare const FinancialArtifactTypeSchema: z.ZodEnum<["roi-calculation", "tco-analysis", "cost-breakdown", "budget-projection", "savings-analysis", "payback-period", "npv-analysis", "irr-calculation", "cost-comparison", "resource-costing", "license-cost", "operational-cost", "capital-cost", "migration-cost", "risk-adjusted-return"]>;
/**
 * Supported currencies.
 */
export declare const CurrencyValues: readonly ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"];
export type Currency = (typeof CurrencyValues)[number];
export declare const CurrencySchema: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
/**
 * Time period units for financial projections.
 */
export declare const TimePeriodUnitValues: readonly ["monthly", "quarterly", "annual", "multi-year"];
export type TimePeriodUnit = (typeof TimePeriodUnitValues)[number];
export declare const TimePeriodUnitSchema: z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>;
/**
 * Represents a detected financial artifact reference within a deployment intent.
 */
export interface FinancialArtifactReference {
    /**
     * Unique identifier for this reference within the intent.
     */
    readonly referenceId: string;
    /**
     * Source system that produced this financial artifact.
     */
    readonly source: FinancialSource;
    /**
     * Type of financial artifact.
     */
    readonly artifactType: FinancialArtifactType;
    /**
     * Resource type string that triggered detection.
     */
    readonly sourceType: string;
    /**
     * JSONPath to the resource within the intent.
     */
    readonly sourcePath: string;
    /**
     * Name of the resource containing this reference.
     */
    readonly resourceName: string;
    /**
     * Original properties associated with this financial artifact.
     */
    readonly originalProperties: Readonly<Record<string, unknown>>;
    /**
     * Primary currency for financial values.
     */
    readonly currency: Currency;
    /**
     * Time period for projections.
     */
    readonly timePeriod?: TimePeriodUnit;
    /**
     * Projection duration (number of periods).
     */
    readonly projectionHorizon?: number;
    /**
     * Calculation timestamp (if available).
     */
    readonly calculatedAt?: string;
    /**
     * Confidence score for this detection (0.0 - 1.0).
     */
    readonly confidence: number;
}
export declare const FinancialArtifactReferenceSchema: z.ZodObject<{
    referenceId: z.ZodString;
    source: z.ZodEnum<["enterprise-roi-engine", "cost-calculator", "tco-analyzer", "budget-planner", "financial-modeler", "custom", "unknown"]>;
    artifactType: z.ZodEnum<["roi-calculation", "tco-analysis", "cost-breakdown", "budget-projection", "savings-analysis", "payback-period", "npv-analysis", "irr-calculation", "cost-comparison", "resource-costing", "license-cost", "operational-cost", "capital-cost", "migration-cost", "risk-adjusted-return"]>;
    sourceType: z.ZodString;
    sourcePath: z.ZodString;
    resourceName: z.ZodString;
    originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
    timePeriod: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
    projectionHorizon: z.ZodOptional<z.ZodNumber>;
    calculatedAt: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    source: "unknown" | "custom" | "enterprise-roi-engine" | "cost-calculator" | "tco-analyzer" | "budget-planner" | "financial-modeler";
    referenceId: string;
    sourceType: string;
    sourcePath: string;
    resourceName: string;
    originalProperties: Record<string, unknown>;
    confidence: number;
    artifactType: "roi-calculation" | "tco-analysis" | "cost-breakdown" | "budget-projection" | "savings-analysis" | "payback-period" | "npv-analysis" | "irr-calculation" | "cost-comparison" | "resource-costing" | "license-cost" | "operational-cost" | "capital-cost" | "migration-cost" | "risk-adjusted-return";
    currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
    timePeriod?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
    projectionHorizon?: number | undefined;
    calculatedAt?: string | undefined;
}, {
    source: "unknown" | "custom" | "enterprise-roi-engine" | "cost-calculator" | "tco-analyzer" | "budget-planner" | "financial-modeler";
    referenceId: string;
    sourceType: string;
    sourcePath: string;
    resourceName: string;
    originalProperties: Record<string, unknown>;
    confidence: number;
    artifactType: "roi-calculation" | "tco-analysis" | "cost-breakdown" | "budget-projection" | "savings-analysis" | "payback-period" | "npv-analysis" | "irr-calculation" | "cost-comparison" | "resource-costing" | "license-cost" | "operational-cost" | "capital-cost" | "migration-cost" | "risk-adjusted-return";
    currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
    timePeriod?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
    projectionHorizon?: number | undefined;
    calculatedAt?: string | undefined;
}>;
/**
 * A monetary value with currency and period context.
 */
export interface MonetaryValue {
    /**
     * The numeric amount.
     */
    readonly amount: number;
    /**
     * Currency code.
     */
    readonly currency: Currency;
    /**
     * Time period this value applies to.
     */
    readonly period?: TimePeriodUnit;
    /**
     * Whether this is an estimated/projected value.
     */
    readonly isEstimate: boolean;
    /**
     * Confidence range (low, high) if estimated.
     */
    readonly confidenceRange?: readonly [number, number];
}
export declare const MonetaryValueSchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
    period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
    isEstimate: z.ZodBoolean;
    confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
    amount: number;
    isEstimate: boolean;
    period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
    confidenceRange?: [number, number] | undefined;
}, {
    currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
    amount: number;
    isEstimate: boolean;
    period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
    confidenceRange?: [number, number] | undefined;
}>;
/**
 * ROI calculation results extracted from financial artifacts.
 */
export interface ROIMetrics {
    /**
     * Return on Investment percentage.
     */
    readonly roiPercentage?: number;
    /**
     * Net Present Value.
     */
    readonly npv?: MonetaryValue;
    /**
     * Internal Rate of Return percentage.
     */
    readonly irr?: number;
    /**
     * Payback period in months.
     */
    readonly paybackPeriodMonths?: number;
    /**
     * Total investment required.
     */
    readonly totalInvestment?: MonetaryValue;
    /**
     * Total expected returns.
     */
    readonly totalReturns?: MonetaryValue;
    /**
     * Net benefit (returns - investment).
     */
    readonly netBenefit?: MonetaryValue;
    /**
     * Break-even point timestamp.
     */
    readonly breakEvenDate?: string;
}
export declare const ROIMetricsSchema: z.ZodObject<{
    roiPercentage: z.ZodOptional<z.ZodNumber>;
    npv: z.ZodOptional<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>>;
    irr: z.ZodOptional<z.ZodNumber>;
    paybackPeriodMonths: z.ZodOptional<z.ZodNumber>;
    totalInvestment: z.ZodOptional<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>>;
    totalReturns: z.ZodOptional<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>>;
    netBenefit: z.ZodOptional<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>>;
    breakEvenDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    roiPercentage?: number | undefined;
    npv?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    irr?: number | undefined;
    paybackPeriodMonths?: number | undefined;
    totalInvestment?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    totalReturns?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    netBenefit?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    breakEvenDate?: string | undefined;
}, {
    roiPercentage?: number | undefined;
    npv?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    irr?: number | undefined;
    paybackPeriodMonths?: number | undefined;
    totalInvestment?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    totalReturns?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    netBenefit?: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    } | undefined;
    breakEvenDate?: string | undefined;
}>;
/**
 * Cost categories for breakdown analysis.
 */
export declare const CostCategoryValues: readonly ["infrastructure", "compute", "storage", "network", "database", "licensing", "personnel", "training", "migration", "integration", "maintenance", "support", "security", "compliance", "other"];
export type CostCategory = (typeof CostCategoryValues)[number];
export declare const CostCategorySchema: z.ZodEnum<["infrastructure", "compute", "storage", "network", "database", "licensing", "personnel", "training", "migration", "integration", "maintenance", "support", "security", "compliance", "other"]>;
/**
 * A single cost line item.
 */
export interface CostLineItem {
    /**
     * Item identifier.
     */
    readonly itemId: string;
    /**
     * Category of cost.
     */
    readonly category: CostCategory;
    /**
     * Human-readable description.
     */
    readonly description: string;
    /**
     * The cost amount.
     */
    readonly amount: MonetaryValue;
    /**
     * Whether this is a one-time or recurring cost.
     */
    readonly isRecurring: boolean;
    /**
     * Associated resource (if applicable).
     */
    readonly resourceName?: string;
    /**
     * Notes or justification.
     */
    readonly notes?: string;
}
export declare const CostLineItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    category: z.ZodEnum<["infrastructure", "compute", "storage", "network", "database", "licensing", "personnel", "training", "migration", "integration", "maintenance", "support", "security", "compliance", "other"]>;
    description: z.ZodString;
    amount: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    isRecurring: z.ZodBoolean;
    resourceName: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    amount: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    itemId: string;
    category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
    isRecurring: boolean;
    resourceName?: string | undefined;
    notes?: string | undefined;
}, {
    description: string;
    amount: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    itemId: string;
    category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
    isRecurring: boolean;
    resourceName?: string | undefined;
    notes?: string | undefined;
}>;
/**
 * Complete cost breakdown analysis.
 */
export interface CostBreakdown {
    /**
     * Total capital expenditure (one-time costs).
     */
    readonly capex: MonetaryValue;
    /**
     * Total operational expenditure (recurring costs).
     */
    readonly opex: MonetaryValue;
    /**
     * Total cost of ownership.
     */
    readonly tco: MonetaryValue;
    /**
     * Individual line items.
     */
    readonly lineItems: readonly CostLineItem[];
    /**
     * Costs grouped by category.
     */
    readonly byCategory: Readonly<Record<CostCategory, MonetaryValue>>;
    /**
     * Projection period in months.
     */
    readonly projectionMonths: number;
}
export declare const CostBreakdownSchema: z.ZodObject<{
    capex: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    opex: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    tco: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    lineItems: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        category: z.ZodEnum<["infrastructure", "compute", "storage", "network", "database", "licensing", "personnel", "training", "migration", "integration", "maintenance", "support", "security", "compliance", "other"]>;
        description: z.ZodString;
        amount: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
            period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
            isEstimate: z.ZodBoolean;
            confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        }, "strip", z.ZodTypeAny, {
            currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
            amount: number;
            isEstimate: boolean;
            period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
            confidenceRange?: [number, number] | undefined;
        }, {
            currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
            amount: number;
            isEstimate: boolean;
            period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
            confidenceRange?: [number, number] | undefined;
        }>;
        isRecurring: z.ZodBoolean;
        resourceName: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        amount: {
            currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
            amount: number;
            isEstimate: boolean;
            period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
            confidenceRange?: [number, number] | undefined;
        };
        itemId: string;
        category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
        isRecurring: boolean;
        resourceName?: string | undefined;
        notes?: string | undefined;
    }, {
        description: string;
        amount: {
            currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
            amount: number;
            isEstimate: boolean;
            period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
            confidenceRange?: [number, number] | undefined;
        };
        itemId: string;
        category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
        isRecurring: boolean;
        resourceName?: string | undefined;
        notes?: string | undefined;
    }>, "many">;
    byCategory: z.ZodRecord<z.ZodString, z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>>;
    projectionMonths: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    capex: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    opex: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    tco: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    lineItems: {
        description: string;
        amount: {
            currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
            amount: number;
            isEstimate: boolean;
            period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
            confidenceRange?: [number, number] | undefined;
        };
        itemId: string;
        category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
        isRecurring: boolean;
        resourceName?: string | undefined;
        notes?: string | undefined;
    }[];
    byCategory: Record<string, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    projectionMonths: number;
}, {
    capex: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    opex: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    tco: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    lineItems: {
        description: string;
        amount: {
            currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
            amount: number;
            isEstimate: boolean;
            period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
            confidenceRange?: [number, number] | undefined;
        };
        itemId: string;
        category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
        isRecurring: boolean;
        resourceName?: string | undefined;
        notes?: string | undefined;
    }[];
    byCategory: Record<string, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    projectionMonths: number;
}>;
/**
 * A savings or cost avoidance item.
 */
export interface SavingsItem {
    /**
     * Item identifier.
     */
    readonly itemId: string;
    /**
     * Type of savings.
     */
    readonly type: 'direct-savings' | 'cost-avoidance' | 'efficiency-gain' | 'risk-reduction';
    /**
     * Human-readable description.
     */
    readonly description: string;
    /**
     * The savings amount.
     */
    readonly amount: MonetaryValue;
    /**
     * Category this saving applies to.
     */
    readonly category: CostCategory;
    /**
     * Calculation methodology.
     */
    readonly methodology?: string;
    /**
     * Confidence level (0.0 - 1.0).
     */
    readonly confidence: number;
}
export declare const SavingsItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    type: z.ZodEnum<["direct-savings", "cost-avoidance", "efficiency-gain", "risk-reduction"]>;
    description: z.ZodString;
    amount: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        period: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        isEstimate: z.ZodBoolean;
        confidenceRange: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }, {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    }>;
    category: z.ZodEnum<["infrastructure", "compute", "storage", "network", "database", "licensing", "personnel", "training", "migration", "integration", "maintenance", "support", "security", "compliance", "other"]>;
    methodology: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "direct-savings" | "cost-avoidance" | "efficiency-gain" | "risk-reduction";
    confidence: number;
    description: string;
    amount: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    itemId: string;
    category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
    methodology?: string | undefined;
}, {
    type: "direct-savings" | "cost-avoidance" | "efficiency-gain" | "risk-reduction";
    confidence: number;
    description: string;
    amount: {
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        amount: number;
        isEstimate: boolean;
        period?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        confidenceRange?: [number, number] | undefined;
    };
    itemId: string;
    category: "compute" | "network" | "storage" | "database" | "security" | "infrastructure" | "licensing" | "personnel" | "training" | "migration" | "integration" | "maintenance" | "support" | "compliance" | "other";
    methodology?: string | undefined;
}>;
/**
 * Complete ROI report suitable for enterprise review.
 */
export interface EnterpriseROIReport {
    /**
     * Report identifier.
     */
    readonly reportId: string;
    /**
     * Report version.
     */
    readonly version: string;
    /**
     * Report title.
     */
    readonly title: string;
    /**
     * Generation timestamp.
     */
    readonly generatedAt: string;
    /**
     * Source intent information.
     */
    readonly sourceIntent: {
        readonly intentId: string;
        readonly intentHash: string;
        readonly intentVersion: string;
    };
    /**
     * Executive summary.
     */
    readonly executiveSummary: string;
    /**
     * Key financial highlights.
     */
    readonly highlights: readonly FinancialHighlight[];
    /**
     * ROI metrics.
     */
    readonly roiMetrics: ROIMetrics;
    /**
     * Cost breakdown.
     */
    readonly costBreakdown: CostBreakdown;
    /**
     * Identified savings.
     */
    readonly savings: readonly SavingsItem[];
    /**
     * Total projected savings.
     */
    readonly totalSavings: MonetaryValue;
    /**
     * Risk factors considered.
     */
    readonly riskFactors: readonly RiskFactor[];
    /**
     * Assumptions made in calculations.
     */
    readonly assumptions: readonly string[];
    /**
     * Financial artifact references used.
     */
    readonly financialReferences: readonly string[];
    /**
     * Audit information.
     */
    readonly audit: FinancialReportAudit;
}
/**
 * A financial highlight for executive summary.
 */
export interface FinancialHighlight {
    /**
     * Highlight category.
     */
    readonly category: 'roi' | 'savings' | 'cost' | 'risk' | 'timeline';
    /**
     * Title.
     */
    readonly title: string;
    /**
     * Value or description.
     */
    readonly value: string;
    /**
     * Trend indicator.
     */
    readonly trend?: 'positive' | 'negative' | 'neutral';
    /**
     * Supporting detail.
     */
    readonly detail?: string;
}
/**
 * A risk factor with financial impact.
 */
export interface RiskFactor {
    /**
     * Risk identifier.
     */
    readonly riskId: string;
    /**
     * Risk description.
     */
    readonly description: string;
    /**
     * Likelihood (0.0 - 1.0).
     */
    readonly likelihood: number;
    /**
     * Potential financial impact.
     */
    readonly impact: MonetaryValue;
    /**
     * Mitigation strategy.
     */
    readonly mitigation?: string;
}
/**
 * Audit information for financial report.
 */
export interface FinancialReportAudit {
    /**
     * Intent ID that generated this report.
     */
    readonly intentId: string;
    /**
     * Intent version.
     */
    readonly intentVersion: string;
    /**
     * Intent hash.
     */
    readonly intentHash: string;
    /**
     * Generation timestamp.
     */
    readonly generatedAt: string;
    /**
     * Exporter version.
     */
    readonly exporterVersion: string;
    /**
     * Financial artifact count.
     */
    readonly artifactCount: number;
    /**
     * Primary currency used.
     */
    readonly primaryCurrency: Currency;
    /**
     * Projection horizon in months.
     */
    readonly projectionHorizonMonths: number;
}
/**
 * Result of financial artifact detection on an intent.
 */
export interface FinancialDetectionResult {
    /**
     * Whether any financial artifacts were detected.
     */
    readonly hasFinancialArtifacts: boolean;
    /**
     * All detected financial artifact references.
     */
    readonly references: readonly FinancialArtifactReference[];
    /**
     * Generated ROI report (if sufficient artifacts found).
     */
    readonly roiReport?: EnterpriseROIReport;
    /**
     * Summary statistics.
     */
    readonly summary: FinancialDetectionSummary;
}
/**
 * Summary statistics for financial detection.
 */
export interface FinancialDetectionSummary {
    readonly totalReferences: number;
    readonly bySource: Readonly<Record<FinancialSource, number>>;
    readonly byArtifactType: Readonly<Record<FinancialArtifactType, number>>;
    readonly primaryCurrency: Currency;
    readonly highConfidenceCount: number;
    readonly hasSufficientDataForROI: boolean;
}
export declare const FinancialDetectionResultSchema: z.ZodObject<{
    hasFinancialArtifacts: z.ZodBoolean;
    references: z.ZodArray<z.ZodObject<{
        referenceId: z.ZodString;
        source: z.ZodEnum<["enterprise-roi-engine", "cost-calculator", "tco-analyzer", "budget-planner", "financial-modeler", "custom", "unknown"]>;
        artifactType: z.ZodEnum<["roi-calculation", "tco-analysis", "cost-breakdown", "budget-projection", "savings-analysis", "payback-period", "npv-analysis", "irr-calculation", "cost-comparison", "resource-costing", "license-cost", "operational-cost", "capital-cost", "migration-cost", "risk-adjusted-return"]>;
        sourceType: z.ZodString;
        sourcePath: z.ZodString;
        resourceName: z.ZodString;
        originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        currency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        timePeriod: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "multi-year"]>>;
        projectionHorizon: z.ZodOptional<z.ZodNumber>;
        calculatedAt: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        source: "unknown" | "custom" | "enterprise-roi-engine" | "cost-calculator" | "tco-analyzer" | "budget-planner" | "financial-modeler";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "roi-calculation" | "tco-analysis" | "cost-breakdown" | "budget-projection" | "savings-analysis" | "payback-period" | "npv-analysis" | "irr-calculation" | "cost-comparison" | "resource-costing" | "license-cost" | "operational-cost" | "capital-cost" | "migration-cost" | "risk-adjusted-return";
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        timePeriod?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        projectionHorizon?: number | undefined;
        calculatedAt?: string | undefined;
    }, {
        source: "unknown" | "custom" | "enterprise-roi-engine" | "cost-calculator" | "tco-analyzer" | "budget-planner" | "financial-modeler";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "roi-calculation" | "tco-analysis" | "cost-breakdown" | "budget-projection" | "savings-analysis" | "payback-period" | "npv-analysis" | "irr-calculation" | "cost-comparison" | "resource-costing" | "license-cost" | "operational-cost" | "capital-cost" | "migration-cost" | "risk-adjusted-return";
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        timePeriod?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        projectionHorizon?: number | undefined;
        calculatedAt?: string | undefined;
    }>, "many">;
    roiReport: z.ZodOptional<z.ZodAny>;
    summary: z.ZodObject<{
        totalReferences: z.ZodNumber;
        bySource: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byArtifactType: z.ZodRecord<z.ZodString, z.ZodNumber>;
        primaryCurrency: z.ZodEnum<["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD", "INR", "BRL", "KRW", "SGD", "HKD", "OTHER"]>;
        highConfidenceCount: z.ZodNumber;
        hasSufficientDataForROI: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        primaryCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        hasSufficientDataForROI: boolean;
    }, {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        primaryCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        hasSufficientDataForROI: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    references: {
        source: "unknown" | "custom" | "enterprise-roi-engine" | "cost-calculator" | "tco-analyzer" | "budget-planner" | "financial-modeler";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "roi-calculation" | "tco-analysis" | "cost-breakdown" | "budget-projection" | "savings-analysis" | "payback-period" | "npv-analysis" | "irr-calculation" | "cost-comparison" | "resource-costing" | "license-cost" | "operational-cost" | "capital-cost" | "migration-cost" | "risk-adjusted-return";
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        timePeriod?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        projectionHorizon?: number | undefined;
        calculatedAt?: string | undefined;
    }[];
    summary: {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        primaryCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        hasSufficientDataForROI: boolean;
    };
    hasFinancialArtifacts: boolean;
    roiReport?: any;
}, {
    references: {
        source: "unknown" | "custom" | "enterprise-roi-engine" | "cost-calculator" | "tco-analyzer" | "budget-planner" | "financial-modeler";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "roi-calculation" | "tco-analysis" | "cost-breakdown" | "budget-projection" | "savings-analysis" | "payback-period" | "npv-analysis" | "irr-calculation" | "cost-comparison" | "resource-costing" | "license-cost" | "operational-cost" | "capital-cost" | "migration-cost" | "risk-adjusted-return";
        currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        timePeriod?: "monthly" | "quarterly" | "annual" | "multi-year" | undefined;
        projectionHorizon?: number | undefined;
        calculatedAt?: string | undefined;
    }[];
    summary: {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        primaryCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "CHF" | "CAD" | "AUD" | "INR" | "BRL" | "KRW" | "SGD" | "HKD" | "OTHER";
        hasSufficientDataForROI: boolean;
    };
    hasFinancialArtifacts: boolean;
    roiReport?: any;
}>;
/**
 * Output format options for financial artifact exports.
 */
export declare const FinancialExportFormatValues: readonly ["roi-report-json", "roi-report-yaml", "executive-summary-md", "detailed-report-md", "cost-breakdown-csv", "savings-analysis-csv", "financial-dashboard-json"];
export type FinancialExportFormat = (typeof FinancialExportFormatValues)[number];
export declare const FinancialExportFormatSchema: z.ZodEnum<["roi-report-json", "roi-report-yaml", "executive-summary-md", "detailed-report-md", "cost-breakdown-csv", "savings-analysis-csv", "financial-dashboard-json"]>;
/**
 * Type guard for FinancialSource.
 */
export declare function isFinancialSource(value: unknown): value is FinancialSource;
/**
 * Type guard for FinancialArtifactType.
 */
export declare function isFinancialArtifactType(value: unknown): value is FinancialArtifactType;
/**
 * Type guard for Currency.
 */
export declare function isCurrency(value: unknown): value is Currency;
/**
 * Type guard for CostCategory.
 */
export declare function isCostCategory(value: unknown): value is CostCategory;
//# sourceMappingURL=types.d.ts.map