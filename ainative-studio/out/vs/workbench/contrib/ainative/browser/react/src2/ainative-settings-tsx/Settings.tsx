/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'; // Added useRef import just in case it was missed, though likely already present
import { ProviderName, SettingName, displayInfoOfSettingName, providerNames, VoidStatefulModelInfo, customSettingNamesOfProvider, RefreshableProviderName, refreshableProviderNames, displayInfoOfProviderName, nonlocalProviderNames, localProviderNames, GlobalSettingName, featureNames, displayInfoOfFeatureName, isProviderNameDisabled, FeatureName, hasDownloadButtonsOnModelsProviderNames, subTextMdOfProviderName } from '../../../../common/voidSettingsTypes.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { VoidButtonBgDarken, VoidCustomDropdownBox, VoidInputBox2, VoidSimpleInputBox, VoidSwitch } from '../util/inputs.js';
import { useAccessor, useIsDark, useIsOptedOut, useRefreshModelListener, useRefreshModelState, useSettingsState, useAINativeAuth } from '../util/services.js';
import { X, RefreshCw, Loader2, Check, Asterisk, Plus } from 'lucide-react';
import { URI } from '../../../../../../../base/common/uri.js';
import { ModelDropdown } from './ModelDropdown.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { WarningBox } from './WarningBox.js';
import { AINativeLoginModal } from './AINativeLoginModal.js';
import { os } from '../../../../common/helpers/systemInfo.js';
import { IconLoading } from '../sidebar-tsx/SidebarChat.js';
import { ToolApprovalType, toolApprovalTypes } from '../../../../common/toolsServiceTypes.js';
import Severity from '../../../../../../../base/common/severity.js';
import { getModelCapabilities, modelOverrideKeys, ModelOverrides } from '../../../../common/modelCapabilities.js';
import { TransferEditorType, TransferFilesInfo } from '../../../extensionTransferTypes.js';
import { MCPServer } from '../../../../common/mcpServiceTypes.js';
import { useMCPServiceState } from '../util/services.js';
import { OPT_OUT_KEY } from '../../../../common/storageKeys.js';
import { StorageScope, StorageTarget } from '../../../../../../../platform/storage/common/storage.js';

type Tab =
'models' |
'localProviders' |
'providers' |
'featureOptions' |
'mcp' |
'general' |
'all';


const ButtonLeftTextRightOption = ({ text, leftButton }: {text: string;leftButton?: React.ReactNode;}) => {

  return <div className="ainative-flex ainative-items-center ainative-text-void-fg-3 ainative-px-3 ainative-py-0.5 ainative-rounded-sm ainative-overflow-hidden ainative-gap-2">
		{leftButton ? leftButton : null}
		<span>
			{text}
		</span>
	</div>;
};

// models
const RefreshModelButton = ({ providerName }: {providerName: RefreshableProviderName;}) => {

  const refreshModelState = useRefreshModelState();

  const accessor = useAccessor();
  const refreshModelService = accessor.get('IRefreshModelService');
  const metricsService = accessor.get('IMetricsService');

  const [justFinished, setJustFinished] = useState<null | 'finished' | 'error'>(null);

  useRefreshModelListener(
    useCallback((providerName2, refreshModelState) => {
      if (providerName2 !== providerName) return;
      const { state } = refreshModelState[providerName];
      if (!(state === 'finished' || state === 'error')) return;
      // now we know we just entered 'finished' state for this providerName
      setJustFinished(state);
      const tid = setTimeout(() => {setJustFinished(null);}, 2000);
      return () => clearTimeout(tid);
    }, [providerName])
  );

  const { state } = refreshModelState[providerName];

  const { title: providerTitle } = displayInfoOfProviderName(providerName);

  return <ButtonLeftTextRightOption

    leftButton={
    <button
      className="ainative-flex ainative-items-center"
      disabled={state === 'refreshing' || justFinished !== null}
      onClick={() => {
        refreshModelService.startRefreshingModels(providerName, { enableProviderOnSuccess: false, doNotFire: false });
        metricsService.capture('Click', { providerName, action: 'Refresh Models' });
      }}>

				{justFinished === 'finished' ? <Check className="ainative-stroke-green-500 ainative-size-3" /> :
      justFinished === 'error' ? <X className="ainative-stroke-red-500 ainative-size-3" /> :
      state === 'refreshing' ? <Loader2 className="ainative-size-3 ainative-animate-spin" /> :
      <RefreshCw className="ainative-size-3" />}
			</button>
    }

    text={justFinished === 'finished' ? `${providerTitle} Models are up-to-date!` :
    justFinished === 'error' ? `${providerTitle} not found!` :
    `Manually refresh ${providerTitle} models.`} />;

};

const RefreshableModels = () => {
  const settingsState = useSettingsState();


  const buttons = refreshableProviderNames.map((providerName) => {
    if (!settingsState.settingsOfProvider[providerName]._didFillInProviderSettings) return null;
    return <RefreshModelButton key={providerName} providerName={providerName} />;
  });

  return <>
		{buttons}
	</>;

};



export const AnimatedCheckmarkButton = ({ text, className }: {text?: string;className?: string;}) => {
  const [dashOffset, setDashOffset] = useState(40);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 500; // 500ms animation

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newOffset = 40 - progress * 40;

      setDashOffset(newOffset);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <div
    className={`ainative-flex ainative-items-center ainative-gap-1.5 ainative-w-fit ${
    className ? className : `ainative-px-2 ainative-py-0.5 ainative-text-xs ainative-text-zinc-900 ainative-bg-zinc-100 ainative-rounded-sm`} `}>


		<svg className="ainative-size-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 40,
          strokeDashoffset: dashOffset
        }} />

		</svg>
		{text}
	</div>;
};


const AddButton = ({ disabled, text = 'Add', ...props }: {disabled?: boolean;text?: React.ReactNode;} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

  return <button
    disabled={disabled}
    className={`ainative-bg-[#0e70c0] ainative-px-3 ainative-py-1 ainative-text-white ainative-rounded-sm ${!disabled ? "hover:ainative-bg-[#1177cb] ainative-cursor-pointer" : "ainative-opacity-50 ainative-cursor-not-allowed ainative-bg-opacity-70"}`}
    {...props}>
    {text}</button>;

};

// ConfirmButton prompts for a second click to confirm an action, cancels if clicking outside
const ConfirmButton = ({ children, onConfirm, className }: {children: React.ReactNode;onConfirm: () => void;className?: string;}) => {
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!confirm) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setConfirm(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [confirm]);
  return (
    <div ref={ref} className={`ainative-inline-block`}>
			<VoidButtonBgDarken className={className} onClick={() => {
        if (!confirm) {
          setConfirm(true);
        } else {
          onConfirm();
          setConfirm(false);
        }
      }}>
				{confirm ? `Confirm Reset` : children}
			</VoidButtonBgDarken>
		</div>);

};

// ---------------- Simplified Model Settings Dialog ------------------

// keys of ModelOverrides we allow the user to override



// This new dialog replaces the verbose UI with a single JSON override box.
const SimpleModelSettingsDialog = ({
  isOpen,
  onClose,
  modelInfo




}: {isOpen: boolean;onClose: () => void;modelInfo: {modelName: string;providerName: ProviderName;type: 'autodetected' | 'custom' | 'default';} | null;}) => {
  if (!isOpen || !modelInfo) return null;

  const { modelName, providerName, type } = modelInfo;
  const accessor = useAccessor();
  const settingsState = useSettingsState();
  const mouseDownInsideModal = useRef(false); // Ref to track mousedown origin
  const settingsStateService = accessor.get('IAINativeSettingsService');

  // current overrides and defaults
  const defaultModelCapabilities = getModelCapabilities(providerName, modelName, undefined);
  const currentOverrides = settingsState.overridesOfModel?.[providerName]?.[modelName] ?? undefined;
  const { recognizedModelName, isUnrecognizedModel } = defaultModelCapabilities;

  // Create the placeholder with the default values for allowed keys
  const partialDefaults: Partial<ModelOverrides> = {};
  for (const k of modelOverrideKeys) {if (defaultModelCapabilities[k]) partialDefaults[k] = defaultModelCapabilities[k] as any;}
  const placeholder = JSON.stringify(partialDefaults, null, 2);

  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(() => !!currentOverrides);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // reset when dialog toggles
  useEffect(() => {
    if (!isOpen) return;
    const cur = settingsState.overridesOfModel?.[providerName]?.[modelName];
    setOverrideEnabled(!!cur);
    setErrorMsg(null);
  }, [isOpen, providerName, modelName, settingsState.overridesOfModel, placeholder]);

  const onSave = async () => {
    // if disabled override, reset overrides
    if (!overrideEnabled) {
      await settingsStateService.setOverridesOfModel(providerName, modelName, undefined);
      onClose();
      return;
    }

    // enabled overrides
    // parse json
    let parsedInput: Record<string, unknown>;

    if (textAreaRef.current?.value) {
      try {
        parsedInput = JSON.parse(textAreaRef.current.value);
      } catch (e) {
        setErrorMsg('Invalid JSON');
        return;
      }
    } else {
      setErrorMsg('Invalid JSON');
      return;
    }

    // only keep allowed keys
    const cleaned: Partial<ModelOverrides> = {};
    for (const k of modelOverrideKeys) {
      if (!(k in parsedInput)) continue;
      const isEmpty = parsedInput[k] === '' || parsedInput[k] === null || parsedInput[k] === undefined;
      if (!isEmpty) {
        cleaned[k] = parsedInput[k] as any;
      }
    }
    await settingsStateService.setOverridesOfModel(providerName, modelName, cleaned);
    onClose();
  };

  const sourcecodeOverridesLink = `https://github.com/voideditor/void/blob/2e5ecb291d33afbe4565921664fb7e183189c1c5/src/vs/workbench/contrib/void/common/modelCapabilities.ts#L146-L172`;

  return (
    <div // Backdrop
    className="ainative-fixed ainative-inset-0 ainative-bg-black/50 ainative-flex ainative-items-center ainative-justify-center ainative-z-[9999999]"
    onMouseDown={() => {
      mouseDownInsideModal.current = false;
    }}
    onMouseUp={() => {
      if (!mouseDownInsideModal.current) {
        onClose();
      }
      mouseDownInsideModal.current = false;
    }}>

			{/* MODAL */}
			<div
        className="ainative-bg-void-bg-1 ainative-rounded-md ainative-p-4 ainative-max-w-xl ainative-w-full ainative-shadow-xl ainative-overflow-y-auto ainative-max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Keep stopping propagation for normal clicks inside
        onMouseDown={(e) => {
          mouseDownInsideModal.current = true;
          e.stopPropagation();
        }}>

				<div className="ainative-flex ainative-justify-between ainative-items-center ainative-mb-4">
					<h3 className="ainative-text-lg ainative-font-medium">
						Change Defaults for {modelName} ({displayInfoOfProviderName(providerName).title})
					</h3>
					<button
            onClick={onClose}
            className="ainative-text-void-fg-3 hover:ainative-text-void-fg-1">

						<X className="ainative-size-5" />
					</button>
				</div>

				{/* Display model recognition status */}
				<div className="ainative-text-sm ainative-text-void-fg-3 ainative-mb-4">
					{type === 'default' ? `${modelName} comes packaged with AINative Studio, so you shouldn't need to change these settings.` :
          isUnrecognizedModel ?
          `Model not recognized by AINative Studio.` :
          `AINative Studio recognizes ${modelName} ("${recognizedModelName}").`}
				</div>


				{/* override toggle */}
				<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-mb-4">
					<VoidSwitch size='xs' value={overrideEnabled} onChange={setOverrideEnabled} />
					<span className="ainative-text-void-fg-3 ainative-text-sm">Override model defaults</span>
				</div>

				{/* Informational link */}
				{overrideEnabled && <div className="ainative-text-sm ainative-text-void-fg-3 ainative-mb-4">
					<ChatMarkdownRender string={`See the [sourcecode](${sourcecodeOverridesLink}) for a reference on how to set this JSON (advanced).`} chatMessageLocation={undefined} />
				</div>}

				<textarea
          key={overrideEnabled + ''}
          ref={textAreaRef}
          className={`ainative-w-full ainative-min-h-[200px] ainative-p-2 ainative-rounded-sm ainative-border ainative-border-void-border-2 ainative-bg-void-bg-2 ainative-resize-none ainative-font-mono ainative-text-sm ${!overrideEnabled ? "ainative-text-void-fg-3" : ""}`}
          defaultValue={overrideEnabled && currentOverrides ? JSON.stringify(currentOverrides, null, 2) : placeholder}
          placeholder={placeholder}
          readOnly={!overrideEnabled} />

				{errorMsg &&
        <div className="ainative-text-red-500 ainative-mt-2 ainative-text-sm">{errorMsg}</div>
        }


				<div className="ainative-flex ainative-justify-end ainative-gap-2 ainative-mt-4">
					<VoidButtonBgDarken onClick={onClose} className="ainative-px-3 ainative-py-1">
						Cancel
					</VoidButtonBgDarken>
					<VoidButtonBgDarken
            onClick={onSave}
            className="ainative-px-3 ainative-py-1 ainative-bg-[#0e70c0] ainative-text-white">

						Save
					</VoidButtonBgDarken>
				</div>
			</div>
		</div>);

};




export const ModelDump = ({ filteredProviders }: {filteredProviders?: ProviderName[];}) => {
  const accessor = useAccessor();
  const settingsStateService = accessor.get('IAINativeSettingsService');
  const settingsState = useSettingsState();

  // State to track which model's settings dialog is open
  const [openSettingsModel, setOpenSettingsModel] = useState<{
    modelName: string;
    providerName: ProviderName;
    type: 'autodetected' | 'custom' | 'default';
  } | null>(null);

  // States for add model functionality
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [userChosenProviderName, setUserChosenProviderName] = useState<ProviderName | null>(null);
  const [modelName, setModelName] = useState<string>('');
  const [errorString, setErrorString] = useState('');

  // a dump of all the enabled providers' models
  const modelDump: (VoidStatefulModelInfo & {providerName: ProviderName;providerEnabled: boolean;})[] = [];

  // Use either filtered providers or all providers
  const providersToShow = filteredProviders || providerNames;

  for (let providerName of providersToShow) {
    const providerSettings = settingsState.settingsOfProvider[providerName];
    // if (!providerSettings.enabled) continue
    modelDump.push(...providerSettings.models.map((model) => ({ ...model, providerName, providerEnabled: !!providerSettings._didFillInProviderSettings })));
  }

  // sort by hidden
  modelDump.sort((a, b) => {
    return Number(b.providerEnabled) - Number(a.providerEnabled);
  });

  // Add model handler
  const handleAddModel = () => {
    if (!userChosenProviderName) {
      setErrorString('Please select a provider.');
      return;
    }
    if (!modelName) {
      setErrorString('Please enter a model name.');
      return;
    }

    // Check if model already exists
    if (settingsState.settingsOfProvider[userChosenProviderName].models.find((m) => m.modelName === modelName)) {
      setErrorString(`This model already exists.`);
      return;
    }

    settingsStateService.addModel(userChosenProviderName, modelName);
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
      setIsAddModelOpen(false);
      setUserChosenProviderName(null);
      setModelName('');
    }, 1500);
    setErrorString('');
  };

  return <div className="">
		{modelDump.map((m, i) => {
      const { isHidden, type, modelName, providerName, providerEnabled } = m;

      const isNewProviderName = (i > 0 ? modelDump[i - 1] : undefined)?.providerName !== providerName;

      const providerTitle = displayInfoOfProviderName(providerName).title;

      const disabled = !providerEnabled;
      const value = disabled ? false : !isHidden;

      const tooltipName =
      disabled ? `Add ${providerTitle} to enable` :
      value === true ? 'Show in Dropdown' :
      'Hide from Dropdown';



      const detailAboutModel = type === 'autodetected' ?
      <Asterisk size={14} className="ainative-inline-block ainative-align-text-top ainative-brightness-115 ainative-stroke-[2] ainative-text-[#0e70c0]" data-tooltip-id='ainative-tooltip' data-tooltip-place='right' data-tooltip-content='Detected locally' /> :
      type === 'custom' ?
      <Asterisk size={14} className="ainative-inline-block ainative-align-text-top ainative-brightness-115 ainative-stroke-[2] ainative-text-[#0e70c0]" data-tooltip-id='ainative-tooltip' data-tooltip-place='right' data-tooltip-content='Custom model' /> :
      undefined;

      const hasOverrides = !!settingsState.overridesOfModel?.[providerName]?.[modelName];

      return <div key={`${modelName}${providerName}`}
      className={`ainative-flex ainative-items-center ainative-justify-between ainative-gap-4 hover:ainative-bg-black/10 dark:hover:ainative-bg-gray-300/10 ainative-py-1 ainative-px-3 ainative-rounded-sm ainative-overflow-hidden ainative-cursor-default ainative-truncate ainative-group `}>


				{/* left part is width:full */}
				<div className={`ainative-flex ainative-flex-grow ainative-items-center ainative-gap-4`}>
					<span className="ainative-w-full ainative-max-w-32">{isNewProviderName ? providerTitle : ''}</span>
					<span className="ainative-w-fit ainative-max-w-[400px] ainative-truncate">{modelName}</span>
				</div>

				{/* right part is anything that fits */}
				<div className="ainative-flex ainative-items-center ainative-gap-2 ainative-w-fit">

					{/* Advanced Settings button (gear). Hide entirely when provider/model disabled. */}
					{disabled ? null :
          <div className="ainative-w-5 ainative-flex ainative-items-center ainative-justify-center">
							<button
              onClick={() => {setOpenSettingsModel({ modelName, providerName, type });}}
              data-tooltip-id='ainative-tooltip'
              data-tooltip-place='right'
              data-tooltip-content='Advanced Settings'
              className={`${hasOverrides ? "" : "ainative-opacity-0 group-hover:ainative-opacity-100"} ainative-transition-opacity`}>

								<Plus size={12} className="ainative-text-void-fg-3 ainative-opacity-50" />
							</button>
						</div>
          }

					{/* Blue star */}
					{detailAboutModel}


					{/* Switch */}
					<VoidSwitch
            value={value}
            onChange={() => {settingsStateService.toggleModelHidden(providerName, modelName);}}
            disabled={disabled}
            size='sm'

            data-tooltip-id='ainative-tooltip'
            data-tooltip-place='right'
            data-tooltip-content={tooltipName} />


					{/* X button */}
					<div className={`ainative-w-5 ainative-flex ainative-items-center ainative-justify-center`}>
						{type === 'default' || type === 'autodetected' ? null : <button
              onClick={() => {settingsStateService.deleteModel(providerName, modelName);}}
              data-tooltip-id='ainative-tooltip'
              data-tooltip-place='right'
              data-tooltip-content='Delete'
              className={`${hasOverrides ? "" : "ainative-opacity-0 group-hover:ainative-opacity-100"} ainative-transition-opacity`}>

							<X size={12} className="ainative-text-void-fg-3 ainative-opacity-50" />
						</button>}
					</div>
				</div>
			</div>;
    })}

		{/* Add Model Section */}
		{showCheckmark ?
    <div className="ainative-mt-4">
				<AnimatedCheckmarkButton text='Added' className="ainative-bg-[#0e70c0] ainative-text-white ainative-px-3 ainative-py-1 ainative-rounded-sm" />
			</div> :
    isAddModelOpen ?
    <div className="ainative-mt-4">
				<form className="ainative-flex ainative-items-center ainative-gap-2">

					{/* Provider dropdown */}
					<ErrorBoundary>
						<VoidCustomDropdownBox
            options={providersToShow}
            selectedOption={userChosenProviderName}
            onChangeOption={(pn) => setUserChosenProviderName(pn)}
            getOptionDisplayName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
            getOptionDropdownName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
            getOptionsEqual={(a, b) => a === b}
            className="ainative-max-w-32 ainative-mx-2 ainative-w-full ainative-resize-none ainative-bg-void-bg-1 ainative-text-void-fg-1 placeholder:ainative-text-void-fg-3 ainative-border ainative-border-void-border-2 focus:ainative-border-void-border-1 ainative-py-1 ainative-px-2 ainative-rounded"
            arrowTouchesText={false} />

					</ErrorBoundary>

					{/* Model name input */}
					<ErrorBoundary>
						<VoidSimpleInputBox
            value={modelName}
            compact={true}
            onChangeValue={setModelName}
            placeholder='Model Name'
            className="ainative-max-w-32" />

					</ErrorBoundary>

					{/* Add button */}
					<ErrorBoundary>
						<AddButton
            type='button'
            disabled={!modelName || !userChosenProviderName}
            onClick={handleAddModel} />

					</ErrorBoundary>

					{/* X button to cancel */}
					<button
          type="button"
          onClick={() => {
            setIsAddModelOpen(false);
            setErrorString('');
            setModelName('');
            setUserChosenProviderName(null);
          }}
          className="ainative-text-void-fg-4">

						<X className="ainative-size-4" />
					</button>
				</form>

				{errorString &&
      <div className="ainative-text-red-500 ainative-truncate ainative-whitespace-nowrap ainative-mt-1">
						{errorString}
					</div>
      }
			</div> :

    <div
      className="ainative-text-void-fg-4 ainative-flex ainative-flex-nowrap ainative-text-nowrap ainative-items-center hover:ainative-brightness-110 ainative-cursor-pointer ainative-mt-4"
      onClick={() => setIsAddModelOpen(true)}>

				<div className="ainative-flex ainative-items-center ainative-gap-1">
					<Plus size={16} />
					<span>Add a model</span>
				</div>
			</div>
    }

		{/* Model Settings Dialog */}
		<SimpleModelSettingsDialog
      isOpen={openSettingsModel !== null}
      onClose={() => setOpenSettingsModel(null)}
      modelInfo={openSettingsModel} />

	</div>;
};



// providers

const ProviderSetting = ({ providerName, settingName, subTextMd }: {providerName: ProviderName;settingName: SettingName;subTextMd: React.ReactNode;}) => {

  const { title: settingTitle, placeholder, isPasswordField } = displayInfoOfSettingName(providerName, settingName);

  const accessor = useAccessor();
  const voidSettingsService = accessor.get('IAINativeSettingsService');
  const settingsState = useSettingsState();

  const settingValue = settingsState.settingsOfProvider[providerName][settingName] as string; // this should always be a string in this component
  if (typeof settingValue !== 'string') {
    console.log('Error: Provider setting had a non-string value.');
    return;
  }

  // Create a stable callback reference using useCallback with proper dependencies
  const handleChangeValue = useCallback((newVal: string) => {
    voidSettingsService.setSettingOfProvider(providerName, settingName, newVal);
  }, [voidSettingsService, providerName, settingName]);

  return <ErrorBoundary>
		<div className="ainative-my-1">
			<VoidSimpleInputBox
        value={settingValue}
        onChangeValue={handleChangeValue}
        placeholder={`${settingTitle} (${placeholder})`}
        passwordBlur={isPasswordField}
        compact={true} />

			{!subTextMd ? null : <div className="ainative-py-1 ainative-px-3 ainative-opacity-50 ainative-text-sm">
				{subTextMd}
			</div>}
		</div>
	</ErrorBoundary>;
};

// const OldSettingsForProvider = ({ providerName, showProviderTitle }: { providerName: ProviderName, showProviderTitle: boolean }) => {
// 	const voidSettingsState = useSettingsState()

// 	const needsModel = isProviderNameDisabled(providerName, voidSettingsState) === 'addModel'

// 	// const accessor = useAccessor()
// 	// const voidSettingsService = accessor.get('IAINativeSettingsService')

// 	// const { enabled } = voidSettingsState.settingsOfProvider[providerName]
// 	const settingNames = customSettingNamesOfProvider(providerName)

// 	const { title: providerTitle } = displayInfoOfProviderName(providerName)

// 	return <div className='my-4'>

// 		<div className='flex items-center w-full gap-4'>
// 			{showProviderTitle && <h3 className='text-xl truncate'>{providerTitle}</h3>}

// 			{/* enable provider switch */}
// 			{/* <VoidSwitch
// 				value={!!enabled}
// 				onChange={
// 					useCallback(() => {
// 						const enabledRef = voidSettingsService.state.settingsOfProvider[providerName].enabled
// 						voidSettingsService.setSettingOfProvider(providerName, 'enabled', !enabledRef)
// 					}, [voidSettingsService, providerName])}
// 				size='sm+'
// 			/> */}
// 		</div>

// 		<div className='px-0'>
// 			{/* settings besides models (e.g. api key) */}
// 			{settingNames.map((settingName, i) => {
// 				return <ProviderSetting key={settingName} providerName={providerName} settingName={settingName} />
// 			})}

// 			{needsModel ?
// 				providerName === 'ollama' ?
// 					<WarningBox text={`Please install an Ollama model. We'll auto-detect it.`} />
// 					: <WarningBox text={`Please add a model for ${providerTitle} (Models section).`} />
// 				: null}
// 		</div>
// 	</div >
// }


export const SettingsForProvider = ({ providerName, showProviderTitle, showProviderSuggestions }: {providerName: ProviderName;showProviderTitle: boolean;showProviderSuggestions: boolean;}) => {
  const voidSettingsState = useSettingsState();

  const needsModel = isProviderNameDisabled(providerName, voidSettingsState) === 'addModel';

  // const accessor = useAccessor()
  // const voidSettingsService = accessor.get('IAINativeSettingsService')

  // const { enabled } = voidSettingsState.settingsOfProvider[providerName]
  const settingNames = customSettingNamesOfProvider(providerName);

  const { title: providerTitle } = displayInfoOfProviderName(providerName);

  return <div>

		<div className="ainative-flex ainative-items-center ainative-w-full ainative-gap-4">
			{showProviderTitle && <h3 className="ainative-text-xl ainative-truncate">{providerTitle}</h3>}

			{/* enable provider switch */}
			{/* <VoidSwitch
        value={!!enabled}
        onChange={
        	useCallback(() => {
        		const enabledRef = voidSettingsService.state.settingsOfProvider[providerName].enabled
        		voidSettingsService.setSettingOfProvider(providerName, 'enabled', !enabledRef)
        	}, [voidSettingsService, providerName])}
        size='sm+'
        /> */}
		</div>

		<div className="ainative-px-0">
			{/* settings besides models (e.g. api key) */}
			{settingNames.map((settingName, i) => {

        return <ProviderSetting
          key={settingName}
          providerName={providerName}
          settingName={settingName}
          subTextMd={i !== settingNames.length - 1 ? null :
          <ChatMarkdownRender string={subTextMdOfProviderName(providerName)} chatMessageLocation={undefined} />} />;

      })}

			{showProviderSuggestions && needsModel ?
      providerName === 'ollama' ?
      <WarningBox className="ainative-pl-2 ainative-mb-4" text={`Please install an Ollama model. We'll auto-detect it.`} /> :
      <WarningBox className="ainative-pl-2 ainative-mb-4" text={`Please add a model for ${providerTitle} (Models section).`} /> :
      null}
		</div>
	</div>;
};


export const VoidProviderSettings = ({ providerNames }: {providerNames: ProviderName[];}) => {
  return <>
		{providerNames.map((providerName) =>
    <SettingsForProvider key={providerName} providerName={providerName} showProviderTitle={true} showProviderSuggestions={true} />
    )}
	</>;
};


type TabName = 'models' | 'general';
export const AutoDetectLocalModelsToggle = () => {
  const settingName: GlobalSettingName = 'autoRefreshModels';

  const accessor = useAccessor();
  const voidSettingsService = accessor.get('IAINativeSettingsService');
  const metricsService = accessor.get('IMetricsService');

  const voidSettingsState = useSettingsState();

  // right now this is just `enabled_autoRefreshModels`
  const enabled = voidSettingsState.globalSettings[settingName];

  return <ButtonLeftTextRightOption
    leftButton={<VoidSwitch
      size='xxs'
      value={enabled}
      onChange={(newVal) => {
        voidSettingsService.setGlobalSetting(settingName, newVal);
        metricsService.capture('Click', { action: 'Autorefresh Toggle', settingName, enabled: newVal });
      }} />
    }
    text={`Automatically detect local providers and models (${refreshableProviderNames.map((providerName) => displayInfoOfProviderName(providerName).title).join(', ')}).`} />;



};

export const AIInstructionsBox = () => {
  const accessor = useAccessor();
  const voidSettingsService = accessor.get('IAINativeSettingsService');
  const voidSettingsState = useSettingsState();
  return <VoidInputBox2
    className="ainative-min-h-[81px] ainative-p-3 ainative-rounded-sm"
    initValue={voidSettingsState.globalSettings.aiInstructions}
    placeholder={`Do not change my indentation or delete my comments. When writing TS or JS, do not add ;'s. Write new code using Rust if possible. `}
    multiline
    onChangeText={(newText) => {
      voidSettingsService.setGlobalSetting('aiInstructions', newText);
    }} />;

};

const FastApplyMethodDropdown = () => {
  const accessor = useAccessor();
  const voidSettingsService = accessor.get('IAINativeSettingsService');

  const options = useMemo(() => [true, false], []);

  const onChangeOption = useCallback((newVal: boolean) => {
    voidSettingsService.setGlobalSetting('enableFastApply', newVal);
  }, [voidSettingsService]);

  return <VoidCustomDropdownBox
    className="ainative-text-xs ainative-text-void-fg-3 ainative-bg-void-bg-1 ainative-border ainative-border-void-border-1 ainative-rounded ainative-p-0.5 ainative-px-1"
    options={options}
    selectedOption={voidSettingsService.state.globalSettings.enableFastApply}
    onChangeOption={onChangeOption}
    getOptionDisplayName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
    getOptionDropdownName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
    getOptionDropdownDetail={(val) => val ? 'Output Search/Replace blocks' : 'Rewrite whole files'}
    getOptionsEqual={(a, b) => a === b} />;


};


export const OllamaSetupInstructions = ({ sayWeAutoDetect }: {sayWeAutoDetect?: boolean;}) => {
  return <div className="prose-p:ainative-my-0 prose-ol:ainative-list-decimal prose-p:ainative-py-0 prose-ol:ainative-my-0 prose-ol:ainative-py-0 prose-span:ainative-my-0 prose-span:ainative-py-0 ainative-text-void-fg-3 ainative-text-sm ainative-list-decimal ainative-select-text">
		<div className=""><ChatMarkdownRender string={`Ollama Setup Instructions`} chatMessageLocation={undefined} /></div>
		<div className=" ainative-pl-6"><ChatMarkdownRender string={`1. Download [Ollama](https://ollama.com/download).`} chatMessageLocation={undefined} /></div>
		<div className=" ainative-pl-6"><ChatMarkdownRender string={`2. Open your terminal.`} chatMessageLocation={undefined} /></div>
		<div
      className="ainative-pl-6 ainative-flex ainative-items-center ainative-w-fit"
      data-tooltip-id='ainative-tooltip-ollama-settings'>

			<ChatMarkdownRender string={`3. Run \`ollama pull your_model\` to install a model.`} chatMessageLocation={undefined} />
		</div>
		{sayWeAutoDetect && <div className=" ainative-pl-6"><ChatMarkdownRender string={`AINative Studio automatically detects locally running models and enables them.`} chatMessageLocation={undefined} /></div>}
	</div>;
};


const RedoOnboardingButton = ({ className }: {className?: string;}) => {
  const accessor = useAccessor();
  const voidSettingsService = accessor.get('IAINativeSettingsService');
  return <div
    className={`ainative-text-void-fg-4 ainative-flex ainative-flex-nowrap ainative-text-nowrap ainative-items-center hover:ainative-brightness-110 ainative-cursor-pointer ${className}`}
    onClick={() => {voidSettingsService.setGlobalSetting('isOnboardingComplete', false);}}>

		See onboarding screen?
	</div>;

};







export const ToolApprovalTypeSwitch = ({ approvalType, size, desc }: {approvalType: ToolApprovalType;size: "xxs" | "xs" | "sm" | "sm+" | "md";desc: string;}) => {
  const accessor = useAccessor();
  const voidSettingsService = accessor.get('IAINativeSettingsService');
  const voidSettingsState = useSettingsState();
  const metricsService = accessor.get('IMetricsService');

  const onToggleAutoApprove = useCallback((approvalType: ToolApprovalType, newValue: boolean) => {
    voidSettingsService.setGlobalSetting('autoApprove', {
      ...voidSettingsService.state.globalSettings.autoApprove,
      [approvalType]: newValue
    });
    metricsService.capture('Tool Auto-Accept Toggle', { enabled: newValue });
  }, [voidSettingsService, metricsService]);

  return <>
		<VoidSwitch
      size={size}
      value={voidSettingsState.globalSettings.autoApprove[approvalType] ?? false}
      onChange={(newVal) => onToggleAutoApprove(approvalType, newVal)} />

		<span className="ainative-text-void-fg-3 ainative-text-xs">{desc}</span>
	</>;
};



export const OneClickSwitchButton = ({ fromEditor = 'VS Code', className = '' }: {fromEditor?: TransferEditorType;className?: string;}) => {
  const accessor = useAccessor();
  const extensionTransferService = accessor.get('IExtensionTransferService');

  const [transferState, setTransferState] = useState<{type: 'done';error?: string;} | {type: 'loading' | 'justfinished';}>({ type: 'done' });



  const onClick = async () => {
    if (transferState.type !== 'done') return;

    setTransferState({ type: 'loading' });

    const errAcc = await extensionTransferService.transferExtensions(os, fromEditor);

    // Even if some files were missing, consider it a success if no actual errors occurred
    const hadError = !!errAcc;
    if (hadError) {
      setTransferState({ type: 'done', error: errAcc });
    } else
    {
      setTransferState({ type: 'justfinished' });
      setTimeout(() => {setTransferState({ type: 'done' });}, 3000);
    }
  };

  return <>
		<VoidButtonBgDarken className={`ainative-max-w-48 ainative-p-4 ${className}`} disabled={transferState.type !== 'done'} onClick={onClick}>
			{transferState.type === 'done' ? `Transfer from ${fromEditor}` :
      transferState.type === 'loading' ? <span className="ainative-text-nowrap ainative-flex ainative-flex-nowrap">Transferring<IconLoading /></span> :
      transferState.type === 'justfinished' ? <AnimatedCheckmarkButton text='Settings Transferred' className="ainative-bg-none" /> :
      null
      }
		</VoidButtonBgDarken>
		{transferState.type === 'done' && transferState.error ? <WarningBox text={transferState.error} /> : null}
	</>;
};


// full settings

// MCP Server component
const MCPServerComponent = ({ name, server }: {name: string;server: MCPServer;}) => {
  const accessor = useAccessor();
  const mcpService = accessor.get('IMCPService');

  const voidSettings = useSettingsState();
  const isOn = voidSettings.mcpUserStateOfName[name]?.isOn;

  const removeUniquePrefix = (name: string) => name.split('_').slice(1).join('_');

  return (
    <div className="ainative-border ainative-border-void-border-2 ainative-bg-void-bg-1 ainative-py-3 ainative-px-4 ainative-rounded-sm ainative-my-2">
			<div className="ainative-flex ainative-items-center ainative-justify-between">
				{/* Left side - status and name */}
				<div className="ainative-flex ainative-items-center ainative-gap-2">
					{/* Status indicator */}
					<div className={`ainative-w-2 ainative-h-2 ainative-rounded-full ${
          server.status === 'success' ? "ainative-bg-green-500" :
          server.status === 'error' ? "ainative-bg-red-500" :
          server.status === 'loading' ? "ainative-bg-yellow-500" :
          server.status === 'offline' ? "ainative-bg-void-fg-3" : ""} `}>

          </div>

					{/* Server name */}
					<div className="ainative-text-sm ainative-font-medium ainative-text-void-fg-1">{name}</div>
				</div>

				{/* Right side - power toggle switch */}
				<VoidSwitch
          value={isOn ?? false}
          size='xs'
          disabled={server.status === 'error'}
          onChange={() => mcpService.toggleServerIsOn(name, !isOn)} />

			</div>

			{/* Tools section */}
			{isOn &&
      <div className="ainative-mt-3">
					<div className="ainative-flex ainative-flex-wrap ainative-gap-2 ainative-max-h-32 ainative-overflow-y-auto">
						{(server.tools ?? []).length > 0 ?
          (server.tools ?? []).map((tool: {name: string;description?: string;}) =>
          <span
            key={tool.name}
            className="ainative-px-2 ainative-py-0.5 ainative-bg-void-bg-2 ainative-text-void-fg-3 ainative-rounded-sm ainative-text-xs"

            data-tooltip-id='ainative-tooltip'
            data-tooltip-content={tool.description || ''}
            data-tooltip-class-name='void-max-w-[300px]'>

									{removeUniquePrefix(tool.name)}
								</span>
          ) :

          <span className="ainative-text-xs ainative-text-void-fg-3">No tools available</span>
          }
					</div>
				</div>
      }

			{/* Command badge */}
			{isOn && server.command &&
      <div className="ainative-mt-3">
					<div className="ainative-text-xs ainative-text-void-fg-3 ainative-mb-1">Command:</div>
					<div className="ainative-px-2 ainative-py-1 ainative-bg-void-bg-2 ainative-text-xs ainative-font-mono ainative-overflow-x-auto ainative-whitespace-nowrap ainative-text-void-fg-2 ainative-rounded-sm">
						{server.command}
					</div>
				</div>
      }

			{/* Error message if present */}
			{server.error &&
      <div className="ainative-mt-3">
					<WarningBox text={server.error} />
				</div>
      }
		</div>);

};

// Main component that renders the list of servers
const MCPServersList = () => {
  const mcpServiceState = useMCPServiceState();

  let content: React.ReactNode;
  if (mcpServiceState.error) {
    content = <div className="ainative-text-void-fg-3 ainative-text-sm ainative-mt-2">
			{mcpServiceState.error}
		</div>;
  } else
  {
    const entries = Object.entries(mcpServiceState.mcpServerOfName);
    if (entries.length === 0) {
      content = <div className="ainative-text-void-fg-3 ainative-text-sm ainative-mt-2">
				No servers found
			</div>;
    } else
    {
      content = entries.map(([name, server]) =>
      <MCPServerComponent key={name} name={name} server={server} />
      );
    }
  }

  return <div className="ainative-my-2">{content}</div>;
};

export const Settings = () => {
  const isDark = useIsDark();
  const auth = useAINativeAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ─── sidebar nav ──────────────────────────
  const [selectedSection, setSelectedSection] =
  useState<Tab>('models');

  const navItems: {tab: Tab;label: string;}[] = [
  { tab: 'models', label: 'Models' },
  { tab: 'localProviders', label: 'Local Providers' },
  { tab: 'providers', label: 'Main Providers' },
  { tab: 'featureOptions', label: 'Feature Options' },
  { tab: 'general', label: 'General' },
  { tab: 'mcp', label: 'MCP' },
  { tab: 'all', label: 'All Settings' }];

  const shouldShowTab = (tab: Tab) => selectedSection === 'all' || selectedSection === tab;
  const accessor = useAccessor();
  const commandService = accessor.get('ICommandService');
  const environmentService = accessor.get('IEnvironmentService');
  const nativeHostService = accessor.get('INativeHostService');
  const settingsState = useSettingsState();
  const voidSettingsService = accessor.get('IAINativeSettingsService');
  const chatThreadsService = accessor.get('IChatThreadService');
  const notificationService = accessor.get('INotificationService');
  const mcpService = accessor.get('IMCPService');
  const storageService = accessor.get('IStorageService');
  const metricsService = accessor.get('IMetricsService');
  const isOptedOut = useIsOptedOut();

  const onDownload = (t: 'Chats' | 'Settings') => {
    let dataStr: string;
    let downloadName: string;
    if (t === 'Chats') {
      // Export chat threads
      dataStr = JSON.stringify(chatThreadsService.state, null, 2);
      downloadName = 'void-chats.json';
    } else
    if (t === 'Settings') {
      // Export user settings
      dataStr = JSON.stringify(voidSettingsService.state, null, 2);
      downloadName = 'void-settings.json';
    } else
    {
      dataStr = '';
      downloadName = '';
    }

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  };


  // Add file input refs
  const fileInputSettingsRef = useRef<HTMLInputElement>(null);
  const fileInputChatsRef = useRef<HTMLInputElement>(null);

  const [s, ss] = useState(0);

  const handleUpload = (t: 'Chats' | 'Settings') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);

        if (t === 'Chats') {
          chatThreadsService.dangerousSetState(json as any);
        } else
        if (t === 'Settings') {
          voidSettingsService.dangerousSetState(json as any);
        }

        notificationService.info(`${t} imported successfully!`);
      } catch (err) {
        notificationService.notify({ message: `Failed to import ${t}`, source: err + '', severity: Severity.Error });
      }
    };
    reader.readAsText(file);
    e.target.value = '';

    ss((s) => s + 1);
  };


  return (
    <div className={`void-scope ${isDark ? "ainative-dark" : ""}`} style={{ height: '100%', width: '100%', overflow: 'auto' }}>
			<div className="ainative-flex ainative-flex-col md:ainative-flex-row ainative-w-full ainative-gap-6 ainative-max-w-[900px] ainative-mx-auto ainative-mb-32" style={{ minHeight: '80vh' }}>
				{/* ──────────────  SIDEBAR  ────────────── */}

				<aside className="md:ainative-w-1/4 ainative-w-full ainative-p-6 ainative-shrink-0">
					{/* vertical tab list */}
					<div className="ainative-flex ainative-flex-col ainative-gap-2 ainative-mt-12">
						{navItems.map(({ tab, label }) =>
            <button
              key={tab}
              onClick={() => {
                if (tab === 'all') {
                  setSelectedSection('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setSelectedSection(tab);
                }
              }}
              className={` ainative-py-2 ainative-px-4 ainative-rounded-md ainative-text-left ainative-transition-all ainative-duration-200 ${

              selectedSection === tab ? "ainative-bg-[#0e70c0]/80 ainative-text-white ainative-font-medium ainative-shadow-sm" : "ainative-bg-void-bg-2 hover:ainative-bg-void-bg-2/80 ainative-text-void-fg-1"} `}>




								{label}
							</button>
            )}
					</div>
				</aside>

				{/* ───────────── MAIN PANE ───────────── */}
				<main className="ainative-flex-1 ainative-p-6 ainative-select-none">



					<div className="ainative-max-w-3xl">

						<h1 className="ainative-text-2xl ainative-w-full">{`AINative Studio Settings`}</h1>

						<div className="ainative-w-full ainative-h-[1px] ainative-my-2" />

						{/* Account Section */}
						<ErrorBoundary>
							<div className="ainative-border ainative-border-void-border-2 ainative-bg-void-bg-1 ainative-py-4 ainative-px-4 ainative-rounded-md ainative-my-4">
								<h3 className="ainative-text-lg ainative-font-medium ainative-mb-3">AINative Cloud Account</h3>

								{auth.isAuthenticated ?
                <div className="ainative-flex ainative-items-center ainative-gap-4">
										<div className="ainative-flex ainative-items-center ainative-gap-3 ainative-flex-1">
											<div className="ainative-w-12 ainative-h-12 ainative-rounded-full ainative-bg-void-bg-2 ainative-flex ainative-items-center ainative-justify-center ainative-overflow-hidden">
												{auth.user?.name ?
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(auth.user.name)}&background=0e70c0&color=fff`}
                        alt='User Avatar'
                        className="ainative-w-full ainative-h-full ainative-object-cover" /> :


                      <span className="ainative-text-void-fg-3 ainative-text-xl">👤</span>
                      }
											</div>
											<div className="ainative-flex ainative-flex-col">
												<div className="ainative-text-void-fg-1 ainative-font-medium">{auth.user?.name || auth.user?.email}</div>
												<div className="ainative-text-void-fg-3 ainative-text-sm">{auth.user?.email}</div>
											</div>
										</div>
										<VoidButtonBgDarken
                    className="ainative-px-4 ainative-py-2"
                    onClick={() => auth.logout()}>

											Sign Out
										</VoidButtonBgDarken>
									</div> :

                <div className="ainative-flex ainative-flex-col ainative-gap-2">
										<p className="ainative-text-void-fg-3 ainative-text-sm ainative-mb-2">
											Sign in to access AINative Cloud models
										</p>
										<VoidButtonBgDarken
                    className="ainative-px-4 ainative-py-2 ainative-w-fit ainative-bg-[#0e70c0] ainative-text-white hover:ainative-bg-[#1177cb]"
                    onClick={() => setShowLoginModal(true)}>

											Sign In to AINative Cloud
										</VoidButtonBgDarken>
									</div>
                }
							</div>
						</ErrorBoundary>

						{/* Models section (formerly FeaturesTab) */}
						<ErrorBoundary>
							<RedoOnboardingButton />
						</ErrorBoundary>

						<div className="ainative-w-full ainative-h-[1px] ainative-my-4" />

						{/* All sections in flex container with gap-12 */}
						<div className="ainative-flex ainative-flex-col ainative-gap-12">
							{/* Models section (formerly FeaturesTab) */}
							<div className={shouldShowTab('models') ? `` : "ainative-hidden"}>
								<ErrorBoundary>
									<h2 className={`ainative-text-3xl ainative-mb-2`}>Models</h2>
									<ModelDump />
									<div className="ainative-w-full ainative-h-[1px] ainative-my-4" />
									<AutoDetectLocalModelsToggle />
									<RefreshableModels />
								</ErrorBoundary>
							</div>

							{/* Local Providers section */}
							<div className={shouldShowTab('localProviders') ? `` : "ainative-hidden"}>
								<ErrorBoundary>
									<h2 className={`ainative-text-3xl ainative-mb-2`}>Local Providers</h2>
									<h3 className={`ainative-text-void-fg-3 ainative-mb-2`}>{`AINative Studio can access any model that you host locally. We automatically detect your local models by default.`}</h3>

									<div className="ainative-opacity-80 ainative-mb-4">
										<OllamaSetupInstructions sayWeAutoDetect={true} />
									</div>

									<VoidProviderSettings providerNames={localProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Main Providers section */}
							<div className={shouldShowTab('providers') ? `` : "ainative-hidden"}>
								<ErrorBoundary>
									<h2 className={`ainative-text-3xl ainative-mb-2`}>Main Providers</h2>
									<h3 className={`ainative-text-void-fg-3 ainative-mb-2`}>{`AINative Studio can access models from Anthropic, OpenAI, OpenRouter, and more.`}</h3>

									<VoidProviderSettings providerNames={nonlocalProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Feature Options section */}
							<div className={shouldShowTab('featureOptions') ? `` : "ainative-hidden"}>
								<ErrorBoundary>
									<h2 className={`ainative-text-3xl ainative-mb-2`}>Feature Options</h2>

									<div className="ainative-flex ainative-flex-col ainative-gap-y-8 ainative-my-4">
										<ErrorBoundary>
											{/* FIM */}
											<div>
												<h4 className={`ainative-text-base`}>{displayInfoOfFeatureName('Autocomplete')}</h4>
												<div className="ainative-text-sm ainative-text-void-fg-3 ainative-mt-1">
													<span>
														Experimental.{' '}
													</span>
													<span
                            className="hover:ainative-brightness-110"
                            data-tooltip-id='ainative-tooltip'
                            data-tooltip-content='We recommend using the largest qwen2.5-coder model you can with Ollama (try qwen2.5-coder:3b).'
                            data-tooltip-class-name='void-max-w-[20px]'>

														Only works with FIM models.*
													</span>
												</div>

												<div className="ainative-my-2">
													{/* Enable Switch */}
													<ErrorBoundary>
														<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
															<VoidSwitch
                                size='xs'
                                value={settingsState.globalSettings.enableAutocomplete}
                                onChange={(newVal) => voidSettingsService.setGlobalSetting('enableAutocomplete', newVal)} />

															<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">{settingsState.globalSettings.enableAutocomplete ? 'Enabled' : 'Disabled'}</span>
														</div>
													</ErrorBoundary>

													{/* Model Dropdown */}
													<ErrorBoundary>
														<div className={`ainative-my-2 ${!settingsState.globalSettings.enableAutocomplete ? "ainative-hidden" : ""}`}>
															<ModelDropdown featureName={'Autocomplete'} className="ainative-text-xs ainative-text-void-fg-3 ainative-bg-void-bg-1 ainative-border ainative-border-void-border-1 ainative-rounded ainative-p-0.5 ainative-px-1" />
														</div>
													</ErrorBoundary>

												</div>

											</div>
										</ErrorBoundary>

										{/* Apply */}
										<ErrorBoundary>

											<div className="ainative-w-full">
												<h4 className={`ainative-text-base`}>{displayInfoOfFeatureName('Apply')}</h4>
												<div className="ainative-text-sm ainative-text-void-fg-3 ainative-mt-1">Settings that control the behavior of the Apply button.</div>

												<div className="ainative-my-2">
													{/* Sync to Chat Switch */}
													<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
														<VoidSwitch
                              size='xs'
                              value={settingsState.globalSettings.syncApplyToChat}
                              onChange={(newVal) => voidSettingsService.setGlobalSetting('syncApplyToChat', newVal)} />

														<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">{settingsState.globalSettings.syncApplyToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													{/* Model Dropdown */}
													<div className={`ainative-my-2 ${settingsState.globalSettings.syncApplyToChat ? "ainative-hidden" : ""}`}>
														<ModelDropdown featureName={'Apply'} className="ainative-text-xs ainative-text-void-fg-3 ainative-bg-void-bg-1 ainative-border ainative-border-void-border-1 ainative-rounded ainative-p-0.5 ainative-px-1" />
													</div>
												</div>


												<div className="ainative-my-2">
													{/* Fast Apply Method Dropdown */}
													<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
														<FastApplyMethodDropdown />
													</div>
												</div>

											</div>
										</ErrorBoundary>




										{/* Tools Section */}
										<div>
											<h4 className={`ainative-text-base`}>Tools</h4>
											<div className="ainative-text-sm ainative-text-void-fg-3 ainative-mt-1">{`Tools are functions that LLMs can call. Some tools require user approval.`}</div>

											<div className="ainative-my-2">
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													{[...toolApprovalTypes].map((approvalType) => {
                            return <div key={approvalType} className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
															<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
														</div>;
                          })}

												</ErrorBoundary>

												{/* Tool Lint Errors Switch */}
												<ErrorBoundary>

													<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
														<VoidSwitch
                              size='xs'
                              value={settingsState.globalSettings.includeToolLintErrors}
                              onChange={(newVal) => voidSettingsService.setGlobalSetting('includeToolLintErrors', newVal)} />

														<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">{settingsState.globalSettings.includeToolLintErrors ? 'Fix lint errors' : `Fix lint errors`}</span>
													</div>
												</ErrorBoundary>

												{/* Auto Accept LLM Changes Switch */}
												<ErrorBoundary>
													<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
														<VoidSwitch
                              size='xs'
                              value={settingsState.globalSettings.autoAcceptLLMChanges}
                              onChange={(newVal) => voidSettingsService.setGlobalSetting('autoAcceptLLMChanges', newVal)} />

														<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">Auto-accept LLM changes</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>



										<div className="ainative-w-full">
											<h4 className={`ainative-text-base`}>Editor</h4>
											<div className="ainative-text-sm ainative-text-void-fg-3 ainative-mt-1">{`Settings that control the visibility of AINative Studio suggestions in the code editor.`}</div>

											<div className="ainative-my-2">
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
														<VoidSwitch
                              size='xs'
                              value={settingsState.globalSettings.showInlineSuggestions}
                              onChange={(newVal) => voidSettingsService.setGlobalSetting('showInlineSuggestions', newVal)} />

														<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">{settingsState.globalSettings.showInlineSuggestions ? 'Show suggestions on select' : 'Show suggestions on select'}</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										{/* SCM */}
										<ErrorBoundary>

											<div className="ainative-w-full">
												<h4 className={`ainative-text-base`}>{displayInfoOfFeatureName('SCM')}</h4>
												<div className="ainative-text-sm ainative-text-void-fg-3 ainative-mt-1">Settings that control the behavior of the commit message generator.</div>

												<div className="ainative-my-2">
													{/* Sync to Chat Switch */}
													<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
														<VoidSwitch
                              size='xs'
                              value={settingsState.globalSettings.syncSCMToChat}
                              onChange={(newVal) => voidSettingsService.setGlobalSetting('syncSCMToChat', newVal)} />

														<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">{settingsState.globalSettings.syncSCMToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													{/* Model Dropdown */}
													<div className={`ainative-my-2 ${settingsState.globalSettings.syncSCMToChat ? "ainative-hidden" : ""}`}>
														<ModelDropdown featureName={'SCM'} className="ainative-text-xs ainative-text-void-fg-3 ainative-bg-void-bg-1 ainative-border ainative-border-void-border-1 ainative-rounded ainative-p-0.5 ainative-px-1" />
													</div>
												</div>

											</div>
										</ErrorBoundary>
									</div>
								</ErrorBoundary>
							</div>

							{/* General section */}
							<div className={`${shouldShowTab('general') ? `` : "ainative-hidden"} ainative-flex ainative-flex-col ainative-gap-12`}>
								{/* One-Click Switch section */}
								<div>
									<ErrorBoundary>
										<h2 className="ainative-text-3xl ainative-mb-2">One-Click Switch</h2>
										<h4 className="ainative-text-void-fg-3 ainative-mb-4">{`Transfer your editor settings into AINative Studio.`}</h4>

										<div className="ainative-flex ainative-flex-col ainative-gap-2">
											<OneClickSwitchButton className="ainative-w-48" fromEditor="VS Code" />
											<OneClickSwitchButton className="ainative-w-48" fromEditor="Cursor" />
											<OneClickSwitchButton className="ainative-w-48" fromEditor="Windsurf" />
										</div>
									</ErrorBoundary>
								</div>

								{/* Import/Export section */}
								<div>
									<h2 className="ainative-text-3xl ainative-mb-2">Import/Export</h2>
									<h4 className="ainative-text-void-fg-3 ainative-mb-4">{`Transfer AINative Studio's settings and chats in and out of AINative Studio.`}</h4>
									<div className="ainative-flex ainative-flex-col ainative-gap-8">
										{/* Settings Subcategory */}
										<div className="ainative-flex ainative-flex-col ainative-gap-2 ainative-max-w-48 ainative-w-full">
											<input key={2 * s} ref={fileInputSettingsRef} type='file' accept='.json' className="ainative-hidden" onChange={handleUpload('Settings')} />
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1 ainative-w-full" onClick={() => {fileInputSettingsRef.current?.click();}}>
												Import Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1 ainative-w-full" onClick={() => onDownload('Settings')}>
												Export Settings
											</VoidButtonBgDarken>
											<ConfirmButton className="ainative-px-4 ainative-py-1 ainative-w-full" onConfirm={() => {voidSettingsService.resetState();}}>
												Reset Settings
											</ConfirmButton>
										</div>

										{/* Chats Subcategory */}
										<div className="ainative-flex ainative-flex-col ainative-gap-2 ainative-max-w-48 ainative-w-full">
											<input key={2 * s + 1} ref={fileInputChatsRef} type='file' accept='.json' className="ainative-hidden" onChange={handleUpload('Chats')} />
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1 ainative-w-full" onClick={() => {fileInputChatsRef.current?.click();}}>
												Import Chats
											</VoidButtonBgDarken>
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1 ainative-w-full" onClick={() => onDownload('Chats')}>
												Export Chats
											</VoidButtonBgDarken>
											<ConfirmButton className="ainative-px-4 ainative-py-1 ainative-w-full" onConfirm={() => {chatThreadsService.resetState();}}>
												Reset Chats
											</ConfirmButton>
										</div>
									</div>
								</div>



								{/* Built-in Settings section */}
								<div>
									<h2 className={`ainative-text-3xl ainative-mb-2`}>Built-in Settings</h2>
									<h4 className={`ainative-text-void-fg-3 ainative-mb-4`}>{`IDE settings, keyboard settings, and theme customization.`}</h4>

									<ErrorBoundary>
										<div className="ainative-flex ainative-flex-col ainative-gap-2 ainative-justify-center ainative-max-w-48 ainative-w-full">
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1" onClick={() => {commandService.executeCommand('workbench.action.openSettings');}}>
												General Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1" onClick={() => {commandService.executeCommand('workbench.action.openGlobalKeybindings');}}>
												Keyboard Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1" onClick={() => {commandService.executeCommand('workbench.action.selectTheme');}}>
												Theme Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken className="ainative-px-4 ainative-py-1" onClick={() => {nativeHostService.showItemInFolder(environmentService.logsHome.fsPath);}}>
												Open Logs
											</VoidButtonBgDarken>
										</div>
									</ErrorBoundary>
								</div>


								{/* Metrics section */}
								<div className="ainative-max-w-[600px]">
									<h2 className={`ainative-text-3xl ainative-mb-2`}>Metrics</h2>
									<h4 className={`ainative-text-void-fg-3 ainative-mb-4`}>Very basic anonymous usage tracking helps us keep AINative Studio running smoothly. You may opt out below. Regardless of this setting, AINative Studio never sees your code, messages, or API keys.</h4>

									<div className="ainative-my-2">
										{/* Disable All Metrics Switch */}
										<ErrorBoundary>
											<div className="ainative-flex ainative-items-center ainative-gap-x-2 ainative-my-2">
												<VoidSwitch
                          size='xs'
                          value={isOptedOut}
                          onChange={(newVal) => {
                            storageService.store(OPT_OUT_KEY, newVal, StorageScope.APPLICATION, StorageTarget.MACHINE);
                            metricsService.capture(`Set metrics opt-out to ${newVal}`, {}); // this only fires if it's enabled, so it's fine to have here
                          }} />

												<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">{'Opt-out (requires restart)'}</span>
											</div>
										</ErrorBoundary>
									</div>
								</div>

								{/* AI Instructions section */}
								<div className="ainative-max-w-[600px]">
									<h2 className={`ainative-text-3xl ainative-mb-2`}>AI Instructions</h2>
									<h4 className={`ainative-text-void-fg-3 ainative-mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
System instructions to include with all AI requests.
Alternatively, place a \`.voidrules\` file in the root of your workspace.
								`} chatMessageLocation={undefined} />
									</h4>
									<ErrorBoundary>
										<AIInstructionsBox />
									</ErrorBoundary>
									{/* --- Disable System Message Toggle --- */}
									<div className="ainative-my-4">
										<ErrorBoundary>
											<div className="ainative-flex ainative-items-center ainative-gap-x-2">
												<VoidSwitch
                          size='xs'
                          value={!!settingsState.globalSettings.disableSystemMessage}
                          onChange={(newValue) => {
                            voidSettingsService.setGlobalSetting('disableSystemMessage', newValue);
                          }} />

												<span className="ainative-text-void-fg-3 ainative-text-xs ainative-pointer-events-none">
													{'Disable system message'}
												</span>
											</div>
										</ErrorBoundary>
										<div className="ainative-text-void-fg-3 ainative-text-xs ainative-mt-1">
											{`When disabled, AINative Studio will not include anything in the system message except for content you specified above.`}
										</div>
									</div>
								</div>

							</div>



							{/* MCP section */}
							<div className={shouldShowTab('mcp') ? `` : "ainative-hidden"}>
								<ErrorBoundary>
									<h2 className="ainative-text-3xl ainative-mb-2">MCP</h2>
									<h4 className={`ainative-text-void-fg-3 ainative-mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
Use Model Context Protocol to provide Agent mode with more tools.
							`} chatMessageLocation={undefined} />
									</h4>
									<div className="ainative-my-2">
										<VoidButtonBgDarken className="ainative-px-4 ainative-py-1 ainative-w-full ainative-max-w-48" onClick={async () => {await mcpService.revealMCPConfigFile();}}>
											Add MCP Server
										</VoidButtonBgDarken>
									</div>

									<ErrorBoundary>
										<MCPServersList />
									</ErrorBoundary>
								</ErrorBoundary>
							</div>





						</div>

					</div>
				</main>
			</div>

			{/* Login Modal */}
			{showLoginModal &&
      <AINativeLoginModal
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false);
        }} />

      }
		</div>);

};