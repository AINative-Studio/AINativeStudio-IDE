/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Export Dialog Component
 *
 * Provides UI for exporting tool logs in various formats
 */

import React, { useState } from 'react';
import { ExportFormat } from './types';

interface ExportDialogProps {
	onExport: (format: ExportFormat) => void;
	onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onExport, onClose }) => {
	const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');

	const handleExport = () => {
		onExport(selectedFormat);
	};

	return (
		<div className="export-dialog-overlay" onClick={onClose}>
			<div className="export-dialog" onClick={(e) => e.stopPropagation()}>
				<div className="export-dialog-header">
					<h3>Export Tool Logs</h3>
					<button className="close-btn" onClick={onClose}>
						<span className="codicon codicon-close"></span>
					</button>
				</div>

				<div className="export-dialog-content">
					<p>Select the format for exporting tool execution logs:</p>

					<div className="export-format-options">
						<label className={`format-option ${selectedFormat === 'json' ? 'selected' : ''}`}>
							<input
								type="radio"
								name="format"
								value="json"
								checked={selectedFormat === 'json'}
								onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
							/>
							<div className="format-info">
								<span className="format-name">JSON</span>
								<span className="format-description">
									Complete data with full structure (recommended for analysis)
								</span>
							</div>
						</label>

						<label className={`format-option ${selectedFormat === 'csv' ? 'selected' : ''}`}>
							<input
								type="radio"
								name="format"
								value="csv"
								checked={selectedFormat === 'csv'}
								onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
							/>
							<div className="format-info">
								<span className="format-name">CSV</span>
								<span className="format-description">
									Spreadsheet-compatible format (great for Excel/Google Sheets)
								</span>
							</div>
						</label>

						<label className={`format-option ${selectedFormat === 'text' ? 'selected' : ''}`}>
							<input
								type="radio"
								name="format"
								value="text"
								checked={selectedFormat === 'text'}
								onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
							/>
							<div className="format-info">
								<span className="format-name">Text</span>
								<span className="format-description">
									Human-readable plain text format
								</span>
							</div>
						</label>
					</div>
				</div>

				<div className="export-dialog-footer">
					<button className="secondary-btn" onClick={onClose}>
						Cancel
					</button>
					<button className="primary-btn" onClick={handleExport}>
						<span className="codicon codicon-export"></span>
						Export
					</button>
				</div>
			</div>
		</div>
	);
};
