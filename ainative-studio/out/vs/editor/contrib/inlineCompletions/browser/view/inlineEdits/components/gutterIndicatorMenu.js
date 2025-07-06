/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { n } from '../../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { KeybindingLabel, unthemedKeybindingLabelOptions } from '../../../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { autorun, constObservable, derived, derivedWithStore, observableFromEvent, observableValue } from '../../../../../../../base/common/observable.js';
import { OS } from '../../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../../base/common/themables.js';
import { localize } from '../../../../../../../nls.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { nativeHoverDelegate } from '../../../../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { asCssVariable, descriptionForeground, editorActionListForeground, editorHoverBorder } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { hideInlineCompletionId, inlineSuggestCommitId, jumpToNextInlineEditId, toggleShowCollapsedId } from '../../../controller/commandIds.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
let GutterIndicatorMenuContent = class GutterIndicatorMenuContent {
    constructor(_model, _close, _editorObs, _contextKeyService, _keybindingService, _commandService) {
        this._model = _model;
        this._close = _close;
        this._editorObs = _editorObs;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._commandService = _commandService;
        this._inlineEditsShowCollapsed = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(s => s.edits.showCollapsed);
    }
    toDisposableLiveElement() {
        return this._createHoverContent().toDisposableLiveElement();
    }
    _createHoverContent() {
        const activeElement = observableValue('active', undefined);
        const createOptionArgs = (options) => {
            return {
                title: options.title,
                icon: options.icon,
                keybinding: typeof options.commandId === 'string' ? this._getKeybinding(options.commandArgs ? undefined : options.commandId) : derived(reader => typeof options.commandId === 'string' ? undefined : this._getKeybinding(options.commandArgs ? undefined : options.commandId.read(reader)).read(reader)),
                isActive: activeElement.map(v => v === options.id),
                onHoverChange: v => activeElement.set(v ? options.id : undefined, undefined),
                onAction: () => {
                    this._close(true);
                    return this._commandService.executeCommand(typeof options.commandId === 'string' ? options.commandId : options.commandId.get(), ...(options.commandArgs ?? []));
                },
            };
        };
        const title = header(this._model.displayName);
        const gotoAndAccept = option(createOptionArgs({
            id: 'gotoAndAccept',
            title: `${localize('goto', "Go To")} / ${localize('accept', "Accept")}`,
            icon: this._model.tabAction.map(action => action === InlineEditTabAction.Accept ? Codicon.check : Codicon.arrowRight),
            commandId: this._model.tabAction.map(action => action === InlineEditTabAction.Accept ? inlineSuggestCommitId : jumpToNextInlineEditId)
        }));
        const reject = option(createOptionArgs({
            id: 'reject',
            title: localize('reject', "Reject"),
            icon: Codicon.close,
            commandId: hideInlineCompletionId
        }));
        const extensionCommands = this._model.extensionCommands.map((c, idx) => option(createOptionArgs({ id: c.id + '_' + idx, title: c.title, icon: Codicon.symbolEvent, commandId: c.id, commandArgs: c.arguments })));
        const toggleCollapsedMode = this._inlineEditsShowCollapsed.map(showCollapsed => showCollapsed ?
            option(createOptionArgs({
                id: 'showExpanded',
                title: localize('showExpanded', "Show Expanded"),
                icon: Codicon.expandAll,
                commandId: toggleShowCollapsedId
            }))
            : option(createOptionArgs({
                id: 'showCollapsed',
                title: localize('showCollapsed', "Show Collapsed"),
                icon: Codicon.collapseAll,
                commandId: toggleShowCollapsedId
            })));
        const settings = option(createOptionArgs({
            id: 'settings',
            title: localize('settings', "Settings"),
            icon: Codicon.gear,
            commandId: 'workbench.action.openSettings',
            commandArgs: ['@tag:nextEditSuggestions']
        }));
        const actions = this._model.action ? [this._model.action] : [];
        const actionBarFooter = actions.length > 0 ? actionBar(actions.map(action => ({
            id: action.id,
            label: action.title,
            enabled: true,
            run: () => this._commandService.executeCommand(action.id, ...(action.arguments ?? [])),
            class: undefined,
            tooltip: action.tooltip ?? action.title
        })), { hoverDelegate: nativeHoverDelegate /* unable to show hover inside another hover */ }) : undefined;
        return hoverContent([
            title,
            gotoAndAccept,
            reject,
            toggleCollapsedMode,
            settings,
            extensionCommands.length ? separator() : undefined,
            ...extensionCommands,
            actionBarFooter ? separator() : undefined,
            actionBarFooter
        ]);
    }
    _getKeybinding(commandId) {
        if (!commandId) {
            return constObservable(undefined);
        }
        return observableFromEvent(this._contextKeyService.onDidChangeContext, () => this._keybindingService.lookupKeybinding(commandId)); // TODO: use contextkeyservice to use different renderings
    }
};
GutterIndicatorMenuContent = __decorate([
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, ICommandService)
], GutterIndicatorMenuContent);
export { GutterIndicatorMenuContent };
function hoverContent(content) {
    return n.div({
        class: 'content',
        style: {
            margin: 4,
            minWidth: 150,
        }
    }, content);
}
function header(title) {
    return n.div({
        class: 'header',
        style: {
            color: asCssVariable(descriptionForeground),
            fontSize: '12px',
            fontWeight: '600',
            padding: '0 10px',
            lineHeight: 26,
        }
    }, [title]);
}
function option(props) {
    return derivedWithStore((_reader, store) => n.div({
        class: ['monaco-menu-option', props.isActive?.map(v => v && 'active')],
        onmouseenter: () => props.onHoverChange?.(true),
        onmouseleave: () => props.onHoverChange?.(false),
        onclick: props.onAction,
        onkeydown: e => {
            if (e.key === 'Enter') {
                props.onAction?.();
            }
        },
        tabIndex: 0,
        style: {
            borderRadius: 3, // same as hover widget border radius
        }
    }, [
        n.elem('span', {
            style: {
                fontSize: 16,
                display: 'flex',
            }
        }, [ThemeIcon.isThemeIcon(props.icon) ? renderIcon(props.icon) : props.icon.map(icon => renderIcon(icon))]),
        n.elem('span', {}, [props.title]),
        n.div({
            style: { marginLeft: 'auto', opacity: '0.6' },
            ref: elem => {
                const keybindingLabel = store.add(new KeybindingLabel(elem, OS, { disableTitle: true, ...unthemedKeybindingLabelOptions }));
                store.add(autorun(reader => {
                    keybindingLabel.set(props.keybinding.read(reader));
                }));
            }
        })
    ]));
}
// TODO: make this observable
function actionBar(actions, options) {
    return derivedWithStore((_reader, store) => n.div({
        class: ['action-widget-action-bar'],
        style: {
            padding: '0 10px',
        }
    }, [
        n.div({
            ref: elem => {
                const actionBar = store.add(new ActionBar(elem, options));
                actionBar.push(actions, { icon: false, label: true });
            }
        })
    ]));
}
function separator() {
    return n.div({
        id: 'inline-edit-gutter-indicator-menu-separator',
        class: 'menu-separator',
        style: {
            color: asCssVariable(editorActionListForeground),
            padding: '4px 0',
        }
    }, n.div({
        style: {
            borderBottom: `1px solid ${asCssVariable(editorHoverBorder)}`,
        }
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yTWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2d1dHRlckluZGljYXRvck1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEwQixDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFxQixNQUFNLDZEQUE2RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLDhCQUE4QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFFMUksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXZFLE9BQU8sRUFBZSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4SyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0s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