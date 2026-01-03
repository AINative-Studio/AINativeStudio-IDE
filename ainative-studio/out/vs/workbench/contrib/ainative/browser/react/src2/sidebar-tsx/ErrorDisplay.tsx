/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useSettingsState } from '../util/services.js';
import { errorDetails } from '../../../../common/sendLLMMessageTypes.js';


export const ErrorDisplay = ({
  message: message_,
  fullError,
  onDismiss,
  showDismiss





}: {message: string;fullError: Error | null;onDismiss: (() => void) | null;showDismiss?: boolean;}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const details = errorDetails(fullError);
  const isExpandable = !!details;

  const message = message_ + '';

  return (
    <div className={`ainative-rounded-lg ainative-border ainative-border-red-200 ainative-bg-red-50 ainative-p-4 ainative-overflow-auto`}>
			{/* Header */}
			<div className="ainative-flex ainative-items-start ainative-justify-between">
				<div className="ainative-flex ainative-gap-3">
					<AlertCircle className="ainative-h-5 ainative-w-5 ainative-text-red-600 ainative-mt-0.5" />
					<div className="ainative-flex-1">
						<h3 className="ainative-font-semibold ainative-text-red-800">
							{/* eg Error */}
							Error
						</h3>
						<p className="ainative-text-red-700 ainative-mt-1">
							{/* eg Something went wrong */}
							{message}
						</p>
					</div>
				</div>

				<div className="ainative-flex ainative-gap-2">
					{isExpandable &&
          <button className="ainative-text-red-600 hover:ainative-text-red-800 ainative-p-1 ainative-rounded"
          onClick={() => setIsExpanded(!isExpanded)}>

							{isExpanded ?
            <ChevronUp className="ainative-h-5 ainative-w-5" /> :

            <ChevronDown className="ainative-h-5 ainative-w-5" />
            }
						</button>
          }
					{showDismiss && onDismiss &&
          <button className="ainative-text-red-600 hover:ainative-text-red-800 ainative-p-1 ainative-rounded"
          onClick={onDismiss}>

							<X className="ainative-h-5 ainative-w-5" />
						</button>
          }
				</div>
			</div>

			{/* Expandable Details */}
			{isExpanded && details &&
      <div className="ainative-mt-4 ainative-space-y-3 ainative-border-t ainative-border-red-200 ainative-pt-3 ainative-overflow-auto">
					<div>
						<span className="ainative-font-semibold ainative-text-red-800">Full Error: </span>
						<pre className="ainative-text-red-700">{details}</pre>
					</div>
				</div>
      }
		</div>);

};