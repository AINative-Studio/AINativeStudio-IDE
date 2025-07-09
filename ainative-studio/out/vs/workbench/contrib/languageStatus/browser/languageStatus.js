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
var LanguageStatus_1;
import './media/languageStatus.css';
import * as dom from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
import { IStatusbarService, ShowTooltipCommand } from '../../../services/statusbar/browser/statusbar.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { equals } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IHoverService, nativeHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { Event } from '../../../../base/common/event.js';
import { joinStrings } from '../../../../base/common/strings.js';
class LanguageStatusViewModel {
    constructor(combined, dedicated) {
        this.combined = combined;
        this.dedicated = dedicated;
    }
    isEqual(other) {
        return equals(this.combined, other.combined) && equals(this.dedicated, other.dedicated);
    }
}
let StoredCounter = class StoredCounter {
    constructor(_storageService, _key) {
        this._storageService = _storageService;
        this._key = _key;
    }
    get value() {
        return this._storageService.getNumber(this._key, 0 /* StorageScope.PROFILE */, 0);
    }
    increment() {
        const n = this.value + 1;
        this._storageService.store(this._key, n, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return n;
    }
};
StoredCounter = __decorate([
    __param(0, IStorageService)
], StoredCounter);
let LanguageStatusContribution = class LanguageStatusContribution extends Disposable {
    static { this.Id = 'status.languageStatus'; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        for (const part of editorGroupService.parts) {
            this.createLanguageStatus(part);
        }
        this._register(editorGroupService.onDidCreateAuxiliaryEditorPart(part => this.createLanguageStatus(part)));
    }
    createLanguageStatus(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        disposables.add(scopedInstantiationService.createInstance(LanguageStatus));
    }
};
LanguageStatusContribution = __decorate([
    __param(0, IEditorGroupsService)
], LanguageStatusContribution);
export { LanguageStatusContribution };
let LanguageStatus = class LanguageStatus {
    static { LanguageStatus_1 = this; }
    static { this._id = 'status.languageStatus'; }
    static { this._keyDedicatedItems = 'languageStatus.dedicated'; }
    constructor(_languageStatusService, _statusBarService, _editorService, _hoverService, _openerService, _storageService) {
        this._languageStatusService = _languageStatusService;
        this._statusBarService = _statusBarService;
        this._editorService = _editorService;
        this._hoverService = _hoverService;
        this._openerService = _openerService;
        this._storageService = _storageService;
        this._disposables = new DisposableStore();
        this._dedicated = new Set();
        this._dedicatedEntries = new Map();
        this._renderDisposables = new DisposableStore();
        this._combinedEntryTooltip = document.createElement('div');
        _storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, LanguageStatus_1._keyDedicatedItems, this._disposables)(this._handleStorageChange, this, this._disposables);
        this._restoreState();
        this._interactionCounter = new StoredCounter(_storageService, 'languageStatus.interactCount');
        _languageStatusService.onDidChange(this._update, this, this._disposables);
        _editorService.onDidActiveEditorChange(this._update, this, this._disposables);
        this._update();
        _statusBarService.onDidChangeEntryVisibility(e => {
            if (!e.visible && this._dedicated.has(e.id)) {
                this._dedicated.delete(e.id);
                this._update();
                this._storeState();
            }
        }, undefined, this._disposables);
    }
    dispose() {
        this._disposables.dispose();
        this._combinedEntry?.dispose();
        dispose(this._dedicatedEntries.values());
        this._renderDisposables.dispose();
    }
    // --- persisting dedicated items
    _handleStorageChange() {
        this._restoreState();
        this._update();
    }
    _restoreState() {
        const raw = this._storageService.get(LanguageStatus_1._keyDedicatedItems, 0 /* StorageScope.PROFILE */, '[]');
        try {
            const ids = JSON.parse(raw);
            this._dedicated = new Set(ids);
        }
        catch {
            this._dedicated.clear();
        }
    }
    _storeState() {
        if (this._dedicated.size === 0) {
            this._storageService.remove(LanguageStatus_1._keyDedicatedItems, 0 /* StorageScope.PROFILE */);
        }
        else {
            const raw = JSON.stringify(Array.from(this._dedicated.keys()));
            this._storageService.store(LanguageStatus_1._keyDedicatedItems, raw, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
    // --- language status model and UI
    _createViewModel(editor) {
        if (!editor?.hasModel()) {
            return new LanguageStatusViewModel([], []);
        }
        const all = this._languageStatusService.getLanguageStatus(editor.getModel());
        const combined = [];
        const dedicated = [];
        for (const item of all) {
            if (this._dedicated.has(item.id)) {
                dedicated.push(item);
            }
            combined.push(item);
        }
        return new LanguageStatusViewModel(combined, dedicated);
    }
    _update() {
        const editor = getCodeEditor(this._editorService.activeTextEditorControl);
        const model = this._createViewModel(editor);
        if (this._model?.isEqual(model)) {
            return;
        }
        this._renderDisposables.clear();
        this._model = model;
        // update when editor language changes
        editor?.onDidChangeModelLanguage(this._update, this, this._renderDisposables);
        // combined status bar item is a single item which hover shows
        // each status item
        if (model.combined.length === 0) {
            // nothing
            this._combinedEntry?.dispose();
            this._combinedEntry = undefined;
        }
        else {
            const [first] = model.combined;
            const showSeverity = first.severity >= Severity.Warning;
            const text = LanguageStatus_1._severityToComboCodicon(first.severity);
            let isOneBusy = false;
            const ariaLabels = [];
            for (const status of model.combined) {
                const isPinned = model.dedicated.includes(status);
                this._renderStatus(this._combinedEntryTooltip, status, showSeverity, isPinned, this._renderDisposables);
                ariaLabels.push(LanguageStatus_1._accessibilityInformation(status).label);
                isOneBusy = isOneBusy || (!isPinned && status.busy); // unpinned items contribute to the busy-indicator of the composite status item
            }
            const props = {
                name: localize('langStatus.name', "Editor Language Status"),
                ariaLabel: localize('langStatus.aria', "Editor Language Status: {0}", ariaLabels.join(', next: ')),
                tooltip: this._combinedEntryTooltip,
                command: ShowTooltipCommand,
                text: isOneBusy ? '$(loading~spin)' : text,
            };
            if (!this._combinedEntry) {
                this._combinedEntry = this._statusBarService.addEntry(props, LanguageStatus_1._id, 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.editor.mode', priority: 100.1 }, alignment: 0 /* StatusbarAlignment.LEFT */, compact: true });
            }
            else {
                this._combinedEntry.update(props);
            }
            // animate the status bar icon whenever language status changes, repeat animation
            // when severity is warning or error, don't show animation when showing progress/busy
            const userHasInteractedWithStatus = this._interactionCounter.value >= 3;
            const targetWindow = dom.getWindow(editor?.getContainerDomNode());
            const node = targetWindow.document.querySelector('.monaco-workbench .statusbar DIV#status\\.languageStatus A>SPAN.codicon');
            const container = targetWindow.document.querySelector('.monaco-workbench .statusbar DIV#status\\.languageStatus');
            if (dom.isHTMLElement(node) && container) {
                const _wiggle = 'wiggle';
                const _flash = 'flash';
                if (!isOneBusy) {
                    // wiggle icon when severe or "new"
                    node.classList.toggle(_wiggle, showSeverity || !userHasInteractedWithStatus);
                    this._renderDisposables.add(dom.addDisposableListener(node, 'animationend', _e => node.classList.remove(_wiggle)));
                    // flash background when severe
                    container.classList.toggle(_flash, showSeverity);
                    this._renderDisposables.add(dom.addDisposableListener(container, 'animationend', _e => container.classList.remove(_flash)));
                }
                else {
                    node.classList.remove(_wiggle);
                    container.classList.remove(_flash);
                }
            }
            // track when the hover shows (this is automagic and DOM mutation spying is needed...)
            //  use that as signal that the user has interacted/learned language status items work
            if (!userHasInteractedWithStatus) {
                const hoverTarget = targetWindow.document.querySelector('.monaco-workbench .context-view');
                if (dom.isHTMLElement(hoverTarget)) {
                    const observer = new MutationObserver(() => {
                        if (targetWindow.document.contains(this._combinedEntryTooltip)) {
                            this._interactionCounter.increment();
                            observer.disconnect();
                        }
                    });
                    observer.observe(hoverTarget, { childList: true, subtree: true });
                    this._renderDisposables.add(toDisposable(() => observer.disconnect()));
                }
            }
        }
        // dedicated status bar items are shows as-is in the status bar
        const newDedicatedEntries = new Map();
        for (const status of model.dedicated) {
            const props = LanguageStatus_1._asStatusbarEntry(status);
            let entry = this._dedicatedEntries.get(status.id);
            if (!entry) {
                entry = this._statusBarService.addEntry(props, status.id, 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.editor.mode', priority: 100.1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
            }
            else {
                entry.update(props);
                this._dedicatedEntries.delete(status.id);
            }
            newDedicatedEntries.set(status.id, entry);
        }
        dispose(this._dedicatedEntries.values());
        this._dedicatedEntries = newDedicatedEntries;
    }
    _renderStatus(container, status, showSeverity, isPinned, store) {
        const parent = document.createElement('div');
        parent.classList.add('hover-language-status');
        container.appendChild(parent);
        store.add(toDisposable(() => parent.remove()));
        const severity = document.createElement('div');
        severity.classList.add('severity', `sev${status.severity}`);
        severity.classList.toggle('show', showSeverity);
        const severityText = LanguageStatus_1._severityToSingleCodicon(status.severity);
        dom.append(severity, ...renderLabelWithIcons(severityText));
        parent.appendChild(severity);
        const element = document.createElement('div');
        element.classList.add('element');
        parent.appendChild(element);
        const left = document.createElement('div');
        left.classList.add('left');
        element.appendChild(left);
        const label = document.createElement('span');
        label.classList.add('label');
        const labelValue = typeof status.label === 'string' ? status.label : status.label.value;
        dom.append(label, ...renderLabelWithIcons(computeText(labelValue, status.busy)));
        left.appendChild(label);
        const detail = document.createElement('span');
        detail.classList.add('detail');
        this._renderTextPlus(detail, status.detail, store);
        left.appendChild(detail);
        const right = document.createElement('div');
        right.classList.add('right');
        element.appendChild(right);
        // -- command (if available)
        const { command } = status;
        if (command) {
            store.add(new Link(right, {
                label: command.title,
                title: command.tooltip,
                href: URI.from({
                    scheme: 'command', path: command.id, query: command.arguments && JSON.stringify(command.arguments)
                }).toString()
            }, { hoverDelegate: nativeHoverDelegate }, this._hoverService, this._openerService));
        }
        // -- pin
        const actionBar = new ActionBar(right, { hoverDelegate: nativeHoverDelegate });
        const actionLabel = isPinned ? localize('unpin', "Remove from Status Bar") : localize('pin', "Add to Status Bar");
        actionBar.setAriaLabel(actionLabel);
        store.add(actionBar);
        let action;
        if (!isPinned) {
            action = new Action('pin', actionLabel, ThemeIcon.asClassName(Codicon.pin), true, () => {
                this._dedicated.add(status.id);
                this._statusBarService.updateEntryVisibility(status.id, true);
                this._update();
                this._storeState();
            });
        }
        else {
            action = new Action('unpin', actionLabel, ThemeIcon.asClassName(Codicon.pinned), true, () => {
                this._dedicated.delete(status.id);
                this._statusBarService.updateEntryVisibility(status.id, false);
                this._update();
                this._storeState();
            });
        }
        actionBar.push(action, { icon: true, label: false });
        store.add(action);
        return parent;
    }
    static _severityToComboCodicon(sev) {
        switch (sev) {
            case Severity.Error: return '$(bracket-error)';
            case Severity.Warning: return '$(bracket-dot)';
            default: return '$(bracket)';
        }
    }
    static _severityToSingleCodicon(sev) {
        switch (sev) {
            case Severity.Error: return '$(error)';
            case Severity.Warning: return '$(info)';
            default: return '$(check)';
        }
    }
    _renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                dom.append(target, ...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this._hoverService, this._openerService));
            }
        }
    }
    static _accessibilityInformation(status) {
        if (status.accessibilityInfo) {
            return status.accessibilityInfo;
        }
        const textValue = typeof status.label === 'string' ? status.label : status.label.value;
        if (status.detail) {
            return { label: localize('aria.1', '{0}, {1}', textValue, status.detail) };
        }
        else {
            return { label: localize('aria.2', '{0}', textValue) };
        }
    }
    // ---
    static _asStatusbarEntry(item) {
        let kind;
        if (item.severity === Severity.Warning) {
            kind = 'warning';
        }
        else if (item.severity === Severity.Error) {
            kind = 'error';
        }
        const textValue = typeof item.label === 'string' ? item.label : item.label.shortValue;
        return {
            name: localize('name.pattern', '{0} (Language Status)', item.name),
            text: computeText(textValue, item.busy),
            ariaLabel: LanguageStatus_1._accessibilityInformation(item).label,
            role: item.accessibilityInfo?.role,
            tooltip: item.command?.tooltip || new MarkdownString(item.detail, { isTrusted: true, supportThemeIcons: true }),
            kind,
            command: item.command
        };
    }
};
LanguageStatus = LanguageStatus_1 = __decorate([
    __param(0, ILanguageStatusService),
    __param(1, IStatusbarService),
    __param(2, IEditorService),
    __param(3, IHoverService),
    __param(4, IOpenerService),
    __param(5, IStorageService)
], LanguageStatus);
export class ResetAction extends Action2 {
    constructor() {
        super({
            id: 'editor.inlayHints.Reset',
            title: localize2('reset', "Reset Language Status Interaction Counter"),
            category: Categories.View,
            f1: true
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove('languageStatus.interactCount', 0 /* StorageScope.PROFILE */);
    }
}
function computeText(text, loading) {
    return joinStrings([text !== '' && text, loading && '$(loading~spin)'], '\u00A0\u00A0');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGFuZ3VhZ2VTdGF0dXMvYnJvd3Nlci9sYW5ndWFnZVN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRyxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sNkNBQTZDLENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBbUIsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMzSCxPQUFPLEVBQTRDLGlCQUFpQixFQUFFLGtCQUFrQixFQUEwQyxNQUFNLGtEQUFrRCxDQUFDO0FBQzNMLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFB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