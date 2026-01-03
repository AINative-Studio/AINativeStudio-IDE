/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useCommandBarState, useIsDark } from '../util/services.js';

import '../styles.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';
import { acceptAllBg, acceptBorder, buttonFontSize, buttonTextColor, rejectAllBg, rejectBg, rejectBorder } from '../../../../common/helpers/colors.js';
import { VoidCommandBarProps } from '../../../voidCommandBarService.js';
import { Check, EllipsisVertical, Menu, MoveDown, MoveLeft, MoveRight, MoveUp, X } from 'lucide-react';
import {
  VOID_GOTO_NEXT_DIFF_ACTION_ID,
  VOID_GOTO_PREV_DIFF_ACTION_ID,
  VOID_GOTO_NEXT_URI_ACTION_ID,
  VOID_GOTO_PREV_URI_ACTION_ID,
  VOID_ACCEPT_FILE_ACTION_ID,
  VOID_REJECT_FILE_ACTION_ID,
  VOID_ACCEPT_ALL_DIFFS_ACTION_ID,
  VOID_REJECT_ALL_DIFFS_ACTION_ID } from
'../../../actionIDs.js';

export const VoidCommandBarMain = ({ uri, editor }: VoidCommandBarProps) => {
  const isDark = useIsDark();

  return <div
    className={`void-scope ${isDark ? "ainative-dark" : ""}`}>

		<VoidCommandBar uri={uri} editor={editor} />
	</div>;
};



export const AcceptAllButtonWrapper = ({ text, onClick, className, ...props }: {text: string;onClick: () => void;className?: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
  className={` ainative-px-2 ainative-py-0.5 ainative-flex ainative-items-center ainative-gap-1 ainative-text-white ainative-text-[11px] ainative-text-nowrap ainative-h-full ainative-rounded-none ainative-cursor-pointer ${





  className} `}

  style={{
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: 'none'
  }}
  type='button'
  onClick={onClick}
  {...props}>

		{text ? <span>{text}</span> : <Check size={16} />}
	</button>;


export const RejectAllButtonWrapper = ({ text, onClick, className, ...props }: {text: string;onClick: () => void;className?: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
  className={` ainative-px-2 ainative-py-0.5 ainative-flex ainative-items-center ainative-gap-1 ainative-text-white ainative-text-[11px] ainative-text-nowrap ainative-h-full ainative-rounded-none ainative-cursor-pointer ${





  className} `}

  style={{
    backgroundColor: 'var(--vscode-button-secondaryBackground)',
    color: 'var(--vscode-button-secondaryForeground)',
    border: 'none'
  }}
  type='button'
  onClick={onClick}
  {...props}>

		{text ? <span>{text}</span> : <X size={16} />}
	</button>;




export const VoidCommandBar = ({ uri, editor }: VoidCommandBarProps) => {
  const accessor = useAccessor();
  const editCodeService = accessor.get('IEditCodeService');
  const editorService = accessor.get('ICodeEditorService');
  const metricsService = accessor.get('IMetricsService');
  const commandService = accessor.get('ICommandService');
  const commandBarService = accessor.get('IAINativeCommandBarService');
  const voidModelService = accessor.get('IAINativeModelService');
  const keybindingService = accessor.get('IKeybindingService');
  const { stateOfURI: commandBarState, sortedURIs: sortedCommandBarURIs } = useCommandBarState();
  const [showAcceptRejectAllButtons, setShowAcceptRejectAllButtons] = useState(false);

  // latestUriIdx is used to remember place in leftRight
  const _latestValidUriIdxRef = useRef<number | null>(null);

  // i is the current index of the URI in sortedCommandBarURIs
  const i_ = sortedCommandBarURIs.findIndex((e) => e.fsPath === uri?.fsPath);
  const currFileIdx = i_ === -1 ? null : i_;
  useEffect(() => {
    if (currFileIdx !== null) _latestValidUriIdxRef.current = currFileIdx;
  }, [currFileIdx]);

  const uriIdxInStepper = currFileIdx !== null ? currFileIdx // use currFileIdx if it exists, else use latestNotNullUriIdxRef
  : _latestValidUriIdxRef.current === null ? null :
  _latestValidUriIdxRef.current < sortedCommandBarURIs.length ? _latestValidUriIdxRef.current :
  null;

  // when change URI, scroll to the proper spot
  useEffect(() => {
    setTimeout(() => {
      // check undefined
      if (!uri) return;
      const s = commandBarService.stateOfURI[uri.fsPath];
      if (!s) return;
      const { diffIdx } = s;
      commandBarService.goToDiffIdx(diffIdx ?? 0);
    }, 50);
  }, [uri, commandBarService]);

  if (uri?.scheme !== 'file') return null; // don't show in editors that we made, they must be files

  // Using service methods directly

  const currDiffIdx = uri ? commandBarState[uri.fsPath]?.diffIdx ?? null : null;
  const sortedDiffIds = uri ? commandBarState[uri.fsPath]?.sortedDiffIds ?? [] : [];
  const sortedDiffZoneIds = uri ? commandBarState[uri.fsPath]?.sortedDiffZoneIds ?? [] : [];

  const isADiffInThisFile = sortedDiffIds.length !== 0;
  const isADiffZoneInThisFile = sortedDiffZoneIds.length !== 0;
  const isADiffZoneInAnyFile = sortedCommandBarURIs.length !== 0;

  const streamState = uri ? commandBarService.getStreamState(uri) : null;
  const showAcceptRejectAll = streamState === 'idle-has-changes';

  const nextDiffIdx = commandBarService.getNextDiffIdx(1);
  const prevDiffIdx = commandBarService.getNextDiffIdx(-1);
  const nextURIIdx = commandBarService.getNextUriIdx(1);
  const prevURIIdx = commandBarService.getNextUriIdx(-1);

  const upDownDisabled = prevDiffIdx === null || nextDiffIdx === null;
  const leftRightDisabled = prevURIIdx === null || nextURIIdx === null;

  // accept/reject if current URI has changes
  const onAcceptFile = () => {
    if (!uri) return;
    editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior: 'accept', removeCtrlKs: false, _addToHistory: true });
    metricsService.capture('Accept File', {});
  };
  const onRejectFile = () => {
    if (!uri) return;
    editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior: 'reject', removeCtrlKs: false, _addToHistory: true });
    metricsService.capture('Reject File', {});
  };

  const onAcceptAll = () => {
    commandBarService.acceptOrRejectAllFiles({ behavior: 'accept' });
    metricsService.capture('Accept All', {});
    setShowAcceptRejectAllButtons(false);
  };

  const onRejectAll = () => {
    commandBarService.acceptOrRejectAllFiles({ behavior: 'reject' });
    metricsService.capture('Reject All', {});
    setShowAcceptRejectAllButtons(false);
  };



  const _upKeybinding = keybindingService.lookupKeybinding(VOID_GOTO_PREV_DIFF_ACTION_ID);
  const _downKeybinding = keybindingService.lookupKeybinding(VOID_GOTO_NEXT_DIFF_ACTION_ID);
  const _leftKeybinding = keybindingService.lookupKeybinding(VOID_GOTO_PREV_URI_ACTION_ID);
  const _rightKeybinding = keybindingService.lookupKeybinding(VOID_GOTO_NEXT_URI_ACTION_ID);
  const _acceptFileKeybinding = keybindingService.lookupKeybinding(VOID_ACCEPT_FILE_ACTION_ID);
  const _rejectFileKeybinding = keybindingService.lookupKeybinding(VOID_REJECT_FILE_ACTION_ID);
  const _acceptAllKeybinding = keybindingService.lookupKeybinding(VOID_ACCEPT_ALL_DIFFS_ACTION_ID);
  const _rejectAllKeybinding = keybindingService.lookupKeybinding(VOID_REJECT_ALL_DIFFS_ACTION_ID);

  const upKeybindLabel = editCodeService.processRawKeybindingText(_upKeybinding?.getLabel() || '');
  const downKeybindLabel = editCodeService.processRawKeybindingText(_downKeybinding?.getLabel() || '');
  const leftKeybindLabel = editCodeService.processRawKeybindingText(_leftKeybinding?.getLabel() || '');
  const rightKeybindLabel = editCodeService.processRawKeybindingText(_rightKeybinding?.getLabel() || '');
  const acceptFileKeybindLabel = editCodeService.processRawKeybindingText(_acceptFileKeybinding?.getAriaLabel() || '');
  const rejectFileKeybindLabel = editCodeService.processRawKeybindingText(_rejectFileKeybinding?.getAriaLabel() || '');
  const acceptAllKeybindLabel = editCodeService.processRawKeybindingText(_acceptAllKeybinding?.getAriaLabel() || '');
  const rejectAllKeybindLabel = editCodeService.processRawKeybindingText(_rejectAllKeybinding?.getAriaLabel() || '');


  if (!isADiffZoneInAnyFile) return null;

  // For pages without a current file index, show a simplified command bar
  if (currFileIdx === null) {
    return (
      <div className="ainative-pointer-events-auto">
				<div className="ainative-flex ainative-bg-void-bg-2 ainative-shadow-md ainative-border ainative-border-void-border-2 [&>*:first-child]:ainative-pl-3 [&>*:last-child]:ainative-pr-3 [&>*]:ainative-border-r [&>*]:ainative-border-void-border-2 [&>*:last-child]:ainative-border-r-0">
					<div className="ainative-flex ainative-items-center ainative-px-3">
						<span className="ainative-text-xs ainative-whitespace-nowrap">
							{`${sortedCommandBarURIs.length} file${sortedCommandBarURIs.length === 1 ? '' : 's'} changed`}
						</span>
					</div>
					<button
            className="ainative-text-xs ainative-whitespace-nowrap ainative-cursor-pointer ainative-flex ainative-items-center ainative-justify-center ainative-gap-1 ainative-bg-[var(--vscode-button-background)] ainative-text-[var(--vscode-button-foreground)] hover:ainative-opacity-90 ainative-h-full ainative-px-3"
            onClick={() => commandBarService.goToURIIdx(nextURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(nextURIIdx);
              }
            }}>

						Next <MoveRight className="ainative-size-3 ainative-my-1" />
					</button>
				</div>
			</div>);

  }

  return (
    <div className="ainative-pointer-events-auto">


			{/* Accept All / Reject All buttons that appear when the vertical ellipsis is clicked */}
			{showAcceptRejectAllButtons && showAcceptRejectAll &&
      <div className="ainative-flex ainative-justify-end ainative-mb-1">
					<div className="ainative-inline-flex ainative-bg-void-bg-2 ainative-rounded ainative-shadow-md ainative-border ainative-border-void-border-2 ainative-overflow-hidden">
						<div className="ainative-flex ainative-items-center [&>*]:ainative-border-r [&>*]:ainative-border-void-border-2 [&>*:last-child]:ainative-border-r-0">
							<AcceptAllButtonWrapper
            // text={`Accept All${acceptAllKeybindLabel ? ` ${acceptAllKeybindLabel}` : ''}`}
            text={`Accept All`}
            data-tooltip-id='ainative-tooltip'
            data-tooltip-content={acceptAllKeybindLabel}
            data-tooltip-delay-show={500}
            onClick={onAcceptAll} />

							<RejectAllButtonWrapper
            // text={`Reject All${rejectAllKeybindLabel ? ` ${rejectAllKeybindLabel}` : ''}`}
            text={`Reject All`}
            data-tooltip-id='ainative-tooltip'
            data-tooltip-content={rejectAllKeybindLabel}
            data-tooltip-delay-show={500}
            onClick={onRejectAll} />

						</div>
					</div>
				</div>
      }

			<div className="ainative-flex ainative-items-center ainative-bg-void-bg-2 ainative-rounded ainative-shadow-md ainative-border ainative-border-void-border-2 [&>*:first-child]:ainative-pl-3 [&>*:last-child]:ainative-pr-3 [&>*]:ainative-px-3 [&>*]:ainative-border-r [&>*]:ainative-border-void-border-2 [&>*:last-child]:ainative-border-r-0">

				{/* Diff Navigation Group */}
				<div className="ainative-flex ainative-items-center ainative-py-0.5">
					<button
            className="ainative-cursor-pointer"
            disabled={upDownDisabled}
            onClick={() => commandBarService.goToDiffIdx(prevDiffIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToDiffIdx(prevDiffIdx);
              }
            }}
            data-tooltip-id="ainative-tooltip"
            data-tooltip-content={`${upKeybindLabel ? `${upKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveUp className="ainative-size-3 ainative-transition-opacity ainative-duration-200 ainative-opacity-70 hover:ainative-opacity-100" />
					</button>
					<span className={`ainative-text-xs ainative-whitespace-nowrap ainative-px-1 ${!isADiffInThisFile ? "ainative-opacity-70" : ""}`}>
						{isADiffInThisFile ?
            `Diff ${(currDiffIdx ?? 0) + 1} of ${sortedDiffIds.length}` :
            streamState === 'streaming' ?
            'No changes yet' :
            'No changes'
            }

					</span>
					<button
            className="ainative-cursor-pointer"
            disabled={upDownDisabled}
            onClick={() => commandBarService.goToDiffIdx(nextDiffIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToDiffIdx(nextDiffIdx);
              }
            }}
            data-tooltip-id="ainative-tooltip"
            data-tooltip-content={`${downKeybindLabel ? `${downKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveDown className="ainative-size-3 ainative-transition-opacity ainative-duration-200 ainative-opacity-70 hover:ainative-opacity-100" />
					</button>
				</div>



				{/* File Navigation Group */}
				<div className="ainative-flex ainative-items-center ainative-py-0.5">
					<button
            className="ainative-cursor-pointer"
            disabled={leftRightDisabled}
            onClick={() => commandBarService.goToURIIdx(prevURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(prevURIIdx);
              }
            }}
            data-tooltip-id="ainative-tooltip"
            data-tooltip-content={`${leftKeybindLabel ? `${leftKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveLeft className="ainative-size-3 ainative-transition-opacity ainative-duration-200 ainative-opacity-70 hover:ainative-opacity-100" />
					</button>
					<span className="ainative-text-xs ainative-whitespace-nowrap ainative-px-1 ainative-mx-0.5">
						{currFileIdx !== null ?
            `File ${currFileIdx + 1} of ${sortedCommandBarURIs.length}` :
            `${sortedCommandBarURIs.length} file${sortedCommandBarURIs.length === 1 ? '' : 's'}`
            }
					</span>
					<button
            className="ainative-cursor-pointer"
            disabled={leftRightDisabled}
            onClick={() => commandBarService.goToURIIdx(nextURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(nextURIIdx);
              }
            }}
            data-tooltip-id="ainative-tooltip"
            data-tooltip-content={`${rightKeybindLabel ? `${rightKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveRight className="ainative-size-3 ainative-transition-opacity ainative-duration-200 ainative-opacity-70 hover:ainative-opacity-100" />
					</button>
				</div>


				{/* Accept/Reject buttons - only shown when appropriate */}
				{showAcceptRejectAll &&
        <div className="ainative-flex ainative-self-stretch ainative-gap-0 !ainative-px-0 !ainative-py-0">
						<AcceptAllButtonWrapper
          // text={`Accept File${acceptFileKeybindLabel ? ` ${acceptFileKeybindLabel}` : ''}`}
          text={`Accept File`}
          data-tooltip-id='ainative-tooltip'
          data-tooltip-content={acceptFileKeybindLabel}
          data-tooltip-delay-show={500}
          onClick={onAcceptFile} />

						<RejectAllButtonWrapper
          // text={`Reject File${rejectFileKeybindLabel ? ` ${rejectFileKeybindLabel}` : ''}`}
          text={`Reject File`}
          data-tooltip-id='ainative-tooltip'
          data-tooltip-content={rejectFileKeybindLabel}
          data-tooltip-delay-show={500}
          onClick={onRejectFile} />

					</div>
        }
				{/* Triple colon menu button */}
				{showAcceptRejectAll && <div className="!ainative-px-0 !ainative-py-0 ainative-self-stretch ainative-flex ainative-justify-center ainative-items-center">
					<div
            className="ainative-cursor-pointer ainative-px-1 ainative-self-stretch ainative-flex ainative-justify-center ainative-items-center"
            onClick={() => setShowAcceptRejectAllButtons(!showAcceptRejectAllButtons)}>

						<EllipsisVertical
              className="ainative-size-3" />

					</div>
				</div>}
			</div>
		</div>);

};