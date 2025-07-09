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
import * as dom from '../../../../base/browser/dom.js';
import { Delayer } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MicrotaskDelay } from '../../../../base/common/symbols.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { TerminalExtensionsRegistry } from './terminalExtensions.js';
import { TerminalWidgetManager } from './widgets/widgetManager.js';
let DetachedTerminal = class DetachedTerminal extends Disposable {
    get xterm() {
        return this._xterm;
    }
    constructor(_xterm, options, instantiationService) {
        super();
        this._xterm = _xterm;
        this._widgets = this._register(new TerminalWidgetManager());
        this.capabilities = new TerminalCapabilityStore();
        this._contributions = new Map();
        this._register(_xterm);
        // Initialize contributions
        const contributionDescs = TerminalExtensionsRegistry.getTerminalContributions();
        for (const desc of contributionDescs) {
            if (this._contributions.has(desc.id)) {
                onUnexpectedError(new Error(`Cannot have two terminal contributions with the same id ${desc.id}`));
                continue;
            }
            if (desc.canRunInDetachedTerminals === false) {
                continue;
            }
            let contribution;
            try {
                contribution = instantiationService.createInstance(desc.ctor, {
                    instance: this,
                    processManager: options.processInfo,
                    widgetManager: this._widgets
                });
                this._contributions.set(desc.id, contribution);
                this._register(contribution);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        // xterm is already by the time DetachedTerminal is created, so trigger everything
        // on the next microtask, allowing the caller to do any extra initialization
        this._register(new Delayer(MicrotaskDelay)).trigger(() => {
            for (const contr of this._contributions.values()) {
                contr.xtermReady?.(this._xterm);
            }
        });
    }
    get selection() {
        return this._xterm && this.hasSelection() ? this._xterm.raw.getSelection() : undefined;
    }
    hasSelection() {
        return this._xterm.hasSelection();
    }
    clearSelection() {
        this._xterm.clearSelection();
    }
    focus(force) {
        if (force || !dom.getActiveWindow().getSelection()?.toString()) {
            this.xterm.focus();
        }
    }
    attachToElement(container, options) {
        this.domElement = container;
        const screenElement = this._xterm.attachToElement(container, options);
        this._widgets.attachToElement(screenElement);
    }
    forceScrollbarVisibility() {
        this.domElement?.classList.add('force-scrollbar');
    }
    resetScrollbarVisibility() {
        this.domElement?.classList.remove('force-scrollbar');
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
};
DetachedTerminal = __decorate([
    __param(2, IInstantiationService)
], DetachedTerminal);
export { DetachedTerminal };
/**
 * Implements {@link ITerminalProcessInfo} for a detached terminal where most
 * properties are stubbed. Properties are mutable and can be updated by
 * the instantiator.
 */
export class DetachedProcessInfo {
    constructor(initialValues) {
        this.processState = 3 /* ProcessState.Running */;
        this.ptyProcessReady = Promise.resolve();
        this.initialCwd = '';
        this.shouldPersist = false;
        this.hasWrittenData = false;
        this.hasChildProcesses = false;
        this.capabilities = new TerminalCapabilityStore();
        this.shellIntegrationNonce = '';
        Object.assign(this, initialValues);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0YWNoZWRUZXJtaW5hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL2RldGFjaGVkVGVybWluYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUl2SCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUs1RCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFPL0MsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxZQUNrQixNQUFxQixFQUN0QyxPQUE4QixFQUNQLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQztRQUpTLFdBQU0sR0FBTixNQUFNLENBQWU7UUFYdEIsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFDeEQsaUJBQVksR0FB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