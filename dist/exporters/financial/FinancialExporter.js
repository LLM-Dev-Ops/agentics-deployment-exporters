/**
 * Financial Exporter
 *
 * Exports financial artifacts as ROI reports, cost breakdowns, and
 * executive summaries suitable for enterprise review.
 *
 * This exporter is a passive translator - it transforms detected financial
 * artifacts into structured output formats without modifying financial logic.
 *
 * @module exporters/financial/FinancialExporter
 * @version 1.0.0
 */
import { FinancialArtifactDetector, } from '../../core/financial/index.js';
// =============================================================================
// MAIN EXPORTER CLASS
// =============================================================================
/**
 * Financial Exporter class.
 *
 * Transforms financial artifacts detected in deployment intents into
 * ROI reports and cost analyses for enterprise review.
 */
export class FinancialExporter {
    id = 'financial';
    name = 'Financial Artifact Exporter';
    version = '1.0.0';
    targetFormat = 'config';
    detector;
    options;
    constructor(options = {}) {
        this.options = {
            generateReportJson: options.generateReportJson ?? true,
            generateReportYaml: options.generateReportYaml ?? true,
            generateExecutiveSummary: options.generateExecutiveSummary ?? true,
            generateDetailedReport: options.generateDetailedReport ?? true,
            generateCostCsv: options.generateCostCsv ?? true,
            generateSavingsCsv: options.generateSavingsCsv ?? true,
            basePath: options.basePath ?? 'financial-exports',
            minConfidence: options.minConfidence ?? 0.5,
        };
        this.detector = new FinancialArtifactDetector({
            minConfidence: this.options.minConfidence,
            generateReport: true,
            includeOriginalProperties: true,
        });
    }
    /**
     * Transform a normalized intent into financial export artifacts.
     */
    transform(intent, _options) {
        const detectionResult = this.detector.detect(intent);
        if (!detectionResult.hasFinancialArtifacts) {
            return [];
        }
        const artifacts = [];
        const basePath = this.options.basePath;
        // Generate ROI report artifacts
        if (detectionResult.roiReport) {
            if (this.options.generateReportJson) {
                artifacts.push(this.generateReportJsonArtifact(detectionResult.roiReport, basePath));
            }
            if (this.options.generateReportYaml) {
                artifacts.push(this.generateReportYamlArtifact(detectionResult.roiReport, basePath));
            }
            if (this.options.generateExecutiveSummary) {
                artifacts.push(this.generateExecutiveSummaryArtifact(detectionResult, basePath));
            }
            if (this.options.generateDetailedReport) {
                artifacts.push(this.generateDetailedReportArtifact(detectionResult, basePath));
            }
            if (this.options.generateCostCsv) {
                artifacts.push(this.generateCostCsvArtifact(detectionResult.roiReport.costBreakdown, basePath));
            }
            if (this.options.generateSavingsCsv) {
                artifacts.push(this.generateSavingsCsvArtifact(detectionResult.roiReport.savings, basePath));
            }
        }
        // Generate manifest
        artifacts.push(this.generateManifestArtifact(detectionResult, basePath));
        return artifacts;
    }
    /**
     * Validate that an intent can be exported.
     */
    validate(intent) {
        const detectionResult = this.detector.detect(intent);
        if (!detectionResult.hasFinancialArtifacts) {
            return {
                valid: true,
                errors: [],
                warnings: [{
                        code: 'FIN_NO_ARTIFACTS',
                        message: 'No financial artifacts detected in intent',
                    }],
            };
        }
        const warnings = [];
        const lowConfidenceCount = detectionResult.references.filter(r => r.confidence < 0.7).length;
        if (lowConfidenceCount > 0) {
            warnings.push({
                code: 'FIN_LOW_CONFIDENCE',
                message: `${lowConfidenceCount} financial reference(s) have confidence below 0.7`,
            });
        }
        if (!detectionResult.summary.hasSufficientDataForROI) {
            warnings.push({
                code: 'FIN_INSUFFICIENT_DATA',
                message: 'Insufficient data for complete ROI analysis',
            });
        }
        return {
            valid: true,
            errors: [],
            warnings,
        };
    }
    /**
     * Check if this exporter can handle the given intent.
     */
    canHandle(intent) {
        const detectionResult = this.detector.detect(intent);
        return detectionResult.hasFinancialArtifacts;
    }
    /**
     * Get required serializers.
     */
    getRequiredSerializers() {
        return ['json', 'yaml'];
    }
    // ===========================================================================
    // ARTIFACT GENERATION
    // ===========================================================================
    /**
     * Generate ROI report JSON artifact.
     */
    generateReportJsonArtifact(report, basePath) {
        return {
            path: `${basePath}/roi-report.json`,
            content: report,
            format: 'json',
            encoding: 'utf-8',
            metadata: {
                artifactType: 'roi-report',
                format: 'json',
                reportId: report.reportId,
                currency: report.audit.primaryCurrency,
            },
        };
    }
    /**
     * Generate ROI report YAML artifact.
     */
    generateReportYamlArtifact(report, basePath) {
        return {
            path: `${basePath}/roi-report.yaml`,
            content: report,
            format: 'yaml',
            encoding: 'utf-8',
            metadata: {
                artifactType: 'roi-report',
                format: 'yaml',
                reportId: report.reportId,
                currency: report.audit.primaryCurrency,
            },
        };
    }
    /**
     * Generate executive summary Markdown artifact.
     */
    generateExecutiveSummaryArtifact(result, basePath) {
        const report = result.roiReport;
        const content = this.renderExecutiveSummary(report, result);
        return {
            path: `${basePath}/executive-summary.md`,
            content,
            format: 'yaml', // Will be treated as raw text
            encoding: 'utf-8',
            metadata: {
                artifactType: 'executive-summary',
                format: 'markdown',
                reportId: report.reportId,
            },
        };
    }
    /**
     * Generate detailed report Markdown artifact.
     */
    generateDetailedReportArtifact(result, basePath) {
        const report = result.roiReport;
        const content = this.renderDetailedReport(report, result);
        return {
            path: `${basePath}/detailed-report.md`,
            content,
            format: 'yaml', // Will be treated as raw text
            encoding: 'utf-8',
            metadata: {
                artifactType: 'detailed-report',
                format: 'markdown',
                reportId: report.reportId,
            },
        };
    }
    /**
     * Generate cost breakdown CSV artifact.
     */
    generateCostCsvArtifact(costBreakdown, basePath) {
        const lines = [];
        // Header
        lines.push('Item ID,Category,Description,Amount,Currency,Period,Is Recurring,Resource');
        // Data rows
        for (const item of costBreakdown.lineItems) {
            const row = [
                this.escapeCsv(item.itemId),
                this.escapeCsv(item.category),
                this.escapeCsv(item.description),
                item.amount.amount.toString(),
                item.amount.currency,
                item.amount.period ?? '',
                item.isRecurring ? 'Yes' : 'No',
                this.escapeCsv(item.resourceName ?? ''),
            ];
            lines.push(row.join(','));
        }
        return {
            path: `${basePath}/cost-breakdown.csv`,
            content: lines.join('\n'),
            format: 'yaml', // Raw text
            encoding: 'utf-8',
            metadata: {
                artifactType: 'cost-breakdown',
                format: 'csv',
                lineItemCount: costBreakdown.lineItems.length,
            },
        };
    }
    /**
     * Generate savings analysis CSV artifact.
     */
    generateSavingsCsvArtifact(savings, basePath) {
        const lines = [];
        // Header
        lines.push('Item ID,Type,Description,Amount,Currency,Period,Category,Confidence');
        // Data rows
        for (const item of savings) {
            const row = [
                this.escapeCsv(item.itemId),
                this.escapeCsv(item.type),
                this.escapeCsv(item.description),
                item.amount.amount.toString(),
                item.amount.currency,
                item.amount.period ?? '',
                this.escapeCsv(item.category),
                (item.confidence * 100).toFixed(1) + '%',
            ];
            lines.push(row.join(','));
        }
        return {
            path: `${basePath}/savings-analysis.csv`,
            content: lines.join('\n'),
            format: 'yaml', // Raw text
            encoding: 'utf-8',
            metadata: {
                artifactType: 'savings-analysis',
                format: 'csv',
                savingsItemCount: savings.length,
            },
        };
    }
    /**
     * Generate manifest artifact.
     */
    generateManifestArtifact(result, basePath) {
        const manifest = {
            _agentics_financial_export: {
                version: '1.0.0',
                exporterVersion: this.version,
            },
            summary: result.summary,
            referenceCount: result.references.length,
            hasReport: !!result.roiReport,
            reportId: result.roiReport?.reportId,
            primaryCurrency: result.summary.primaryCurrency,
            artifacts: [
                this.options.generateReportJson && 'roi-report.json',
                this.options.generateReportYaml && 'roi-report.yaml',
                this.options.generateExecutiveSummary && 'executive-summary.md',
                this.options.generateDetailedReport && 'detailed-report.md',
                this.options.generateCostCsv && 'cost-breakdown.csv',
                this.options.generateSavingsCsv && 'savings-analysis.csv',
            ].filter(Boolean),
        };
        return {
            path: `${basePath}/manifest.json`,
            content: manifest,
            format: 'json',
            encoding: 'utf-8',
            metadata: {
                artifactType: 'manifest',
            },
        };
    }
    // ===========================================================================
    // MARKDOWN RENDERING
    // ===========================================================================
    /**
     * Render executive summary Markdown.
     */
    renderExecutiveSummary(report, _result) {
        const lines = [];
        lines.push('# Executive Summary: ROI Analysis');
        lines.push('');
        lines.push(`**Report ID:** ${report.reportId}`);
        lines.push(`**Generated:** ${report.generatedAt}`);
        lines.push(`**Currency:** ${report.audit.primaryCurrency}`);
        lines.push('');
        lines.push('## Overview');
        lines.push('');
        lines.push(report.executiveSummary);
        lines.push('');
        // Key Highlights
        if (report.highlights.length > 0) {
            lines.push('## Key Highlights');
            lines.push('');
            for (const highlight of report.highlights) {
                const trendIcon = highlight.trend === 'positive' ? '📈' :
                    highlight.trend === 'negative' ? '📉' : '➡️';
                lines.push(`### ${trendIcon} ${highlight.title}`);
                lines.push('');
                lines.push(`**${highlight.value}**`);
                if (highlight.detail) {
                    lines.push('');
                    lines.push(highlight.detail);
                }
                lines.push('');
            }
        }
        // ROI Summary
        lines.push('## Financial Summary');
        lines.push('');
        lines.push('| Metric | Value |');
        lines.push('|--------|-------|');
        if (report.roiMetrics.roiPercentage !== undefined) {
            lines.push(`| Return on Investment | ${report.roiMetrics.roiPercentage.toFixed(1)}% |`);
        }
        if (report.roiMetrics.paybackPeriodMonths !== undefined) {
            lines.push(`| Payback Period | ${report.roiMetrics.paybackPeriodMonths} months |`);
        }
        if (report.roiMetrics.npv) {
            lines.push(`| Net Present Value | ${this.formatCurrency(report.roiMetrics.npv.amount, report.roiMetrics.npv.currency)} |`);
        }
        if (report.roiMetrics.totalInvestment) {
            lines.push(`| Total Investment | ${this.formatCurrency(report.roiMetrics.totalInvestment.amount, report.roiMetrics.totalInvestment.currency)} |`);
        }
        if (report.totalSavings.amount > 0) {
            lines.push(`| Annual Savings | ${this.formatCurrency(report.totalSavings.amount, report.totalSavings.currency)} |`);
        }
        lines.push('');
        // Cost Summary
        lines.push('## Cost Summary');
        lines.push('');
        lines.push(`- **Capital Expenditure (CapEx):** ${this.formatCurrency(report.costBreakdown.capex.amount, report.costBreakdown.capex.currency)}`);
        lines.push(`- **Operational Expenditure (OpEx):** ${this.formatCurrency(report.costBreakdown.opex.amount, report.costBreakdown.opex.currency)}/year`);
        lines.push(`- **Total Cost of Ownership:** ${this.formatCurrency(report.costBreakdown.tco.amount, report.costBreakdown.tco.currency)}`);
        lines.push(`- **Projection Period:** ${report.costBreakdown.projectionMonths} months`);
        lines.push('');
        // Risk Summary
        if (report.riskFactors.length > 0) {
            lines.push('## Risk Summary');
            lines.push('');
            lines.push(`${report.riskFactors.length} risk factor(s) identified. See detailed report for analysis.`);
            lines.push('');
        }
        lines.push('---');
        lines.push('');
        lines.push('*Generated by Agentics Deployment Exporters - Financial Module*');
        return lines.join('\n');
    }
    /**
     * Render detailed report Markdown.
     */
    renderDetailedReport(report, result) {
        const lines = [];
        lines.push('# Detailed ROI Analysis Report');
        lines.push('');
        lines.push(`**Report ID:** ${report.reportId}`);
        lines.push(`**Version:** ${report.version}`);
        lines.push(`**Generated:** ${report.generatedAt}`);
        lines.push('');
        // Table of Contents
        lines.push('## Table of Contents');
        lines.push('');
        lines.push('1. [Executive Summary](#executive-summary)');
        lines.push('2. [Financial Artifacts](#financial-artifacts)');
        lines.push('3. [ROI Metrics](#roi-metrics)');
        lines.push('4. [Cost Breakdown](#cost-breakdown)');
        lines.push('5. [Savings Analysis](#savings-analysis)');
        lines.push('6. [Risk Factors](#risk-factors)');
        lines.push('7. [Assumptions](#assumptions)');
        lines.push('8. [Audit Information](#audit-information)');
        lines.push('');
        // Executive Summary
        lines.push('## Executive Summary');
        lines.push('');
        lines.push(report.executiveSummary);
        lines.push('');
        // Financial Artifacts
        lines.push('## Financial Artifacts');
        lines.push('');
        lines.push('The following financial artifacts were detected:');
        lines.push('');
        lines.push('| Reference ID | Source | Type | Currency | Confidence |');
        lines.push('|-------------|--------|------|----------|------------|');
        for (const ref of result.references) {
            lines.push(`| ${ref.referenceId} | ${ref.source} | ${ref.artifactType} | ${ref.currency} | ${(ref.confidence * 100).toFixed(0)}% |`);
        }
        lines.push('');
        // ROI Metrics
        lines.push('## ROI Metrics');
        lines.push('');
        if (report.roiMetrics.roiPercentage !== undefined) {
            lines.push(`- **Return on Investment (ROI):** ${report.roiMetrics.roiPercentage.toFixed(2)}%`);
        }
        if (report.roiMetrics.npv) {
            lines.push(`- **Net Present Value (NPV):** ${this.formatCurrency(report.roiMetrics.npv.amount, report.roiMetrics.npv.currency)}`);
        }
        if (report.roiMetrics.irr !== undefined) {
            lines.push(`- **Internal Rate of Return (IRR):** ${report.roiMetrics.irr.toFixed(2)}%`);
        }
        if (report.roiMetrics.paybackPeriodMonths !== undefined) {
            lines.push(`- **Payback Period:** ${report.roiMetrics.paybackPeriodMonths} months`);
        }
        if (report.roiMetrics.totalInvestment) {
            lines.push(`- **Total Investment:** ${this.formatCurrency(report.roiMetrics.totalInvestment.amount, report.roiMetrics.totalInvestment.currency)}`);
        }
        if (report.roiMetrics.totalReturns) {
            lines.push(`- **Total Expected Returns:** ${this.formatCurrency(report.roiMetrics.totalReturns.amount, report.roiMetrics.totalReturns.currency)}`);
        }
        if (report.roiMetrics.netBenefit) {
            lines.push(`- **Net Benefit:** ${this.formatCurrency(report.roiMetrics.netBenefit.amount, report.roiMetrics.netBenefit.currency)}`);
        }
        lines.push('');
        // Cost Breakdown
        lines.push('## Cost Breakdown');
        lines.push('');
        lines.push('### Summary');
        lines.push('');
        lines.push(`| Cost Type | Amount |`);
        lines.push('|-----------|--------|');
        lines.push(`| Capital Expenditure | ${this.formatCurrency(report.costBreakdown.capex.amount, report.costBreakdown.capex.currency)} |`);
        lines.push(`| Operational Expenditure (Annual) | ${this.formatCurrency(report.costBreakdown.opex.amount, report.costBreakdown.opex.currency)} |`);
        lines.push(`| Total Cost of Ownership | ${this.formatCurrency(report.costBreakdown.tco.amount, report.costBreakdown.tco.currency)} |`);
        lines.push('');
        if (report.costBreakdown.lineItems.length > 0) {
            lines.push('### Detailed Line Items');
            lines.push('');
            lines.push('| Category | Description | Amount | Recurring |');
            lines.push('|----------|-------------|--------|-----------|');
            for (const item of report.costBreakdown.lineItems) {
                lines.push(`| ${item.category} | ${item.description} | ${this.formatCurrency(item.amount.amount, item.amount.currency)} | ${item.isRecurring ? 'Yes' : 'No'} |`);
            }
            lines.push('');
        }
        // Savings Analysis
        lines.push('## Savings Analysis');
        lines.push('');
        lines.push(`**Total Annual Savings:** ${this.formatCurrency(report.totalSavings.amount, report.totalSavings.currency)}`);
        lines.push('');
        if (report.savings.length > 0) {
            lines.push('### Savings Items');
            lines.push('');
            lines.push('| Type | Description | Amount | Confidence |');
            lines.push('|------|-------------|--------|------------|');
            for (const item of report.savings) {
                lines.push(`| ${item.type} | ${item.description} | ${this.formatCurrency(item.amount.amount, item.amount.currency)} | ${(item.confidence * 100).toFixed(0)}% |`);
            }
            lines.push('');
        }
        // Risk Factors
        lines.push('## Risk Factors');
        lines.push('');
        if (report.riskFactors.length > 0) {
            for (const risk of report.riskFactors) {
                lines.push(`### ${risk.description}`);
                lines.push('');
                lines.push(`- **Likelihood:** ${(risk.likelihood * 100).toFixed(0)}%`);
                lines.push(`- **Potential Impact:** ${this.formatCurrency(risk.impact.amount, risk.impact.currency)}`);
                if (risk.mitigation) {
                    lines.push(`- **Mitigation:** ${risk.mitigation}`);
                }
                lines.push('');
            }
        }
        else {
            lines.push('No significant risk factors identified.');
            lines.push('');
        }
        // Assumptions
        lines.push('## Assumptions');
        lines.push('');
        for (const assumption of report.assumptions) {
            lines.push(`- ${assumption}`);
        }
        lines.push('');
        // Audit Information
        lines.push('## Audit Information');
        lines.push('');
        lines.push(`- **Intent ID:** ${report.audit.intentId}`);
        lines.push(`- **Intent Version:** ${report.audit.intentVersion}`);
        lines.push(`- **Intent Hash:** ${report.audit.intentHash}`);
        lines.push(`- **Generated At:** ${report.audit.generatedAt}`);
        lines.push(`- **Exporter Version:** ${report.audit.exporterVersion}`);
        lines.push(`- **Artifact Count:** ${report.audit.artifactCount}`);
        lines.push(`- **Primary Currency:** ${report.audit.primaryCurrency}`);
        lines.push(`- **Projection Horizon:** ${report.audit.projectionHorizonMonths} months`);
        lines.push('');
        lines.push('---');
        lines.push('');
        lines.push('*Generated by Agentics Deployment Exporters - Financial Module*');
        return lines.join('\n');
    }
    /**
     * Format currency value.
     */
    formatCurrency(amount, currency) {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
        return formatter.format(amount);
    }
    /**
     * Escape CSV value.
     */
    escapeCsv(value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
}
/**
 * Factory function to create a Financial Exporter.
 */
export function createFinancialExporter(options) {
    return new FinancialExporter(options);
}
//# sourceMappingURL=FinancialExporter.js.map