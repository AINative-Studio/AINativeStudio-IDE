/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useActiveURI, useIsDark, useSettingsState } from '../util/services.js';

import '../styles.css';
import { VOID_CTRL_K_ACTION_ID, VOID_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { Circle, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AINativeSelectionHelperProps } from '../../../../../../contrib/ainative/browser/ainativeSelectionHelperWidget.js';
import { AINATIVE_OPEN_SETTINGS_ACTION_ID } from '../../../ainativeSettingsPane.js';


export const AINativeSelectionHelperMain = (props: AINativeSelectionHelperProps) => {

  const isDark = useIsDark();

  return <div
    className={`ainative-scope ${isDark ? "ainative-dark" : ""}`}>

		<AINativeSelectionHelper {...props} />
	</div>;
};



const AINativeSelectionHelper = ({ rerenderKey }: AINativeSelectionHelperProps) => {


  const accessor = useAccessor();
  const keybindingService = accessor.get('IKeybindingService');
  const commandService = accessor.get('ICommandService');

  const ctrlLKeybind = keybindingService.lookupKeybinding(VOID_CTRL_L_ACTION_ID);
  const ctrlKKeybind = keybindingService.lookupKeybinding(VOID_CTRL_K_ACTION_ID);

  const dividerHTML = <div className="ainative-w-[0.5px] ainative-bg-ainative-border-3"></div>;

  const [reactRerenderCount, setReactRerenderKey] = useState(rerenderKey);
  const [clickState, setClickState] = useState<'init' | 'clickedOption' | 'clickedMore'>('init');

  useEffect(() => {
    const disposable = commandService.onWillExecuteCommand((e) => {
      if (e.commandId === VOID_CTRL_L_ACTION_ID || e.commandId === VOID_CTRL_K_ACTION_ID) {
        setClickState('clickedOption');
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [commandService, setClickState]);


  // rerender when the key changes
  if (reactRerenderCount !== rerenderKey) {
    setReactRerenderKey(rerenderKey);
    setClickState('init');
  }
  // useEffect(() => {
  // }, [rerenderKey, reactRerenderCount, setReactRerenderKey, setClickState])

  // if the user selected an option, close


  if (clickState === 'clickedOption') {
    return null;
  }

  const defaultHTML = <>
		{ctrlLKeybind &&
    <div
      className=" ainative-flex ainative-items-center ainative-px-2 ainative-py-1.5 ainative-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(VOID_CTRL_L_ACTION_ID);
        setClickState('clickedOption');
      }}>

				<span>Add to Chat</span>
				<span className="ainative-ml-1 ainative-px-1 ainative-rounded ainative-bg-[var(--vscode-keybindingLabel-background)] ainative-text-[var(--vscode-keybindingLabel-foreground)] ainative-border ainative-border-[var(--vscode-keybindingLabel-border)]">
					{ctrlLKeybind.getLabel()}
				</span>
			</div>
    }
		{ctrlLKeybind && ctrlKKeybind &&
    dividerHTML
    }
		{ctrlKKeybind &&
    <div
      className=" ainative-flex ainative-items-center ainative-px-2 ainative-py-1.5 ainative-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(VOID_CTRL_K_ACTION_ID);
        setClickState('clickedOption');
      }}>

				<span className="ainative-ml-1">Edit Inline</span>
				<span className="ainative-ml-1 ainative-px-1 ainative-rounded ainative-bg-[var(--vscode-keybindingLabel-background)] ainative-text-[var(--vscode-keybindingLabel-foreground)] ainative-border ainative-border-[var(--vscode-keybindingLabel-border)]">
					{ctrlKKeybind.getLabel()}
				</span>
			</div>
    }

		{dividerHTML}

		<div
      className=" ainative-flex ainative-items-center ainative-px-0.5 ainative-cursor-pointer "



      onClick={() => {
        setClickState('clickedMore');
      }}>

			<MoreVertical className="ainative-w-4" />
		</div>
	</>;


  const moreOptionsHTML = <>
		<div
      className=" ainative-flex ainative-items-center ainative-px-2 ainative-py-1.5 ainative-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID);
        setClickState('clickedOption');
      }}>

			Disable Suggestions?
		</div>

		{dividerHTML}

		<div
      className=" ainative-flex ainative-items-center ainative-px-0.5 ainative-cursor-pointer "



      onClick={() => {
        setClickState('init');
      }}>

			<MoreVertical className="ainative-w-4" />
		</div>
	</>;

  return <div className=" ainative-pointer-events-auto ainative-select-none ainative-z-[1000] ainative-rounded-sm ainative-shadow-md ainative-flex ainative-flex-nowrap ainative-text-nowrap ainative-border ainative-border-ainative-border-3 ainative-bg-ainative-bg-2 ainative-transition-all ainative-duration-200 ">






		{clickState === 'init' ? defaultHTML :
    clickState === 'clickedMore' ? moreOptionsHTML :
    <></>
    }
	</div>;
};