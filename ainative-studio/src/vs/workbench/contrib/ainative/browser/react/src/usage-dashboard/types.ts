/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Type definitions for Usage Dashboard components
 */

export type PeriodFilter = '7days' | '30days' | '90days';

export interface ChartDataPoint {
	date: string;
	credits: number;
	tokens: number;
	requests: number;
}

export interface ModelUsageData {
	modelId: string;
	modelName: string;
	credits: number;
	tokens: number;
	requests: number;
	percentage: number;
	color: string;
}

export interface UsageSummary {
	totalCredits: number;
	totalTokens: number;
	totalRequests: number;
	avgCreditsPerRequest: number;
	period: PeriodFilter;
}

export interface ExportFormat {
	type: 'csv' | 'json';
	filename: string;
}

export interface ProjectionData {
	estimatedMonthlyCredits: number;
	estimatedMonthlyCost: number;
	projectedExhaustionDate?: Date;
	confidenceLevel: number;
	recommendation: string;
}
