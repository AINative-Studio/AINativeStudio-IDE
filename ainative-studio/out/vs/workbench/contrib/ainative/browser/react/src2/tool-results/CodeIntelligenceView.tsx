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
    <div className="ainative-tool-result-card ainative-code-intelligence-view">
			<div className="ainative-tool-result-header">
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<Info className="ainative-tool-icon" size={16} />
					<h3 className="ainative-tool-title">Code Intelligence</h3>
					<span className="ainative-tool-operation">{formatOperation(result.operation)}</span>
					{result.language &&
          <span className="ainative-tool-language">{result.language}</span>
          }
				</div>
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<button
            className="ainative-tool-action-btn"
            onClick={onCopy}
            title="Copy results">

						<Copy size={14} />
					</button>
					<button
            className="ainative-tool-action-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}>

						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded &&
      <div className="ainative-tool-result-body">
					{result.complexity && <ComplexityMetrics complexity={result.complexity} />}
					{result.symbols && result.symbols.length > 0 && <SymbolsList symbols={result.symbols} />}
					{result.imports && result.imports.length > 0 && <ImportsList imports={result.imports} />}
					{result.references && result.references.length > 0 && <ReferencesList references={result.references} />}
					{result.rawText && !result.complexity && !result.symbols?.length &&
        <div className="ainative-raw-text">{result.rawText}</div>
        }
				</div>
      }
		</div>);

};

/**
 * Complexity metrics display
 */
const ComplexityMetrics: React.FC<{complexity: NonNullable<CodeIntelligenceResult['complexity']>;}> = ({ complexity }) => {
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
    <div className="ainative-complexity-metrics">
			<div className="ainative-metrics-summary">
				<div className="ainative-metric-card">
					<div className="ainative-metric-label">Total Functions</div>
					<div className="ainative-metric-value">{complexity.totalFunctions}</div>
				</div>
				<div className="ainative-metric-card">
					<div className="ainative-metric-label">Average Complexity</div>
					<div className="ainative-metric-value">{complexity.averageComplexity.toFixed(1)}</div>
				</div>
				<div className="ainative-metric-card">
					<div className="ainative-metric-label">Max Complexity</div>
					<div className="ainative-metric-value">{complexity.maxComplexity}</div>
				</div>
			</div>

			<div className="ainative-functions-list">
				<div className="ainative-functions-header">
					<h4>Function Complexity</h4>
					<div className="ainative-sort-controls">
						<button
              className={`ainative-sort-btn ${sortBy === 'complexity' ? "ainative-active" : ""}`}
              onClick={() => setSortBy('complexity')}>

							By Complexity
						</button>
						<button
              className={`ainative-sort-btn ${sortBy === 'name' ? "ainative-active" : ""}`}
              onClick={() => setSortBy('name')}>

							By Name
						</button>
					</div>
				</div>
				<div className="ainative-functions-table">
					{sortedFunctions.map((func, idx) =>
          <FunctionComplexityRow key={idx} func={func} />
          )}
				</div>
			</div>
		</div>);

};

/**
 * Single function complexity row
 */
const FunctionComplexityRow: React.FC<{func: FunctionComplexity;}> = ({ func }) => {
  const rankColor = getRankColor(func.complexityRank);

  return (
    <div className="ainative-function-row">
			<div className="ainative-function-info">
				<span className="ainative-function-name">{func.name}</span>
				{func.classname && <span className="ainative-class-name">{func.classname}</span>}
				<span className="ainative-function-location">Line {func.line}</span>
			</div>
			<div className="ainative-function-metrics">
				<div className="ainative-complexity-badge" style={{ backgroundColor: rankColor }}>
					{func.complexityRank}
				</div>
				<div className="ainative-complexity-values">
					<div className="ainative-complexity-item">
						<span className="ainative-complexity-label">Cyclomatic:</span>
						<span className="ainative-complexity-number">{func.cyclomaticComplexity}</span>
					</div>
					<div className="ainative-complexity-item">
						<span className="ainative-complexity-label">Cognitive:</span>
						<span className="ainative-complexity-number">{func.cognitiveComplexity}</span>
					</div>
					{func.maintainabilityIndex !== undefined &&
          <div className="ainative-complexity-item">
							<span className="ainative-complexity-label">Maintainability:</span>
							<span className="ainative-complexity-number">{func.maintainabilityIndex.toFixed(1)}</span>
						</div>
          }
				</div>
			</div>
		</div>);

};

/**
 * Symbols list display
 */
const SymbolsList: React.FC<{symbols: NonNullable<CodeIntelligenceResult['symbols']>;}> = ({ symbols }) => {
  return (
    <div className="ainative-symbols-list">
			<h4>Symbols Found ({symbols.length})</h4>
			<div className="ainative-symbols-grid">
				{symbols.map((symbol, idx) =>
        <div key={idx} className="ainative-symbol-card">
						<div className="ainative-symbol-header">
							<span className="ainative-symbol-type">{symbol.type}</span>
							<span className="ainative-symbol-name">{symbol.name}</span>
						</div>
						<div className="ainative-symbol-location">
							Line {symbol.line}:{symbol.column}
						</div>
						{symbol.signature &&
          <div className="ainative-symbol-signature">{symbol.signature}</div>
          }
					</div>
        )}
			</div>
		</div>);

};

/**
 * Imports list display
 */
const ImportsList: React.FC<{imports: string[];}> = ({ imports }) => {
  return (
    <div className="ainative-imports-list">
			<h4>Imports ({imports.length})</h4>
			<div className="ainative-imports-grid">
				{imports.map((imp, idx) =>
        <div key={idx} className="ainative-import-item">
						<code>{imp}</code>
					</div>
        )}
			</div>
		</div>);

};

/**
 * References list display
 */
const ReferencesList: React.FC<{references: NonNullable<CodeIntelligenceResult['references']>;}> = ({ references }) => {
  return (
    <div className="ainative-references-list">
			<h4>References ({references.length})</h4>
			<div className="ainative-references-table">
				{references.map((ref, idx) =>
        <div key={idx} className="ainative-reference-row">
						<span className="ainative-reference-type">{ref.type}</span>
						<span className="ainative-reference-location">
							Line {ref.line}:{ref.column}
						</span>
						{ref.context &&
          <span className="ainative-reference-context">{ref.context}</span>
          }
					</div>
        )}
			</div>
		</div>);

};

/**
 * Helper functions
 */

function formatOperation(operation: string): string {
  return operation.
  split('_').
  map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
  join(' ');
}

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    'A': '#22c55e', // green
    'B': '#84cc16', // lime
    'C': '#eab308', // yellow
    'D': '#f97316', // orange
    'E': '#ef4444', // red
    'F': '#dc2626' // dark red
  };
  return colors[rank] || '#6b7280';
}