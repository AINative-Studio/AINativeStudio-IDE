/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Code Intelligence View Component
 *
 * Displays code analysis results including:
 * - Complexity metrics (cyclomatic, cognitive, maintainability)
 * - Symbols found (functions, classes, variables)
 * - Import analysis
 * - Reference tracking
 */

import React, { useState } from 'react';
import { CodeIntelligenceResult, FunctionComplexity } from './types.js';
import { Copy, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface CodeIntelligenceViewProps {
	result: CodeIntelligenceResult;
	onCopy?: () => void;
}

/**
 * Main code intelligence view component
 */
export const CodeIntelligenceView: React.FC<CodeIntelligenceViewProps> = ({ result, onCopy }) => {
	const [isExpanded, setIsExpanded] = useState(true);

	return (
		<div className="tool-result-card code-intelligence-view">
			<div className="tool-result-header">
				<div className="flex items-center gap-2">
					<Info className="tool-icon" size={16} />
					<h3 className="tool-title">Code Intelligence</h3>
					<span className="tool-operation">{formatOperation(result.operation)}</span>
					{result.language && (
						<span className="tool-language">{result.language}</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						className="tool-action-btn"
						onClick={onCopy}
						title="Copy results"
					>
						<Copy size={14} />
					</button>
					<button
						className="tool-action-btn"
						onClick={() => setIsExpanded(!isExpanded)}
						title={isExpanded ? 'Collapse' : 'Expand'}
					>
						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className="tool-result-body">
					{result.complexity && <ComplexityMetrics complexity={result.complexity} />}
					{result.symbols && result.symbols.length > 0 && <SymbolsList symbols={result.symbols} />}
					{result.imports && result.imports.length > 0 && <ImportsList imports={result.imports} />}
					{result.references && result.references.length > 0 && <ReferencesList references={result.references} />}
					{result.rawText && !result.complexity && !result.symbols?.length && (
						<div className="raw-text">{result.rawText}</div>
					)}
				</div>
			)}
		</div>
	);
};

/**
 * Complexity metrics display
 */
const ComplexityMetrics: React.FC<{ complexity: NonNullable<CodeIntelligenceResult['complexity']> }> = ({ complexity }) => {
	const [sortBy, setSortBy] = useState<'name' | 'complexity'>('complexity');
	const [sortedFunctions, setSortedFunctions] = useState(complexity.functions);

	React.useEffect(() => {
		const sorted = [...complexity.functions].sort((a, b) => {
			if (sortBy === 'name') {
				return a.name.localeCompare(b.name);
			}
			return b.cyclomaticComplexity - a.cyclomaticComplexity;
		});
		setSortedFunctions(sorted);
	}, [sortBy, complexity.functions]);

	return (
		<div className="complexity-metrics">
			<div className="metrics-summary">
				<div className="metric-card">
					<div className="metric-label">Total Functions</div>
					<div className="metric-value">{complexity.totalFunctions}</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Average Complexity</div>
					<div className="metric-value">{complexity.averageComplexity.toFixed(1)}</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Max Complexity</div>
					<div className="metric-value">{complexity.maxComplexity}</div>
				</div>
			</div>

			<div className="functions-list">
				<div className="functions-header">
					<h4>Function Complexity</h4>
					<div className="sort-controls">
						<button
							className={`sort-btn ${sortBy === 'complexity' ? 'active' : ''}`}
							onClick={() => setSortBy('complexity')}
						>
							By Complexity
						</button>
						<button
							className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
							onClick={() => setSortBy('name')}
						>
							By Name
						</button>
					</div>
				</div>
				<div className="functions-table">
					{sortedFunctions.map((func, idx) => (
						<FunctionComplexityRow key={idx} func={func} />
					))}
				</div>
			</div>
		</div>
	);
};

/**
 * Single function complexity row
 */
const FunctionComplexityRow: React.FC<{ func: FunctionComplexity }> = ({ func }) => {
	const rankColor = getRankColor(func.complexityRank);

	return (
		<div className="function-row">
			<div className="function-info">
				<span className="function-name">{func.name}</span>
				{func.classname && <span className="class-name">{func.classname}</span>}
				<span className="function-location">Line {func.line}</span>
			</div>
			<div className="function-metrics">
				<div className="complexity-badge" style={{ backgroundColor: rankColor }}>
					{func.complexityRank}
				</div>
				<div className="complexity-values">
					<div className="complexity-item">
						<span className="complexity-label">Cyclomatic:</span>
						<span className="complexity-number">{func.cyclomaticComplexity}</span>
					</div>
					<div className="complexity-item">
						<span className="complexity-label">Cognitive:</span>
						<span className="complexity-number">{func.cognitiveComplexity}</span>
					</div>
					{func.maintainabilityIndex !== undefined && (
						<div className="complexity-item">
							<span className="complexity-label">Maintainability:</span>
							<span className="complexity-number">{func.maintainabilityIndex.toFixed(1)}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

/**
 * Symbols list display
 */
const SymbolsList: React.FC<{ symbols: NonNullable<CodeIntelligenceResult['symbols']> }> = ({ symbols }) => {
	return (
		<div className="symbols-list">
			<h4>Symbols Found ({symbols.length})</h4>
			<div className="symbols-grid">
				{symbols.map((symbol, idx) => (
					<div key={idx} className="symbol-card">
						<div className="symbol-header">
							<span className="symbol-type">{symbol.type}</span>
							<span className="symbol-name">{symbol.name}</span>
						</div>
						<div className="symbol-location">
							Line {symbol.line}:{symbol.column}
						</div>
						{symbol.signature && (
							<div className="symbol-signature">{symbol.signature}</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Imports list display
 */
const ImportsList: React.FC<{ imports: string[] }> = ({ imports }) => {
	return (
		<div className="imports-list">
			<h4>Imports ({imports.length})</h4>
			<div className="imports-grid">
				{imports.map((imp, idx) => (
					<div key={idx} className="import-item">
						<code>{imp}</code>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * References list display
 */
const ReferencesList: React.FC<{ references: NonNullable<CodeIntelligenceResult['references']> }> = ({ references }) => {
	return (
		<div className="references-list">
			<h4>References ({references.length})</h4>
			<div className="references-table">
				{references.map((ref, idx) => (
					<div key={idx} className="reference-row">
						<span className="reference-type">{ref.type}</span>
						<span className="reference-location">
							Line {ref.line}:{ref.column}
						</span>
						{ref.context && (
							<span className="reference-context">{ref.context}</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Helper functions
 */

function formatOperation(operation: string): string {
	return operation
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function getRankColor(rank: string): string {
	const colors: Record<string, string> = {
		'A': '#22c55e', // green
		'B': '#84cc16', // lime
		'C': '#eab308', // yellow
		'D': '#f97316', // orange
		'E': '#ef4444', // red
		'F': '#dc2626', // dark red
	};
	return colors[rank] || '#6b7280';
}
