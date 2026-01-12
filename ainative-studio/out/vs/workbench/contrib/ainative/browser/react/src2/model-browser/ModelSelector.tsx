/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useRef, useEffect } from 'react';
import { useAccessor } from '../util/services.js';
import { AIModel, ModelParameter, ModelParameterType } from '../../../../common/aiModelRegistryTypes.js';
import { X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { AINativeButtonBgDarken } from '../util/inputs.js';

interface ModelSelectorProps {
  model: AIModel;
  projectId: string;
  onSelect: (model: AIModel, parameters?: Record<string, any>) => void;
  onClose: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ model, projectId, onSelect, onClose }) => {
  const accessor = useAccessor();
  const modelRegistryService = accessor.get('IAIModelRegistryService');
  const notificationService = accessor.get('INotificationService');

  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const mouseDownInsideModal = useRef(false);

  /**
   * Handle parameter change
   */
  const handleParameterChange = (paramName: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: value
    }));
  };

  /**
   * Validate parameters
   */
  const validateParameters = (): string | null => {
    for (const param of model.parameters) {
      if (param.required && !(param.name in parameters)) {
        return `Required parameter "${param.name}" is missing`;
      }

      const value = parameters[param.name];
      if (value === undefined || value === null) continue;

      // Type validation
      if (param.type === ModelParameterType.Number) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return `Parameter "${param.name}" must be a number`;
        }
        if (param.min !== undefined && numValue < param.min) {
          return `Parameter "${param.name}" must be at least ${param.min}`;
        }
        if (param.max !== undefined && numValue > param.max) {
          return `Parameter "${param.name}" must be at most ${param.max}`;
        }
      }
    }

    return null;
  };

  /**
   * Handle model selection
   */
  const handleSelect = async () => {
    const validationError = validateParameters();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelecting(true);
    setError(null);

    try {
      // Save selection to registry
      await modelRegistryService.selectModel(model.id, projectId, parameters);

      // Show confirmation
      setShowConfirmation(true);
      setTimeout(() => {
        onSelect(model, parameters);
        notificationService.info(`Model "${model.name}" selected successfully`);
      }, 1000);

    } catch (err) {
      console.error('[ModelSelector] Failed to select model:', err);
      setError(err instanceof Error ? err.message : 'Failed to select model');
      setSelecting(false);
    }
  };

  /**
   * Render parameter input
   */
  const renderParameterInput = (param: ModelParameter) => {
    const value = parameters[param.name] ?? param.defaultValue;

    switch (param.type) {
      case ModelParameterType.Boolean:
        return (
          <label className="ainative-flex ainative-items-center ainative-gap-2">
						<input
              type="checkbox"
              checked={value ?? false}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="ainative-rounded ainative-border-ainative-border-2" />

						<span className="ainative-text-sm ainative-text-ainative-fg-3">{param.description}</span>
					</label>);


      case ModelParameterType.Number:
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
            placeholder={param.defaultValue?.toString() ?? ''}
            min={param.min}
            max={param.max}
            step={param.min !== undefined ? Math.abs(param.min) / 10 : 0.1}
            className="ainative-w-full ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 placeholder:ainative-text-ainative-fg-3 focus:ainative-border-ainative-border-1 focus:ainative-outline-none" />);



      case ModelParameterType.String:
        if (param.allowedValues && param.allowedValues.length > 0) {
          // Render as select dropdown
          return (
            <select
              value={value ?? ''}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="ainative-w-full ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 focus:ainative-border-ainative-border-1 focus:ainative-outline-none">

							<option value="">Select...</option>
							{param.allowedValues.map((allowedValue) =>
              <option key={allowedValue} value={allowedValue}>
									{allowedValue}
								</option>
              )}
						</select>);

        }
        // Render as text input
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.defaultValue?.toString() ?? ''}
            className="ainative-w-full ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 placeholder:ainative-text-ainative-fg-3 focus:ainative-border-ainative-border-1 focus:ainative-outline-none" />);



      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.defaultValue?.toString() ?? ''}
            className="ainative-w-full ainative-px-3 ainative-py-2 ainative-bg-ainative-bg-2 ainative-border ainative-border-ainative-border-2 ainative-rounded-md ainative-text-sm ainative-text-ainative-fg-1 placeholder:ainative-text-ainative-fg-3 focus:ainative-border-ainative-border-1 focus:ainative-outline-none" />);


    }
  };

  return (
    <div
      className="ainative-fixed ainative-inset-0 ainative-bg-black/50 ainative-flex ainative-items-center ainative-justify-center ainative-z-[9999999]"
      onMouseDown={() => {
        mouseDownInsideModal.current = false;
      }}
      onMouseUp={() => {
        if (!mouseDownInsideModal.current && !selecting) {
          onClose();
        }
        mouseDownInsideModal.current = false;
      }}>

			<div
        className="ainative-bg-ainative-bg-1 ainative-rounded-md ainative-p-6 ainative-max-w-2xl ainative-w-full ainative-shadow-xl ainative-overflow-y-auto ainative-max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          mouseDownInsideModal.current = true;
          e.stopPropagation();
        }}>

				{/* Header */}
				<div className="ainative-flex ainative-justify-between ainative-items-start ainative-mb-6">
					<div>
						<h2 className="ainative-text-xl ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-1">{model.name}</h2>
						<p className="ainative-text-sm ainative-text-ainative-fg-3">
							{model.provider} {model.version ? `• v${model.version}` : ''}
						</p>
					</div>
					{!selecting &&
          <button
            onClick={onClose}
            className="ainative-text-ainative-fg-3 hover:ainative-text-ainative-fg-1 ainative-transition-colors"
            aria-label="Close">

							<X size={20} />
						</button>
          }
				</div>

				{/* Success State */}
				{showConfirmation ?
        <div className="ainative-flex ainative-flex-col ainative-items-center ainative-justify-center ainative-py-12">
						<CheckCircle2 size={64} className="ainative-text-green-500 ainative-mb-4" />
						<h3 className="ainative-text-lg ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-2">Model Selected!</h3>
						<p className="ainative-text-sm ainative-text-ainative-fg-3">
							{model.name} has been selected for this project.
						</p>
					</div> :

        <>
						{/* Description */}
						<div className="ainative-mb-6">
							<p className="ainative-text-sm ainative-text-ainative-fg-3">{model.description}</p>
						</div>

						{/* Model Info */}
						<div className="ainative-grid ainative-grid-cols-2 ainative-gap-4 ainative-mb-6 ainative-p-4 ainative-bg-ainative-bg-2 ainative-rounded-md">
							<div>
								<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Context Length</div>
								<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
									{model.maxContextLength ?
                `${(model.maxContextLength / 1000).toLocaleString()}K tokens` :
                'N/A'}
								</div>
							</div>
							<div>
								<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Max Output</div>
								<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
									{model.maxOutputLength ?
                `${(model.maxOutputLength / 1000).toLocaleString()}K tokens` :
                'N/A'}
								</div>
							</div>
							<div>
								<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Input Cost</div>
								<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
									{model.pricing.inputTokenCost ?
                `$${model.pricing.inputTokenCost.toFixed(4)}/1K` :
                'Free'}
								</div>
							</div>
							<div>
								<div className="ainative-text-xs ainative-text-ainative-fg-3 ainative-mb-1">Output Cost</div>
								<div className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
									{model.pricing.outputTokenCost ?
                `$${model.pricing.outputTokenCost.toFixed(4)}/1K` :
                'Free'}
								</div>
							</div>
						</div>

						{/* Parameters */}
						{model.parameters && model.parameters.length > 0 &&
          <div className="ainative-mb-6">
								<h3 className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1 ainative-mb-3">Configuration</h3>
								<div className="ainative-space-y-4">
									{model.parameters.map((param) =>
              <div key={param.name}>
											<label className="ainative-block ainative-text-sm ainative-text-ainative-fg-3 ainative-mb-1.5">
												{param.name}
												{param.required && <span className="ainative-text-red-500 ainative-ml-1">*</span>}
											</label>
											{param.type !== ModelParameterType.Boolean && param.description &&
                <p className="ainative-text-xs ainative-text-ainative-fg-4 ainative-mb-2">{param.description}</p>
                }
											{renderParameterInput(param)}
											{param.min !== undefined && param.max !== undefined && param.type === ModelParameterType.Number &&
                <p className="ainative-text-xs ainative-text-ainative-fg-4 ainative-mt-1">
													Range: {param.min} - {param.max}
												</p>
                }
										</div>
              )}
								</div>
							</div>
          }

						{/* Error Message */}
						{error &&
          <div className="ainative-mb-4 ainative-p-3 ainative-bg-red-500/10 ainative-border ainative-border-red-500/20 ainative-rounded-md ainative-flex ainative-items-start ainative-gap-2">
								<AlertTriangle size={16} className="ainative-text-red-500 ainative-mt-0.5 ainative-flex-shrink-0" />
								<p className="ainative-text-sm ainative-text-red-500">{error}</p>
							</div>
          }

						{/* Actions */}
						<div className="ainative-flex ainative-justify-end ainative-gap-3">
							<AINativeButtonBgDarken onClick={onClose} disabled={selecting} className="ainative-px-4 ainative-py-2">
								Cancel
							</AINativeButtonBgDarken>
							<AINativeButtonBgDarken
              onClick={handleSelect}
              disabled={selecting}
              className="ainative-px-4 ainative-py-2 ainative-bg-[#0e70c0] ainative-text-white hover:ainative-bg-[#1177cb] ainative-flex ainative-items-center ainative-gap-2">

								{selecting ?
              <>
										<Loader2 size={16} className="ainative-animate-spin" />
										<span>Selecting...</span>
									</> :

              <span>Select Model</span>
              }
							</AINativeButtonBgDarken>
						</div>
					</>
        }
			</div>
		</div>);

};