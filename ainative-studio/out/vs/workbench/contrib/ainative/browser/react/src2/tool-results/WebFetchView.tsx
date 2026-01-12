/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Web Fetch View Component
 *
 * Displays documentation fetched from web sources:
 * - Rendered markdown content
 * - URL and metadata
 * - Content preview/snippet
 * - Copy and export functionality
 */

import React, { useState } from 'react';
import { WebFetchResult } from './types.js';
import { Copy, ChevronDown, ChevronUp, ExternalLink, FileText, AlertTriangle } from 'lucide-react';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';

interface WebFetchViewProps {
  result: WebFetchResult;
  onCopy?: () => void;
  onExport?: () => void;
}

/**
 * Main web fetch view component
 */
export const WebFetchView: React.FC<WebFetchViewProps> = ({ result, onCopy, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);

  const contentPreview = result.content && result.content.length > 500 ?
  result.content.substring(0, 500) + '...' :
  result.content;

  return (
    <div className="ainative-tool-result-card ainative-web-fetch-view">
			<div className="ainative-tool-result-header">
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					<FileText className="ainative-tool-icon" size={16} />
					<h3 className="ainative-tool-title">Documentation</h3>
					<span className="ainative-tool-operation">{formatOperation(result.operation)}</span>
				</div>
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					{result.url &&
          <button
            className="ainative-tool-action-btn"
            onClick={() => window.open(result.url, '_blank')}
            title="Open in browser">

							<ExternalLink size={14} />
						</button>
          }
					<button
            className="ainative-tool-action-btn"
            onClick={onCopy}
            title="Copy content">

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
					{/* Metadata */}
					<div className="ainative-fetch-metadata">
						{result.url &&
          <div className="ainative-metadata-item">
								<span className="ainative-metadata-label">URL:</span>
								<a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ainative-metadata-link">

									{result.url}
								</a>
							</div>
          }
						{result.title &&
          <div className="ainative-metadata-item">
								<span className="ainative-metadata-label">Title:</span>
								<span className="ainative-metadata-value">{result.title}</span>
							</div>
          }
						{result.sizeBytes !== undefined &&
          <div className="ainative-metadata-item">
								<span className="ainative-metadata-label">Size:</span>
								<span className="ainative-metadata-value">{formatBytes(result.sizeBytes)}</span>
							</div>
          }
						{result.contentType &&
          <div className="ainative-metadata-item">
								<span className="ainative-metadata-label">Type:</span>
								<span className="ainative-metadata-value">{result.contentType}</span>
							</div>
          }
						{result.truncated &&
          <div className="ainative-metadata-item ainative-warning">
								<AlertTriangle size={14} />
								<span className="ainative-metadata-value">Content was truncated</span>
							</div>
          }
					</div>

					{/* Content */}
					{result.content ?
        <div className="ainative-fetch-content">
							<div className="ainative-content-header">
								<h4>Content</h4>
								{result.content.length > 500 &&
            <button
              className="ainative-toggle-content-btn"
              onClick={() => setShowFullContent(!showFullContent)}>

										{showFullContent ? 'Show Less' : 'Show All'}
									</button>
            }
							</div>
							<div className="ainative-markdown-content">
								<ChatMarkdownRender
              string={showFullContent ? result.content : contentPreview || ''}
              chatMessageLocation={undefined}
              isApplyEnabled={false}
              isLinkDetectionEnabled={false} />

							</div>
						</div> :
        result.rawText ?
        <div className="ainative-raw-text">{result.rawText}</div> :

        <div className="ainative-no-content">No content available</div>
        }
				</div>
      }
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}