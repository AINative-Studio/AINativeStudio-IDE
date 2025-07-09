/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { extname } from '../../../../base/common/resources.js';
import { isNumber, isObject, isString, isUndefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorResolution } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ActiveGroupEditorsByMostRecentlyUsedQuickAccess } from './editorQuickAccess.js';
import { SideBySideEditor } from './sideBySideEditor.js';
import { TextDiffEditor } from './textDiffEditor.js';
import { ActiveEditorCanSplitInGroupContext, ActiveEditorGroupEmptyContext, ActiveEditorGroupLockedContext, ActiveEditorStickyContext, MultipleEditorGroupsContext, SideBySideEditorActiveContext, TextCompareEditorActiveContext } from '../../../common/contextkeys.js';
import { isEditorInputWithOptionsAndGroup } from '../../../common/editor.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { columnToEditorGroup } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IUntitledTextEditorService } from '../../../services/untitled/common/untitledTextEditorService.js';
import { DIFF_FOCUS_OTHER_SIDE, DIFF_FOCUS_PRIMARY_SIDE, DIFF_FOCUS_SECONDARY_SIDE, DIFF_OPEN_SIDE, registerDiffEditorCommands } from './diffEditorCommands.js';
import { resolveCommandsContext } from './editorCommandsContext.js';
import { prepareMoveCopyEditors } from './editor.js';
export const CLOSE_SAVED_EDITORS_COMMAND_ID = 'workbench.action.closeUnmodifiedEditors';
export const CLOSE_EDITORS_IN_GROUP_COMMAND_ID = 'workbench.action.closeEditorsInGroup';
export const CLOSE_EDITORS_AND_GROUP_COMMAND_ID = 'workbench.action.closeEditorsAndGroup';
export const CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID = 'workbench.action.closeEditorsToTheRight';
export const CLOSE_EDITOR_COMMAND_ID = 'workbench.action.closeActiveEditor';
export const CLOSE_PINNED_EDITOR_COMMAND_ID = 'workbench.action.closeActivePinnedEditor';
export const CLOSE_EDITOR_GROUP_COMMAND_ID = 'workbench.action.closeGroup';
export const CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID = 'workbench.action.closeOtherEditors';
export const MOVE_ACTIVE_EDITOR_COMMAND_ID = 'moveActiveEditor';
export const COPY_ACTIVE_EDITOR_COMMAND_ID = 'copyActiveEditor';
export const LAYOUT_EDITOR_GROUPS_COMMAND_ID = 'layoutEditorGroups';
export const KEEP_EDITOR_COMMAND_ID = 'workbench.action.keepEditor';
export const TOGGLE_KEEP_EDITORS_COMMAND_ID = 'workbench.action.toggleKeepEditors';
export const TOGGLE_LOCK_GROUP_COMMAND_ID = 'workbench.action.toggleEditorGroupLock';
export const LOCK_GROUP_COMMAND_ID = 'workbench.action.lockEditorGroup';
export const UNLOCK_GROUP_COMMAND_ID = 'workbench.action.unlockEditorGroup';
export const SHOW_EDITORS_IN_GROUP = 'workbench.action.showEditorsInGroup';
export const REOPEN_WITH_COMMAND_ID = 'workbench.action.reopenWithEditor';
export const PIN_EDITOR_COMMAND_ID = 'workbench.action.pinEditor';
export const UNPIN_EDITOR_COMMAND_ID = 'workbench.action.unpinEditor';
export const SPLIT_EDITOR = 'workbench.action.splitEditor';
export const SPLIT_EDITOR_UP = 'workbench.action.splitEditorUp';
export const SPLIT_EDITOR_DOWN = 'workbench.action.splitEditorDown';
export const SPLIT_EDITOR_LEFT = 'workbench.action.splitEditorLeft';
export const SPLIT_EDITOR_RIGHT = 'workbench.action.splitEditorRight';
export const TOGGLE_MAXIMIZE_EDITOR_GROUP = 'workbench.action.toggleMaximizeEditorGroup';
export const SPLIT_EDITOR_IN_GROUP = 'workbench.action.splitEditorInGroup';
export const TOGGLE_SPLIT_EDITOR_IN_GROUP = 'workbench.action.toggleSplitEditorInGroup';
export const JOIN_EDITOR_IN_GROUP = 'workbench.action.joinEditorInGroup';
export const TOGGLE_SPLIT_EDITOR_IN_GROUP_LAYOUT = 'workbench.action.toggleSplitEditorInGroupLayout';
export const FOCUS_FIRST_SIDE_EDITOR = 'workbench.action.focusFirstSideEditor';
export const FOCUS_SECOND_SIDE_EDITOR = 'workbench.action.focusSecondSideEditor';
export const FOCUS_OTHER_SIDE_EDITOR = 'workbench.action.focusOtherSideEditor';
export const FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusLeftGroupWithoutWrap';
export const FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusRightGroupWithoutWrap';
export const FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusAboveGroupWithoutWrap';
export const FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusBelowGroupWithoutWrap';
export const OPEN_EDITOR_AT_INDEX_COMMAND_ID = 'workbench.action.openEditorAtIndex';
export const MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.moveEditorToNewWindow';
export const COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.copyEditorToNewWindow';
export const MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.moveEditorGroupToNewWindow';
export const COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.copyEditorGroupToNewWindow';
export const NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID = 'workbench.action.newEmptyEditorWindow';
export const API_OPEN_EDITOR_COMMAND_ID = '_workbench.open';
export const API_OPEN_DIFF_EDITOR_COMMAND_ID = '_workbench.diff';
export const API_OPEN_WITH_EDITOR_COMMAND_ID = '_workbench.openWith';
export const EDITOR_CORE_NAVIGATION_COMMANDS = [
    SPLIT_EDITOR,
    CLOSE_EDITOR_COMMAND_ID,
    UNPIN_EDITOR_COMMAND_ID,
    UNLOCK_GROUP_COMMAND_ID,
    TOGGLE_MAXIMIZE_EDITOR_GROUP
];
const isSelectedEditorsMoveCopyArg = function (arg) {
    if (!isObject(arg)) {
        return false;
    }
    if (!isString(arg.to)) {
        return false;
    }
    if (!isUndefined(arg.by) && !isString(arg.by)) {
        return false;
    }
    if (!isUndefined(arg.value) && !isNumber(arg.value)) {
        return false;
    }
    return true;
};
function registerActiveEditorMoveCopyCommand() {
    const moveCopyJSONSchema = {
        'type': 'object',
        'required': ['to'],
        'properties': {
            'to': {
                'type': 'string',
                'enum': ['left', 'right']
            },
            'by': {
                'type': 'string',
                'enum': ['tab', 'group']
            },
            'value': {
                'type': 'number'
            }
        }
    };
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: MOVE_ACTIVE_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: EditorContextKeys.editorTextFocus,
        primary: 0,
        handler: (accessor, args) => moveCopySelectedEditors(true, args, accessor),
        metadata: {
            description: localize('editorCommand.activeEditorMove.description', "Move the active editor by tabs or groups"),
            args: [
                {
                    name: localize('editorCommand.activeEditorMove.arg.name', "Active editor move argument"),
                    description: localize('editorCommand.activeEditorMove.arg.description', "Argument Properties:\n\t* 'to': String value providing where to move.\n\t* 'by': String value providing the unit for move (by tab or by group).\n\t* 'value': Number value providing how many positions or an absolute position to move."),
                    constraint: isSelectedEditorsMoveCopyArg,
                    schema: moveCopyJSONSchema
                }
            ]
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: COPY_ACTIVE_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: EditorContextKeys.editorTextFocus,
        primary: 0,
        handler: (accessor, args) => moveCopySelectedEditors(false, args, accessor),
        metadata: {
            description: localize('editorCommand.activeEditorCopy.description', "Copy the active editor by groups"),
            args: [
                {
                    name: localize('editorCommand.activeEditorCopy.arg.name', "Active editor copy argument"),
                    description: localize('editorCommand.activeEditorCopy.arg.description', "Argument Properties:\n\t* 'to': String value providing where to copy.\n\t* 'value': Number value providing how many positions or an absolute position to copy."),
                    constraint: isSelectedEditorsMoveCopyArg,
                    schema: moveCopyJSONSchema
                }
            ]
        }
    });
    function moveCopySelectedEditors(isMove, args = Object.create(null), accessor) {
        args.to = args.to || 'right';
        args.by = args.by || 'tab';
        args.value = typeof args.value === 'number' ? args.value : 1;
        const activeGroup = accessor.get(IEditorGroupsService).activeGroup;
        const selectedEditors = activeGroup.selectedEditors;
        if (selectedEditors.length > 0) {
            switch (args.by) {
                case 'tab':
                    if (isMove) {
                        return moveTabs(args, activeGroup, selectedEditors);
                    }
                    break;
                case 'group':
                    return moveCopyActiveEditorToGroup(isMove, args, activeGroup, selectedEditors, accessor);
            }
        }
    }
    function moveTabs(args, group, editors) {
        const to = args.to;
        if (to === 'first' || to === 'right') {
            editors = [...editors].reverse();
        }
        else if (to === 'position' && (args.value ?? 1) < group.getIndexOfEditor(editors[0])) {
            editors = [...editors].reverse();
        }
        for (const editor of editors) {
            moveTab(args, group, editor);
        }
    }
    function moveTab(args, group, editor) {
        let index = group.getIndexOfEditor(editor);
        switch (args.to) {
            case 'first':
                index = 0;
                break;
            case 'last':
                index = group.count - 1;
                break;
            case 'left':
                index = index - (args.value ?? 1);
                break;
            case 'right':
                index = index + (args.value ?? 1);
                break;
            case 'center':
                index = Math.round(group.count / 2) - 1;
                break;
            case 'position':
                index = (args.value ?? 1) - 1;
                break;
        }
        index = index < 0 ? 0 : index >= group.count ? group.count - 1 : index;
        group.moveEditor(editor, group, { index });
    }
    function moveCopyActiveEditorToGroup(isMove, args, sourceGroup, editors, accessor) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        let targetGroup;
        switch (args.to) {
            case 'left':
                targetGroup = editorGroupsService.findGroup({ direction: 2 /* GroupDirection.LEFT */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 2 /* GroupDirection.LEFT */);
                }
                break;
            case 'right':
                targetGroup = editorGroupsService.findGroup({ direction: 3 /* GroupDirection.RIGHT */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 3 /* GroupDirection.RIGHT */);
                }
                break;
            case 'up':
                targetGroup = editorGroupsService.findGroup({ direction: 0 /* GroupDirection.UP */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 0 /* GroupDirection.UP */);
                }
                break;
            case 'down':
                targetGroup = editorGroupsService.findGroup({ direction: 1 /* GroupDirection.DOWN */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 1 /* GroupDirection.DOWN */);
                }
                break;
            case 'first':
                targetGroup = editorGroupsService.findGroup({ location: 0 /* GroupLocation.FIRST */ }, sourceGroup);
                break;
            case 'last':
                targetGroup = editorGroupsService.findGroup({ location: 1 /* GroupLocation.LAST */ }, sourceGroup);
                break;
            case 'previous':
                targetGroup = editorGroupsService.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, sourceGroup);
                break;
            case 'next':
                targetGroup = editorGroupsService.findGroup({ location: 2 /* GroupLocation.NEXT */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, preferredSideBySideGroupDirection(configurationService));
                }
                break;
            case 'center':
                targetGroup = editorGroupsService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[(editorGroupsService.count / 2) - 1];
                break;
            case 'position':
                targetGroup = editorGroupsService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[(args.value ?? 1) - 1];
                break;
        }
        if (targetGroup) {
            const editorsWithOptions = prepareMoveCopyEditors(sourceGroup, editors);
            if (isMove) {
                sourceGroup.moveEditors(editorsWithOptions, targetGroup);
            }
            else if (sourceGroup.id !== targetGroup.id) {
                sourceGroup.copyEditors(editorsWithOptions, targetGroup);
            }
            targetGroup.focus();
        }
    }
}
function registerEditorGroupsLayoutCommands() {
    function applyEditorLayout(accessor, layout) {
        if (!layout || typeof layout !== 'object') {
            return;
        }
        const editorGroupsService = accessor.get(IEditorGroupsService);
        editorGroupsService.applyLayout(layout);
    }
    CommandsRegistry.registerCommand(LAYOUT_EDITOR_GROUPS_COMMAND_ID, (accessor, args) => {
        applyEditorLayout(accessor, args);
    });
    // API Commands
    CommandsRegistry.registerCommand({
        id: 'vscode.setEditorLayout',
        handler: (accessor, args) => applyEditorLayout(accessor, args),
        metadata: {
            'description': `Set the editor layout. Editor layout is represented as a tree of groups in which the first group is the root group of the layout.
					The orientation of the first group is 0 (horizontal) by default unless specified otherwise. The other orientations are 1 (vertical).
					The orientation of subsequent groups is the opposite of the orientation of the group that contains it.
					Here are some examples: A layout representing 1 row and 2 columns: { orientation: 0, groups: [{}, {}] }.
					A layout representing 3 rows and 1 column: { orientation: 1, groups: [{}, {}, {}] }.
					A layout representing 3 rows and 1 column in which the second row has 2 columns: { orientation: 1, groups: [{}, { groups: [{}, {}] }, {}] }
					`,
            args: [{
                    name: 'args',
                    schema: {
                        'type': 'object',
                        'required': ['groups'],
                        'properties': {
                            'orientation': {
                                'type': 'number',
                                'default': 0,
                                'description': `The orientation of the root group in the layout. 0 for horizontal, 1 for vertical.`,
                                'enum': [0, 1],
                                'enumDescriptions': [
                                    localize('editorGroupLayout.horizontal', "Horizontal"),
                                    localize('editorGroupLayout.vertical', "Vertical")
                                ],
                            },
                            'groups': {
                                '$ref': '#/definitions/editorGroupsSchema',
                                'default': [{}, {}]
                            }
                        }
                    }
                }]
        }
    });
    CommandsRegistry.registerCommand({
        id: 'vscode.getEditorLayout',
        handler: (accessor) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            return editorGroupsService.getLayout();
        },
        metadata: {
            description: 'Get Editor Layout',
            args: [],
            returns: 'An editor layout object, in the same format as vscode.setEditorLayout'
        }
    });
}
function registerOpenEditorAPICommands() {
    function mixinContext(context, options, column) {
        if (!context) {
            return [options, column];
        }
        return [
            { ...context.editorOptions, ...(options ?? Object.create(null)) },
            context.sideBySide ? SIDE_GROUP : column
        ];
    }
    // partial, renderer-side API command to open editor
    // complements https://github.com/microsoft/vscode/blob/2b164efb0e6a5de3826bff62683eaeafe032284f/src/vs/workbench/api/common/extHostApiCommands.ts#L373
    CommandsRegistry.registerCommand({
        id: 'vscode.open',
        handler: (accessor, arg) => {
            accessor.get(ICommandService).executeCommand(API_OPEN_EDITOR_COMMAND_ID, arg);
        },
        metadata: {
            description: 'Opens the provided resource in the editor.',
            args: [{ name: 'Uri' }]
        }
    });
    CommandsRegistry.registerCommand(API_OPEN_EDITOR_COMMAND_ID, async function (accessor, resourceArg, columnAndOptions, label, context) {
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const openerService = accessor.get(IOpenerService);
        const pathService = accessor.get(IPathService);
        const configurationService = accessor.get(IConfigurationService);
        const untitledTextEditorService = accessor.get(IUntitledTextEditorService);
        const resourceOrString = typeof resourceArg === 'string' ? resourceArg : URI.from(resourceArg, true);
        const [columnArg, optionsArg] = columnAndOptions ?? [];
        // use editor options or editor view column or resource scheme
        // as a hint to use the editor service for opening directly
        if (optionsArg || typeof columnArg === 'number' || matchesScheme(resourceOrString, Schemas.untitled)) {
            const [options, column] = mixinContext(context, optionsArg, columnArg);
            const resource = URI.isUri(resourceOrString) ? resourceOrString : URI.parse(resourceOrString);
            let input;
            if (untitledTextEditorService.isUntitledWithAssociatedResource(resource)) {
                // special case for untitled: we are getting a resource with meaningful
                // path from an extension to use for the untitled editor. as such, we
                // have to assume it as an associated resource to use when saving. we
                // do so by setting the `forceUntitled: true` and changing the scheme
                // to a file based one. the untitled editor service takes care to
                // associate the path properly then.
                input = { resource: resource.with({ scheme: pathService.defaultUriScheme }), forceUntitled: true, options, label };
            }
            else {
                // use any other resource as is
                input = { resource, options, label };
            }
            await editorService.openEditor(input, columnToEditorGroup(editorGroupsService, configurationService, column));
        }
        // do not allow to execute commands from here
        else if (matchesScheme(resourceOrString, Schemas.command)) {
            return;
        }
        // finally, delegate to opener service
        else {
            await openerService.open(resourceOrString, { openToSide: context?.sideBySide, editorOptions: context?.editorOptions });
        }
    });
    // partial, renderer-side API command to open diff editor
    // complements https://github.com/microsoft/vscode/blob/2b164efb0e6a5de3826bff62683eaeafe032284f/src/vs/workbench/api/common/extHostApiCommands.ts#L397
    CommandsRegistry.registerCommand({
        id: 'vscode.diff',
        handler: (accessor, left, right, label) => {
            accessor.get(ICommandService).executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, left, right, label);
        },
        metadata: {
            description: 'Opens the provided resources in the diff editor to compare their contents.',
            args: [
                { name: 'left', description: 'Left-hand side resource of the diff editor' },
                { name: 'right', description: 'Right-hand side resource of the diff editor' },
                { name: 'title', description: 'Human readable title for the diff editor' },
            ]
        }
    });
    CommandsRegistry.registerCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, async function (accessor, originalResource, modifiedResource, labelAndOrDescription, columnAndOptions, context) {
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        const [columnArg, optionsArg] = columnAndOptions ?? [];
        const [options, column] = mixinContext(context, optionsArg, columnArg);
        let label = undefined;
        let description = undefined;
        if (typeof labelAndOrDescription === 'string') {
            label = labelAndOrDescription;
        }
        else if (labelAndOrDescription) {
            label = labelAndOrDescription.label;
            description = labelAndOrDescription.description;
        }
        await editorService.openEditor({
            original: { resource: URI.from(originalResource, true) },
            modified: { resource: URI.from(modifiedResource, true) },
            label,
            description,
            options
        }, columnToEditorGroup(editorGroupsService, configurationService, column));
    });
    CommandsRegistry.registerCommand(API_OPEN_WITH_EDITOR_COMMAND_ID, async (accessor, resource, id, columnAndOptions) => {
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        const [columnArg, optionsArg] = columnAndOptions ?? [];
        await editorService.openEditor({ resource: URI.from(resource, true), options: { pinned: true, ...optionsArg, override: id } }, columnToEditorGroup(editorGroupsService, configurationService, columnArg));
    });
    // partial, renderer-side API command to open diff editor
    // complements https://github.com/microsoft/vscode/blob/2b164efb0e6a5de3826bff62683eaeafe032284f/src/vs/workbench/api/common/extHostApiCommands.ts#L397
    CommandsRegistry.registerCommand({
        id: 'vscode.changes',
        handler: (accessor, title, resources) => {
            accessor.get(ICommandService).executeCommand('_workbench.changes', title, resources);
        },
        metadata: {
            description: 'Opens a list of resources in the changes editor to compare their contents.',
            args: [
                { name: 'title', description: 'Human readable title for the diff editor' },
                { name: 'resources', description: 'List of resources to open in the changes editor' }
            ]
        }
    });
    CommandsRegistry.registerCommand('_workbench.changes', async (accessor, title, resources) => {
        const editorService = accessor.get(IEditorService);
        const editor = [];
        for (const [label, original, modified] of resources) {
            editor.push({
                resource: URI.revive(label),
                original: { resource: URI.revive(original) },
                modified: { resource: URI.revive(modified) },
            });
        }
        await editorService.openEditor({ resources: editor, label: title });
    });
    CommandsRegistry.registerCommand('_workbench.openMultiDiffEditor', async (accessor, options) => {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            multiDiffSource: options.multiDiffSourceUri ? URI.revive(options.multiDiffSourceUri) : undefined,
            resources: options.resources?.map(r => ({ original: { resource: URI.revive(r.originalUri) }, modified: { resource: URI.revive(r.modifiedUri) } })),
            label: options.title,
        });
    });
}
function registerOpenEditorAtIndexCommands() {
    const openEditorAtIndex = (accessor, editorIndex) => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane) {
            const editor = activeEditorPane.group.getEditorByIndex(editorIndex);
            if (editor) {
                editorService.openEditor(editor);
            }
        }
    };
    // This command takes in the editor index number to open as an argument
    CommandsRegistry.registerCommand({
        id: OPEN_EDITOR_AT_INDEX_COMMAND_ID,
        handler: openEditorAtIndex
    });
    // Keybindings to focus a specific index in the tab folder if tabs are enabled
    for (let i = 0; i < 9; i++) {
        const editorIndex = i;
        const visibleIndex = i + 1;
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: OPEN_EDITOR_AT_INDEX_COMMAND_ID + visibleIndex,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: undefined,
            primary: 512 /* KeyMod.Alt */ | toKeyCode(visibleIndex),
            mac: { primary: 256 /* KeyMod.WinCtrl */ | toKeyCode(visibleIndex) },
            handler: accessor => openEditorAtIndex(accessor, editorIndex)
        });
    }
    function toKeyCode(index) {
        switch (index) {
            case 0: return 21 /* KeyCode.Digit0 */;
            case 1: return 22 /* KeyCode.Digit1 */;
            case 2: return 23 /* KeyCode.Digit2 */;
            case 3: return 24 /* KeyCode.Digit3 */;
            case 4: return 25 /* KeyCode.Digit4 */;
            case 5: return 26 /* KeyCode.Digit5 */;
            case 6: return 27 /* KeyCode.Digit6 */;
            case 7: return 28 /* KeyCode.Digit7 */;
            case 8: return 29 /* KeyCode.Digit8 */;
            case 9: return 30 /* KeyCode.Digit9 */;
        }
        throw new Error('invalid index');
    }
}
function registerFocusEditorGroupAtIndexCommands() {
    // Keybindings to focus a specific group (2-8) in the editor area
    for (let groupIndex = 1; groupIndex < 8; groupIndex++) {
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: toCommandId(groupIndex),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: undefined,
            primary: 2048 /* KeyMod.CtrlCmd */ | toKeyCode(groupIndex),
            handler: accessor => {
                const editorGroupsService = accessor.get(IEditorGroupsService);
                const configurationService = accessor.get(IConfigurationService);
                // To keep backwards compatibility (pre-grid), allow to focus a group
                // that does not exist as long as it is the next group after the last
                // opened group. Otherwise we return.
                if (groupIndex > editorGroupsService.count) {
                    return;
                }
                // Group exists: just focus
                const groups = editorGroupsService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
                if (groups[groupIndex]) {
                    return groups[groupIndex].focus();
                }
                // Group does not exist: create new by splitting the active one of the last group
                const direction = preferredSideBySideGroupDirection(configurationService);
                const lastGroup = editorGroupsService.findGroup({ location: 1 /* GroupLocation.LAST */ });
                if (!lastGroup) {
                    return;
                }
                const newGroup = editorGroupsService.addGroup(lastGroup, direction);
                // Focus
                newGroup.focus();
            }
        });
    }
    function toCommandId(index) {
        switch (index) {
            case 1: return 'workbench.action.focusSecondEditorGroup';
            case 2: return 'workbench.action.focusThirdEditorGroup';
            case 3: return 'workbench.action.focusFourthEditorGroup';
            case 4: return 'workbench.action.focusFifthEditorGroup';
            case 5: return 'workbench.action.focusSixthEditorGroup';
            case 6: return 'workbench.action.focusSeventhEditorGroup';
            case 7: return 'workbench.action.focusEighthEditorGroup';
        }
        throw new Error('Invalid index');
    }
    function toKeyCode(index) {
        switch (index) {
            case 1: return 23 /* KeyCode.Digit2 */;
            case 2: return 24 /* KeyCode.Digit3 */;
            case 3: return 25 /* KeyCode.Digit4 */;
            case 4: return 26 /* KeyCode.Digit5 */;
            case 5: return 27 /* KeyCode.Digit6 */;
            case 6: return 28 /* KeyCode.Digit7 */;
            case 7: return 29 /* KeyCode.Digit8 */;
        }
        throw new Error('Invalid index');
    }
}
export function splitEditor(editorGroupsService, direction, resolvedContext) {
    if (!resolvedContext.groupedEditors.length) {
        return;
    }
    // Only support splitting from one source group
    const { group, editors } = resolvedContext.groupedEditors[0];
    const preserveFocus = resolvedContext.preserveFocus;
    const newGroup = editorGroupsService.addGroup(group, direction);
    for (const editorToCopy of editors) {
        // Split editor (if it can be split)
        if (editorToCopy && !editorToCopy.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            group.copyEditor(editorToCopy, newGroup, { preserveFocus });
        }
    }
    // Focus
    newGroup.focus();
}
function registerSplitEditorCommands() {
    [
        { id: SPLIT_EDITOR_UP, direction: 0 /* GroupDirection.UP */ },
        { id: SPLIT_EDITOR_DOWN, direction: 1 /* GroupDirection.DOWN */ },
        { id: SPLIT_EDITOR_LEFT, direction: 2 /* GroupDirection.LEFT */ },
        { id: SPLIT_EDITOR_RIGHT, direction: 3 /* GroupDirection.RIGHT */ }
    ].forEach(({ id, direction }) => {
        CommandsRegistry.registerCommand(id, function (accessor, ...args) {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            splitEditor(accessor.get(IEditorGroupsService), direction, resolvedContext);
        });
    });
}
function registerCloseEditorCommands() {
    // A special handler for "Close Editor" depending on context
    // - keybindining: do not close sticky editors, rather open the next non-sticky editor
    // - menu: always close editor, even sticky ones
    function closeEditorHandler(accessor, forceCloseStickyEditors, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        let keepStickyEditors = undefined;
        if (forceCloseStickyEditors) {
            keepStickyEditors = false; // explicitly close sticky editors
        }
        else if (args.length) {
            keepStickyEditors = false; // we have a context, as such this command was used e.g. from the tab context menu
        }
        else {
            keepStickyEditors = editorGroupsService.partOptions.preventPinnedEditorClose === 'keyboard' || editorGroupsService.partOptions.preventPinnedEditorClose === 'keyboardAndMouse'; // respect setting otherwise
        }
        // Skip over sticky editor and select next if we are configured to do so
        if (keepStickyEditors) {
            const activeGroup = editorGroupsService.activeGroup;
            const activeEditor = activeGroup.activeEditor;
            if (activeEditor && activeGroup.isSticky(activeEditor)) {
                // Open next recently active in same group
                const nextNonStickyEditorInGroup = activeGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true })[0];
                if (nextNonStickyEditorInGroup) {
                    return activeGroup.openEditor(nextNonStickyEditorInGroup);
                }
                // Open next recently active across all groups
                const nextNonStickyEditorInAllGroups = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true })[0];
                if (nextNonStickyEditorInAllGroups) {
                    return Promise.resolve(editorGroupsService.getGroup(nextNonStickyEditorInAllGroups.groupId)?.openEditor(nextNonStickyEditorInAllGroups.editor));
                }
            }
        }
        // With context: proceed to close editors as instructed
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const preserveFocus = resolvedContext.preserveFocus;
        return Promise.all(resolvedContext.groupedEditors.map(async ({ group, editors }) => {
            const editorsToClose = editors.filter(editor => !keepStickyEditors || !group.isSticky(editor));
            await group.closeEditors(editorsToClose, { preserveFocus });
        }));
    }
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
        handler: (accessor, ...args) => {
            return closeEditorHandler(accessor, false, ...args);
        }
    });
    CommandsRegistry.registerCommand(CLOSE_PINNED_EDITOR_COMMAND_ID, (accessor, ...args) => {
        return closeEditorHandler(accessor, true /* force close pinned editors */, ...args);
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 53 /* KeyCode.KeyW */),
        handler: (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            return Promise.all(resolvedContext.groupedEditors.map(async ({ group }) => {
                await group.closeAllEditors({ excludeSticky: true });
            }));
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITOR_GROUP_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext),
        primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
        handler: (accessor, ...args) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const commandsContext = resolveCommandsContext(args, accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
            if (commandsContext.groupedEditors.length) {
                editorGroupsService.removeGroup(commandsContext.groupedEditors[0].group);
            }
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_SAVED_EDITORS_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 51 /* KeyCode.KeyU */),
        handler: (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            return Promise.all(resolvedContext.groupedEditors.map(async ({ group }) => {
                await group.closeEditors({ savedOnly: true, excludeSticky: true }, { preserveFocus: resolvedContext.preserveFocus });
            }));
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 50 /* KeyCode.KeyT */ },
        handler: (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            return Promise.all(resolvedContext.groupedEditors.map(async ({ group, editors }) => {
                const editorsToClose = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).filter(editor => !editors.includes(editor));
                for (const editorToKeep of editors) {
                    if (editorToKeep) {
                        group.pinEditor(editorToKeep);
                    }
                }
                await group.closeEditors(editorsToClose, { preserveFocus: resolvedContext.preserveFocus });
            }));
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            if (resolvedContext.groupedEditors.length) {
                const { group, editors } = resolvedContext.groupedEditors[0];
                if (group.activeEditor) {
                    group.pinEditor(group.activeEditor);
                }
                await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: editors[0], excludeSticky: true }, { preserveFocus: resolvedContext.preserveFocus });
            }
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: REOPEN_WITH_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: async (accessor, ...args) => {
            const editorService = accessor.get(IEditorService);
            const editorResolverService = accessor.get(IEditorResolverService);
            const telemetryService = accessor.get(ITelemetryService);
            const resolvedContext = resolveCommandsContext(args, editorService, accessor.get(IEditorGroupsService), accessor.get(IListService));
            const editorReplacements = new Map();
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    const untypedEditor = editor.toUntyped();
                    if (!untypedEditor) {
                        return; // Resolver can only resolve untyped editors
                    }
                    untypedEditor.options = { ...editorService.activeEditorPane?.options, override: EditorResolution.PICK };
                    const resolvedEditor = await editorResolverService.resolveEditor(untypedEditor, group);
                    if (!isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                        return;
                    }
                    let editorReplacementsInGroup = editorReplacements.get(group);
                    if (!editorReplacementsInGroup) {
                        editorReplacementsInGroup = [];
                        editorReplacements.set(group, editorReplacementsInGroup);
                    }
                    editorReplacementsInGroup.push({
                        editor: editor,
                        replacement: resolvedEditor.editor,
                        forceReplaceDirty: editor.resource?.scheme === Schemas.untitled,
                        options: resolvedEditor.options
                    });
                    telemetryService.publicLog2('workbenchEditorReopen', {
                        scheme: editor.resource?.scheme ?? '',
                        ext: editor.resource ? extname(editor.resource) : '',
                        from: editor.editorId ?? '',
                        to: resolvedEditor.editor.editorId ?? ''
                    });
                }
            }
            // Replace editor with resolved one and make active
            for (const [group, replacements] of editorReplacements) {
                await group.replaceEditors(replacements);
                await group.openEditor(replacements[0].replacement);
            }
        }
    });
    CommandsRegistry.registerCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, async (accessor, ...args) => {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
        if (resolvedContext.groupedEditors.length) {
            const { group } = resolvedContext.groupedEditors[0];
            await group.closeAllEditors();
            if (group.count === 0 && editorGroupsService.getGroup(group.id) /* could be gone by now */) {
                editorGroupsService.removeGroup(group); // only remove group if it is now empty
            }
        }
    });
}
function registerFocusEditorGroupWihoutWrapCommands() {
    const commands = [
        {
            id: FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 2 /* GroupDirection.LEFT */
        },
        {
            id: FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 3 /* GroupDirection.RIGHT */
        },
        {
            id: FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 0 /* GroupDirection.UP */,
        },
        {
            id: FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 1 /* GroupDirection.DOWN */
        }
    ];
    for (const command of commands) {
        CommandsRegistry.registerCommand(command.id, async (accessor) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const group = editorGroupsService.findGroup({ direction: command.direction }, editorGroupsService.activeGroup, false) ?? editorGroupsService.activeGroup;
            group.focus();
        });
    }
}
function registerSplitEditorInGroupCommands() {
    async function splitEditorInGroup(accessor, resolvedContext) {
        const instantiationService = accessor.get(IInstantiationService);
        if (!resolvedContext.groupedEditors.length) {
            return;
        }
        const { group, editors } = resolvedContext.groupedEditors[0];
        const editor = editors[0];
        if (!editor) {
            return;
        }
        await group.replaceEditors([{
                editor,
                replacement: instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, editor, editor),
                forceReplaceDirty: true
            }]);
    }
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: SPLIT_EDITOR_IN_GROUP,
                title: localize2('splitEditorInGroup', 'Split Editor in Group'),
                category: Categories.View,
                precondition: ActiveEditorCanSplitInGroupContext,
                f1: true,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ActiveEditorCanSplitInGroupContext,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */)
                }
            });
        }
        run(accessor, ...args) {
            return splitEditorInGroup(accessor, resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService)));
        }
    });
    async function joinEditorInGroup(resolvedContext) {
        if (!resolvedContext.groupedEditors.length) {
            return;
        }
        const { group, editors } = resolvedContext.groupedEditors[0];
        const editor = editors[0];
        if (!editor) {
            return;
        }
        if (!(editor instanceof SideBySideEditorInput)) {
            return;
        }
        let options = undefined;
        const activeEditorPane = group.activeEditorPane;
        if (activeEditorPane instanceof SideBySideEditor && group.activeEditor === editor) {
            for (const pane of [activeEditorPane.getPrimaryEditorPane(), activeEditorPane.getSecondaryEditorPane()]) {
                if (pane?.hasFocus()) {
                    options = { viewState: pane.getViewState() };
                    break;
                }
            }
        }
        await group.replaceEditors([{
                editor,
                replacement: editor.primary,
                options
            }]);
    }
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: JOIN_EDITOR_IN_GROUP,
                title: localize2('joinEditorInGroup', 'Join Editor in Group'),
                category: Categories.View,
                precondition: SideBySideEditorActiveContext,
                f1: true,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: SideBySideEditorActiveContext,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */)
                }
            });
        }
        run(accessor, ...args) {
            return joinEditorInGroup(resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService)));
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: TOGGLE_SPLIT_EDITOR_IN_GROUP,
                title: localize2('toggleJoinEditorInGroup', 'Toggle Split Editor in Group'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext),
                f1: true
            });
        }
        async run(accessor, ...args) {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            if (!resolvedContext.groupedEditors.length) {
                return;
            }
            const { editors } = resolvedContext.groupedEditors[0];
            if (editors[0] instanceof SideBySideEditorInput) {
                await joinEditorInGroup(resolvedContext);
            }
            else if (editors[0]) {
                await splitEditorInGroup(accessor, resolvedContext);
            }
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: TOGGLE_SPLIT_EDITOR_IN_GROUP_LAYOUT,
                title: localize2('toggleSplitEditorInGroupLayout', 'Toggle Layout of Split Editor in Group'),
                category: Categories.View,
                precondition: SideBySideEditorActiveContext,
                f1: true
            });
        }
        async run(accessor) {
            const configurationService = accessor.get(IConfigurationService);
            const currentSetting = configurationService.getValue(SideBySideEditor.SIDE_BY_SIDE_LAYOUT_SETTING);
            let newSetting;
            if (currentSetting !== 'horizontal') {
                newSetting = 'horizontal';
            }
            else {
                newSetting = 'vertical';
            }
            return configurationService.updateValue(SideBySideEditor.SIDE_BY_SIDE_LAYOUT_SETTING, newSetting);
        }
    });
}
function registerFocusSideEditorsCommands() {
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: FOCUS_FIRST_SIDE_EDITOR,
                title: localize2('focusLeftSideEditor', 'Focus First Side in Active Editor'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
                f1: true
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const commandService = accessor.get(ICommandService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane instanceof SideBySideEditor) {
                activeEditorPane.getSecondaryEditorPane()?.focus();
            }
            else if (activeEditorPane instanceof TextDiffEditor) {
                await commandService.executeCommand(DIFF_FOCUS_SECONDARY_SIDE);
            }
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: FOCUS_SECOND_SIDE_EDITOR,
                title: localize2('focusRightSideEditor', 'Focus Second Side in Active Editor'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
                f1: true
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const commandService = accessor.get(ICommandService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane instanceof SideBySideEditor) {
                activeEditorPane.getPrimaryEditorPane()?.focus();
            }
            else if (activeEditorPane instanceof TextDiffEditor) {
                await commandService.executeCommand(DIFF_FOCUS_PRIMARY_SIDE);
            }
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: FOCUS_OTHER_SIDE_EDITOR,
                title: localize2('focusOtherSideEditor', 'Focus Other Side in Active Editor'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
                f1: true
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const commandService = accessor.get(ICommandService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane instanceof SideBySideEditor) {
                if (activeEditorPane.getPrimaryEditorPane()?.hasFocus()) {
                    activeEditorPane.getSecondaryEditorPane()?.focus();
                }
                else {
                    activeEditorPane.getPrimaryEditorPane()?.focus();
                }
            }
            else if (activeEditorPane instanceof TextDiffEditor) {
                await commandService.executeCommand(DIFF_FOCUS_OTHER_SIDE);
            }
        }
    });
}
function registerOtherEditorCommands() {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: KEEP_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 3 /* KeyCode.Enter */),
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    group.pinEditor(editor);
                }
            }
        }
    });
    CommandsRegistry.registerCommand({
        id: TOGGLE_KEEP_EDITORS_COMMAND_ID,
        handler: accessor => {
            const configurationService = accessor.get(IConfigurationService);
            const currentSetting = configurationService.getValue('workbench.editor.enablePreview');
            const newSetting = currentSetting === true ? false : true;
            configurationService.updateValue('workbench.editor.enablePreview', newSetting);
        }
    });
    function setEditorGroupLock(accessor, locked, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const group = resolvedContext.groupedEditors[0]?.group;
        group?.lock(locked ?? !group.isLocked);
    }
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: TOGGLE_LOCK_GROUP_COMMAND_ID,
                title: localize2('toggleEditorGroupLock', 'Toggle Editor Group Lock'),
                category: Categories.View,
                f1: true
            });
        }
        async run(accessor, ...args) {
            setEditorGroupLock(accessor, undefined, ...args);
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: LOCK_GROUP_COMMAND_ID,
                title: localize2('lockEditorGroup', 'Lock Editor Group'),
                category: Categories.View,
                precondition: ActiveEditorGroupLockedContext.toNegated(),
                f1: true
            });
        }
        async run(accessor, ...args) {
            setEditorGroupLock(accessor, true, ...args);
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: UNLOCK_GROUP_COMMAND_ID,
                title: localize2('unlockEditorGroup', 'Unlock Editor Group'),
                precondition: ActiveEditorGroupLockedContext,
                category: Categories.View,
                f1: true
            });
        }
        async run(accessor, ...args) {
            setEditorGroupLock(accessor, false, ...args);
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: PIN_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ActiveEditorStickyContext.toNegated(),
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */),
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    group.stickEditor(editor);
                }
            }
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_OPEN_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: EditorContextKeys.inDiffEditor,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */),
        handler: async (accessor) => {
            const editorService = accessor.get(IEditorService);
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const activeEditor = editorService.activeEditor;
            const activeTextEditorControl = editorService.activeTextEditorControl;
            if (!isDiffEditor(activeTextEditorControl) || !(activeEditor instanceof DiffEditorInput)) {
                return;
            }
            let editor;
            const originalEditor = activeTextEditorControl.getOriginalEditor();
            if (originalEditor.hasTextFocus()) {
                editor = activeEditor.original;
            }
            else {
                editor = activeEditor.modified;
            }
            return editorGroupsService.activeGroup.openEditor(editor);
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: UNPIN_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ActiveEditorStickyContext,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */),
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    group.unstickEditor(editor);
                }
            }
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: SHOW_EDITORS_IN_GROUP,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const quickInputService = accessor.get(IQuickInputService);
            const commandsContext = resolveCommandsContext(args, accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
            const group = commandsContext.groupedEditors[0]?.group;
            if (group) {
                editorGroupsService.activateGroup(group); // we need the group to be active
            }
            return quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
        }
    });
}
export function setup() {
    registerActiveEditorMoveCopyCommand();
    registerEditorGroupsLayoutCommands();
    registerDiffEditorCommands();
    registerOpenEditorAPICommands();
    registerOpenEditorAtIndexCommands();
    registerCloseEditorCommands();
    registerOtherEditorCommands();
    registerSplitEditorInGroupCommands();
    registerFocusSideEditorsCommands();
    registerFocusEditorGroupAtIndexCommands();
    registerSplitEditorCommands();
    registerFocusEditorGroupWihoutWrapCommands();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFtQixlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUE0RCxNQUFNLDhDQUE4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