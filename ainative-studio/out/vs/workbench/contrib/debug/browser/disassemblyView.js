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
var DisassemblyView_1, BreakpointRenderer_1, InstructionRenderer_1;
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { $, addStandardDisposableListener, append } from '../../../../base/browser/dom.js';
import { binarySearch2 } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { applyFontInfo } from '../../../../editor/browser/config/domFontInfo.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { BareFontInfo } from '../../../../editor/common/config/fontInfo.js';
import { Range } from '../../../../editor/common/core/range.js';
import { StringBuilder } from '../../../../editor/common/core/stringBuilder.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { focusedStackFrameColor, topStackFrameColor } from './callStackEditorContribution.js';
import * as icons from './debugIcons.js';
import { CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST, DISASSEMBLY_VIEW_ID, IDebugService } from '../common/debug.js';
import { InstructionBreakpoint } from '../common/debugModel.js';
import { getUriFromSource } from '../common/debugSource.js';
import { isUri, sourcesEqual } from '../common/debugUtils.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
// Special entry as a placeholer when disassembly is not available
const disassemblyNotAvailable = {
    allowBreakpoint: false,
    isBreakpointSet: false,
    isBreakpointEnabled: false,
    instructionReference: '',
    instructionOffset: 0,
    instructionReferenceOffset: 0,
    address: 0n,
    instruction: {
        address: '-1',
        instruction: localize('instructionNotAvailable', "Disassembly not available.")
    },
};
let DisassemblyView = class DisassemblyView extends EditorPane {
    static { DisassemblyView_1 = this; }
    static { this.NUM_INSTRUCTIONS_TO_LOAD = 50; }
    constructor(group, telemetryService, themeService, storageService, _configurationService, _instantiationService, _debugService) {
        super(DISASSEMBLY_VIEW_ID, group, telemetryService, themeService, storageService);
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._debugService = _debugService;
        this._instructionBpList = [];
        this._enableSourceCodeRender = true;
        this._loadingLock = false;
        this._referenceToMemoryAddress = new Map();
        this._disassembledInstructions = undefined;
        this._onDidChangeStackFrame = this._register(new Emitter({ leakWarningThreshold: 1000 }));
        this._previousDebuggingState = _debugService.state;
        this._register(_configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug')) {
                // show/hide source code requires changing height which WorkbenchTable doesn't support dynamic height, thus force a total reload.
                const newValue = this._configurationService.getValue('debug').disassemblyView.showSourceCode;
                if (this._enableSourceCodeRender !== newValue) {
                    this._enableSourceCodeRender = newValue;
                    // todo: trigger rerender
                }
                else {
                    this._disassembledInstructions?.rerender();
                }
            }
        }));
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('editor')) {
                    this._fontInfo = this.createFontInfo();
                }
            }));
        }
        return this._fontInfo;
    }
    createFontInfo() {
        return BareFontInfo.createFromRawSettings(this._configurationService.getValue('editor'), PixelRatio.getInstance(this.window).value);
    }
    get currentInstructionAddresses() {
        return this._debugService.getModel().getSessions(false).
            map(session => session.getAllThreads()).
            reduce((prev, curr) => prev.concat(curr), []).
            map(thread => thread.getTopStackFrame()).
            map(frame => frame?.instructionPointerReference).
            map(ref => ref ? this.getReferenceAddress(ref) : undefined);
    }
    // Instruction reference of the top stack frame of the focused stack
    get focusedCurrentInstructionReference() {
        return this._debugService.getViewModel().focusedStackFrame?.thread.getTopStackFrame()?.instructionPointerReference;
    }
    get focusedCurrentInstructionAddress() {
        const ref = this.focusedCurrentInstructionReference;
        return ref ? this.getReferenceAddress(ref) : undefined;
    }
    get focusedInstructionReference() {
        return this._debugService.getViewModel().focusedStackFrame?.instructionPointerReference;
    }
    get focusedInstructionAddress() {
        const ref = this.focusedInstructionReference;
        return ref ? this.getReferenceAddress(ref) : undefined;
    }
    get isSourceCodeRender() { return this._enableSourceCodeRender; }
    get debugSession() {
        return this._debugService.getViewModel().focusedSession;
    }
    get onDidChangeStackFrame() { return this._onDidChangeStackFrame.event; }
    get focusedAddressAndOffset() {
        const element = this._disassembledInstructions?.getFocusedElements()[0];
        if (!element) {
            return undefined;
        }
        const reference = element.instructionReference;
        const offset = Number(element.address - this.getReferenceAddress(reference));
        return { reference, offset, address: element.address };
    }
    createEditor(parent) {
        this._enableSourceCodeRender = this._configurationService.getValue('debug').disassemblyView.showSourceCode;
        const lineHeight = this.fontInfo.lineHeight;
        const thisOM = this;
        const delegate = new class {
            constructor() {
                this.headerRowHeight = 0; // No header
            }
            getHeight(row) {
                if (thisOM.isSourceCodeRender && row.showSourceLocation && row.instruction.location?.path && row.instruction.line) {
                    // instruction line + source lines
                    if (row.instruction.endLine) {
                        return lineHeight * (row.instruction.endLine - row.instruction.line + 2);
                    }
                    else {
                        // source is only a single line.
                        return lineHeight * 2;
                    }
                }
                // just instruction line
                return lineHeight;
            }
        };
        const instructionRenderer = this._register(this._instantiationService.createInstance(InstructionRenderer, this));
        this._disassembledInstructions = this._register(this._instantiationService.createInstance(WorkbenchTable, 'DisassemblyView', parent, delegate, [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: this.fontInfo.lineHeight,
                maximumWidth: this.fontInfo.lineHeight,
                templateId: BreakpointRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('disassemblyTableColumnLabel', "instructions"),
                tooltip: '',
                weight: 0.3,
                templateId: InstructionRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
        ], [
            this._instantiationService.createInstance(BreakpointRenderer, this),
            instructionRenderer,
        ], {
            identityProvider: { getId: (e) => e.instruction.address },
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: editorBackground
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: false,
            accessibilityProvider: new AccessibilityProvider(),
            mouseSupport: false
        }));
        this._disassembledInstructions.domNode.classList.add('disassembly-view');
        if (this.focusedInstructionReference) {
            this.reloadDisassembly(this.focusedInstructionReference, 0);
        }
        this._register(this._disassembledInstructions.onDidScroll(e => {
            if (this._loadingLock) {
                return;
            }
            if (e.oldScrollTop > e.scrollTop && e.scrollTop < e.height) {
                this._loadingLock = true;
                const prevTop = Math.floor(e.scrollTop / this.fontInfo.lineHeight);
                this.scrollUp_LoadDisassembledInstructions(DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD).then((loaded) => {
                    if (loaded > 0) {
                        this._disassembledInstructions.reveal(prevTop + loaded, 0);
                    }
                    this._loadingLock = false;
                });
            }
            else if (e.oldScrollTop < e.scrollTop && e.scrollTop + e.height > e.scrollHeight - e.height) {
                this._loadingLock = true;
                this.scrollDown_LoadDisassembledInstructions(DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD).then(() => { this._loadingLock = false; });
            }
        }));
        this._register(this._debugService.getViewModel().onDidFocusStackFrame(({ stackFrame }) => {
            if (this._disassembledInstructions && stackFrame?.instructionPointerReference) {
                this.goToInstructionAndOffset(stackFrame.instructionPointerReference, 0);
            }
            this._onDidChangeStackFrame.fire();
        }));
        // refresh breakpoints view
        this._register(this._debugService.getModel().onDidChangeBreakpoints(bpEvent => {
            if (bpEvent && this._disassembledInstructions) {
                // draw viewable BP
                let changed = false;
                bpEvent.added?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            this._disassembledInstructions.row(index).isBreakpointSet = true;
                            this._disassembledInstructions.row(index).isBreakpointEnabled = bp.enabled;
                            changed = true;
                        }
                    }
                });
                bpEvent.removed?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            this._disassembledInstructions.row(index).isBreakpointSet = false;
                            changed = true;
                        }
                    }
                });
                bpEvent.changed?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            if (this._disassembledInstructions.row(index).isBreakpointEnabled !== bp.enabled) {
                                this._disassembledInstructions.row(index).isBreakpointEnabled = bp.enabled;
                                changed = true;
                            }
                        }
                    }
                });
                // get an updated list so that items beyond the current range would render when reached.
                this._instructionBpList = this._debugService.getModel().getInstructionBreakpoints();
                // breakpoints restored from a previous session can be based on memory
                // references that may no longer exist in the current session. Request
                // those instructions to be loaded so the BP can be displayed.
                for (const bp of this._instructionBpList) {
                    this.primeMemoryReference(bp.instructionReference);
                }
                if (changed) {
                    this._onDidChangeStackFrame.fire();
                }
            }
        }));
        this._register(this._debugService.onDidChangeState(e => {
            if ((e === 3 /* State.Running */ || e === 2 /* State.Stopped */) &&
                (this._previousDebuggingState !== 3 /* State.Running */ && this._previousDebuggingState !== 2 /* State.Stopped */)) {
                // Just started debugging, clear the view
                this.clear();
                this._enableSourceCodeRender = this._configurationService.getValue('debug').disassemblyView.showSourceCode;
            }
            this._previousDebuggingState = e;
            this._onDidChangeStackFrame.fire();
        }));
    }
    layout(dimension) {
        this._disassembledInstructions?.layout(dimension.height);
    }
    async goToInstructionAndOffset(instructionReference, offset, focus) {
        let addr = this._referenceToMemoryAddress.get(instructionReference);
        if (addr === undefined) {
            await this.loadDisassembledInstructions(instructionReference, 0, -DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 2);
            addr = this._referenceToMemoryAddress.get(instructionReference);
        }
        if (addr) {
            this.goToAddress(addr + BigInt(offset), focus);
        }
    }
    /** Gets the address associated with the instruction reference. */
    getReferenceAddress(instructionReference) {
        return this._referenceToMemoryAddress.get(instructionReference);
    }
    /**
     * Go to the address provided. If no address is provided, reveal the address of the currently focused stack frame. Returns false if that address is not available.
     */
    goToAddress(address, focus) {
        if (!this._disassembledInstructions) {
            return false;
        }
        if (!address) {
            return false;
        }
        const index = this.getIndexFromAddress(address);
        if (index >= 0) {
            this._disassembledInstructions.reveal(index);
            if (focus) {
                this._disassembledInstructions.domFocus();
                this._disassembledInstructions.setFocus([index]);
            }
            return true;
        }
        return false;
    }
    async scrollUp_LoadDisassembledInstructions(instructionCount) {
        const first = this._disassembledInstructions?.row(0);
        if (first) {
            return this.loadDisassembledInstructions(first.instructionReference, first.instructionReferenceOffset, first.instructionOffset - instructionCount, instructionCount);
        }
        return 0;
    }
    async scrollDown_LoadDisassembledInstructions(instructionCount) {
        const last = this._disassembledInstructions?.row(this._disassembledInstructions?.length - 1);
        if (last) {
            return this.loadDisassembledInstructions(last.instructionReference, last.instructionReferenceOffset, last.instructionOffset + 1, instructionCount);
        }
        return 0;
    }
    /**
     * Sets the memory reference address. We don't just loadDisassembledInstructions
     * for this, since we can't really deal with discontiguous ranges (we can't
     * detect _if_ a range is discontiguous since we don't know how much memory
     * comes between instructions.)
     */
    async primeMemoryReference(instructionReference) {
        if (this._referenceToMemoryAddress.has(instructionReference)) {
            return true;
        }
        const s = await this.debugSession?.disassemble(instructionReference, 0, 0, 1);
        if (s && s.length > 0) {
            try {
                this._referenceToMemoryAddress.set(instructionReference, BigInt(s[0].address));
                return true;
            }
            catch {
                return false;
            }
        }
        return false;
    }
    /** Loads disasembled instructions. Returns the number of instructions that were loaded. */
    async loadDisassembledInstructions(instructionReference, offset, instructionOffset, instructionCount) {
        const session = this.debugSession;
        const resultEntries = await session?.disassemble(instructionReference, offset, instructionOffset, instructionCount);
        // Ensure we always load the baseline instructions so we know what address the instructionReference refers to.
        if (!this._referenceToMemoryAddress.has(instructionReference) && instructionOffset !== 0) {
            await this.loadDisassembledInstructions(instructionReference, 0, 0, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD);
        }
        if (session && resultEntries && this._disassembledInstructions) {
            const newEntries = [];
            let lastLocation;
            let lastLine;
            for (let i = 0; i < resultEntries.length; i++) {
                const instruction = resultEntries[i];
                const thisInstructionOffset = instructionOffset + i;
                // Forward fill the missing location as detailed in the DAP spec.
                if (instruction.location) {
                    lastLocation = instruction.location;
                    lastLine = undefined;
                }
                if (instruction.line) {
                    const currentLine = {
                        startLineNumber: instruction.line,
                        startColumn: instruction.column ?? 0,
                        endLineNumber: instruction.endLine ?? instruction.line,
                        endColumn: instruction.endColumn ?? 0,
                    };
                    // Add location only to the first unique range. This will give the appearance of grouping of instructions.
                    if (!Range.equalsRange(currentLine, lastLine ?? null)) {
                        lastLine = currentLine;
                        instruction.location = lastLocation;
                    }
                }
                let address;
                try {
                    address = BigInt(instruction.address);
                }
                catch {
                    console.error(`Could not parse disassembly address ${instruction.address} (in ${JSON.stringify(instruction)})`);
                    continue;
                }
                const entry = {
                    allowBreakpoint: true,
                    isBreakpointSet: false,
                    isBreakpointEnabled: false,
                    instructionReference,
                    instructionReferenceOffset: offset,
                    instructionOffset: thisInstructionOffset,
                    instruction,
                    address,
                };
                newEntries.push(entry);
                // if we just loaded the first instruction for this reference, mark its address.
                if (offset === 0 && thisInstructionOffset === 0) {
                    this._referenceToMemoryAddress.set(instructionReference, address);
                }
            }
            if (newEntries.length === 0) {
                return 0;
            }
            const refBaseAddress = this._referenceToMemoryAddress.get(instructionReference);
            const bps = this._instructionBpList.map(p => {
                const base = this._referenceToMemoryAddress.get(p.instructionReference);
                if (!base) {
                    return undefined;
                }
                return {
                    enabled: p.enabled,
                    address: base + BigInt(p.offset || 0),
                };
            });
            if (refBaseAddress !== undefined) {
                for (const entry of newEntries) {
                    const bp = bps.find(p => p?.address === entry.address);
                    if (bp) {
                        entry.isBreakpointSet = true;
                        entry.isBreakpointEnabled = bp.enabled;
                    }
                }
            }
            const da = this._disassembledInstructions;
            if (da.length === 1 && this._disassembledInstructions.row(0) === disassemblyNotAvailable) {
                da.splice(0, 1);
            }
            const firstAddr = newEntries[0].address;
            const lastAddr = newEntries[newEntries.length - 1].address;
            const startN = binarySearch2(da.length, i => Number(da.row(i).address - firstAddr));
            const start = startN < 0 ? ~startN : startN;
            const endN = binarySearch2(da.length, i => Number(da.row(i).address - lastAddr));
            const end = endN < 0 ? ~endN : endN + 1;
            const toDelete = end - start;
            // Go through everything we're about to add, and only show the source
            // location if it's different from the previous one, "grouping" instructions by line
            let lastLocated;
            for (let i = start - 1; i >= 0; i--) {
                const { instruction } = da.row(i);
                if (instruction.location && instruction.line !== undefined) {
                    lastLocated = instruction;
                    break;
                }
            }
            const shouldShowLocation = (instruction) => instruction.line !== undefined && instruction.location !== undefined &&
                (!lastLocated || !sourcesEqual(instruction.location, lastLocated.location) || instruction.line !== lastLocated.line);
            for (const entry of newEntries) {
                if (shouldShowLocation(entry.instruction)) {
                    entry.showSourceLocation = true;
                    lastLocated = entry.instruction;
                }
            }
            da.splice(start, toDelete, newEntries);
            return newEntries.length - toDelete;
        }
        return 0;
    }
    getIndexFromReferenceAndOffset(instructionReference, offset) {
        const addr = this._referenceToMemoryAddress.get(instructionReference);
        if (addr === undefined) {
            return -1;
        }
        return this.getIndexFromAddress(addr + BigInt(offset));
    }
    getIndexFromAddress(address) {
        const disassembledInstructions = this._disassembledInstructions;
        if (disassembledInstructions && disassembledInstructions.length > 0) {
            return binarySearch2(disassembledInstructions.length, index => {
                const row = disassembledInstructions.row(index);
                return Number(row.address - address);
            });
        }
        return -1;
    }
    /**
     * Clears the table and reload instructions near the target address
     */
    reloadDisassembly(instructionReference, offset) {
        if (!this._disassembledInstructions) {
            return;
        }
        this._loadingLock = true; // stop scrolling during the load.
        this.clear();
        this._instructionBpList = this._debugService.getModel().getInstructionBreakpoints();
        this.loadDisassembledInstructions(instructionReference, offset, -DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 4, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 8).then(() => {
            // on load, set the target instruction in the middle of the page.
            if (this._disassembledInstructions.length > 0) {
                const targetIndex = Math.floor(this._disassembledInstructions.length / 2);
                this._disassembledInstructions.reveal(targetIndex, 0.5);
                // Always focus the target address on reload, or arrow key navigation would look terrible
                this._disassembledInstructions.domFocus();
                this._disassembledInstructions.setFocus([targetIndex]);
            }
            this._loadingLock = false;
        });
    }
    clear() {
        this._referenceToMemoryAddress.clear();
        this._disassembledInstructions?.splice(0, this._disassembledInstructions.length, [disassemblyNotAvailable]);
    }
};
DisassemblyView = DisassemblyView_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IDebugService)
], DisassemblyView);
export { DisassemblyView };
let BreakpointRenderer = class BreakpointRenderer {
    static { BreakpointRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'breakpoint'; }
    constructor(_disassemblyView, _debugService) {
        this._disassemblyView = _disassemblyView;
        this._debugService = _debugService;
        this.templateId = BreakpointRenderer_1.TEMPLATE_ID;
        this._breakpointIcon = 'codicon-' + icons.breakpoint.regular.id;
        this._breakpointDisabledIcon = 'codicon-' + icons.breakpoint.disabled.id;
        this._breakpointHintIcon = 'codicon-' + icons.debugBreakpointHint.id;
        this._debugStackframe = 'codicon-' + icons.debugStackframe.id;
        this._debugStackframeFocused = 'codicon-' + icons.debugStackframeFocused.id;
    }
    renderTemplate(container) {
        // align from the bottom so that it lines up with instruction when source code is present.
        container.style.alignSelf = 'flex-end';
        const icon = append(container, $('.codicon'));
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.height = this._disassemblyView.fontInfo.lineHeight + 'px';
        const currentElement = { element: undefined };
        const disposables = [
            this._disassemblyView.onDidChangeStackFrame(() => this.rerenderDebugStackframe(icon, currentElement.element)),
            addStandardDisposableListener(container, 'mouseover', () => {
                if (currentElement.element?.allowBreakpoint) {
                    icon.classList.add(this._breakpointHintIcon);
                }
            }),
            addStandardDisposableListener(container, 'mouseout', () => {
                if (currentElement.element?.allowBreakpoint) {
                    icon.classList.remove(this._breakpointHintIcon);
                }
            }),
            addStandardDisposableListener(container, 'click', () => {
                if (currentElement.element?.allowBreakpoint) {
                    // click show hint while waiting for BP to resolve.
                    icon.classList.add(this._breakpointHintIcon);
                    const reference = currentElement.element.instructionReference;
                    const offset = Number(currentElement.element.address - this._disassemblyView.getReferenceAddress(reference));
                    if (currentElement.element.isBreakpointSet) {
                        this._debugService.removeInstructionBreakpoints(reference, offset);
                    }
                    else if (currentElement.element.allowBreakpoint && !currentElement.element.isBreakpointSet) {
                        this._debugService.addInstructionBreakpoint({ instructionReference: reference, offset, address: currentElement.element.address, canPersist: false });
                    }
                }
            })
        ];
        return { currentElement, icon, disposables };
    }
    renderElement(element, index, templateData, height) {
        templateData.currentElement.element = element;
        this.rerenderDebugStackframe(templateData.icon, element);
    }
    disposeTemplate(templateData) {
        dispose(templateData.disposables);
        templateData.disposables = [];
    }
    rerenderDebugStackframe(icon, element) {
        if (element?.address === this._disassemblyView.focusedCurrentInstructionAddress) {
            icon.classList.add(this._debugStackframe);
        }
        else if (element?.address === this._disassemblyView.focusedInstructionAddress) {
            icon.classList.add(this._debugStackframeFocused);
        }
        else {
            icon.classList.remove(this._debugStackframe);
            icon.classList.remove(this._debugStackframeFocused);
        }
        icon.classList.remove(this._breakpointHintIcon);
        if (element?.isBreakpointSet) {
            if (element.isBreakpointEnabled) {
                icon.classList.add(this._breakpointIcon);
                icon.classList.remove(this._breakpointDisabledIcon);
            }
            else {
                icon.classList.remove(this._breakpointIcon);
                icon.classList.add(this._breakpointDisabledIcon);
            }
        }
        else {
            icon.classList.remove(this._breakpointIcon);
            icon.classList.remove(this._breakpointDisabledIcon);
        }
    }
};
BreakpointRenderer = BreakpointRenderer_1 = __decorate([
    __param(1, IDebugService)
], BreakpointRenderer);
let InstructionRenderer = class InstructionRenderer extends Disposable {
    static { InstructionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'instruction'; }
    static { this.INSTRUCTION_ADDR_MIN_LENGTH = 25; }
    static { this.INSTRUCTION_BYTES_MIN_LENGTH = 30; }
    constructor(_disassemblyView, themeService, editorService, textModelService, uriService, logService) {
        super();
        this._disassemblyView = _disassemblyView;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.uriService = uriService;
        this.logService = logService;
        this.templateId = InstructionRenderer_1.TEMPLATE_ID;
        this._topStackFrameColor = themeService.getColorTheme().getColor(topStackFrameColor);
        this._focusedStackFrameColor = themeService.getColorTheme().getColor(focusedStackFrameColor);
        this._register(themeService.onDidColorThemeChange(e => {
            this._topStackFrameColor = e.getColor(topStackFrameColor);
            this._focusedStackFrameColor = e.getColor(focusedStackFrameColor);
        }));
    }
    renderTemplate(container) {
        const sourcecode = append(container, $('.sourcecode'));
        const instruction = append(container, $('.instruction'));
        this.applyFontInfo(sourcecode);
        this.applyFontInfo(instruction);
        const currentElement = { element: undefined };
        const cellDisposable = [];
        const disposables = [
            this._disassemblyView.onDidChangeStackFrame(() => this.rerenderBackground(instruction, sourcecode, currentElement.element)),
            addStandardDisposableListener(sourcecode, 'dblclick', () => this.openSourceCode(currentElement.element?.instruction)),
        ];
        return { currentElement, instruction, sourcecode, cellDisposable, disposables };
    }
    renderElement(element, index, templateData, height) {
        this.renderElementInner(element, index, templateData, height);
    }
    async renderElementInner(element, index, templateData, height) {
        templateData.currentElement.element = element;
        const instruction = element.instruction;
        templateData.sourcecode.innerText = '';
        const sb = new StringBuilder(1000);
        if (this._disassemblyView.isSourceCodeRender && element.showSourceLocation && instruction.location?.path && instruction.line !== undefined) {
            const sourceURI = this.getUriFromSource(instruction);
            if (sourceURI) {
                let textModel = undefined;
                const sourceSB = new StringBuilder(10000);
                const ref = await this.textModelService.createModelReference(sourceURI);
                if (templateData.currentElement.element !== element) {
                    return; // avoid a race, #192831
                }
                textModel = ref.object.textEditorModel;
                templateData.cellDisposable.push(ref);
                // templateData could have moved on during async.  Double check if it is still the same source.
                if (textModel && templateData.currentElement.element === element) {
                    let lineNumber = instruction.line;
                    while (lineNumber && lineNumber >= 1 && lineNumber <= textModel.getLineCount()) {
                        const lineContent = textModel.getLineContent(lineNumber);
                        sourceSB.appendString(`  ${lineNumber}: `);
                        sourceSB.appendString(lineContent + '\n');
                        if (instruction.endLine && lineNumber < instruction.endLine) {
                            lineNumber++;
                            continue;
                        }
                        break;
                    }
                    templateData.sourcecode.innerText = sourceSB.build();
                }
            }
        }
        let spacesToAppend = 10;
        if (instruction.address !== '-1') {
            sb.appendString(instruction.address);
            if (instruction.address.length < InstructionRenderer_1.INSTRUCTION_ADDR_MIN_LENGTH) {
                spacesToAppend = InstructionRenderer_1.INSTRUCTION_ADDR_MIN_LENGTH - instruction.address.length;
            }
            for (let i = 0; i < spacesToAppend; i++) {
                sb.appendString(' ');
            }
        }
        if (instruction.instructionBytes) {
            sb.appendString(instruction.instructionBytes);
            spacesToAppend = 10;
            if (instruction.instructionBytes.length < InstructionRenderer_1.INSTRUCTION_BYTES_MIN_LENGTH) {
                spacesToAppend = InstructionRenderer_1.INSTRUCTION_BYTES_MIN_LENGTH - instruction.instructionBytes.length;
            }
            for (let i = 0; i < spacesToAppend; i++) {
                sb.appendString(' ');
            }
        }
        sb.appendString(instruction.instruction);
        templateData.instruction.innerText = sb.build();
        this.rerenderBackground(templateData.instruction, templateData.sourcecode, element);
    }
    disposeElement(element, index, templateData, height) {
        dispose(templateData.cellDisposable);
        templateData.cellDisposable = [];
    }
    disposeTemplate(templateData) {
        dispose(templateData.disposables);
        templateData.disposables = [];
    }
    rerenderBackground(instruction, sourceCode, element) {
        if (element && this._disassemblyView.currentInstructionAddresses.includes(element.address)) {
            instruction.style.background = this._topStackFrameColor?.toString() || 'transparent';
        }
        else if (element?.address === this._disassemblyView.focusedInstructionAddress) {
            instruction.style.background = this._focusedStackFrameColor?.toString() || 'transparent';
        }
        else {
            instruction.style.background = 'transparent';
        }
    }
    openSourceCode(instruction) {
        if (instruction) {
            const sourceURI = this.getUriFromSource(instruction);
            const selection = instruction.endLine ? {
                startLineNumber: instruction.line,
                endLineNumber: instruction.endLine,
                startColumn: instruction.column || 1,
                endColumn: instruction.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
            } : {
                startLineNumber: instruction.line,
                endLineNumber: instruction.line,
                startColumn: instruction.column || 1,
                endColumn: instruction.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
            };
            this.editorService.openEditor({
                resource: sourceURI,
                description: localize('editorOpenedFromDisassemblyDescription', "from disassembly"),
                options: {
                    preserveFocus: false,
                    selection: selection,
                    revealIfOpened: true,
                    selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                    pinned: false,
                }
            });
        }
    }
    getUriFromSource(instruction) {
        // Try to resolve path before consulting the debugSession.
        const path = instruction.location.path;
        if (path && isUri(path)) { // path looks like a uri
            return this.uriService.asCanonicalUri(URI.parse(path));
        }
        // assume a filesystem path
        if (path && isAbsolute(path)) {
            return this.uriService.asCanonicalUri(URI.file(path));
        }
        return getUriFromSource(instruction.location, instruction.location.path, this._disassemblyView.debugSession.getId(), this.uriService, this.logService);
    }
    applyFontInfo(element) {
        applyFontInfo(element, this._disassemblyView.fontInfo);
        element.style.whiteSpace = 'pre';
    }
};
InstructionRenderer = InstructionRenderer_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IEditorService),
    __param(3, ITextModelService),
    __param(4, IUriIdentityService),
    __param(5, ILogService)
], InstructionRenderer);
class AccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('disassemblyView', "Disassembly View");
    }
    getAriaLabel(element) {
        let label = '';
        const instruction = element.instruction;
        if (instruction.address !== '-1') {
            label += `${localize('instructionAddress', "Address")}: ${instruction.address}`;
        }
        if (instruction.instructionBytes) {
            label += `, ${localize('instructionBytes', "Bytes")}: ${instruction.instructionBytes}`;
        }
        label += `, ${localize(`instructionText`, "Instruction")}: ${instruction.instruction}`;
        return label;
    }
}
let DisassemblyViewContribution = class DisassemblyViewContribution {
    constructor(editorService, debugService, contextKeyService) {
        contextKeyService.bufferChangeEvents(() => {
            this._languageSupportsDisassembleRequest = CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST.bindTo(contextKeyService);
        });
        const onDidActiveEditorChangeListener = () => {
            if (this._onDidChangeModelLanguage) {
                this._onDidChangeModelLanguage.dispose();
                this._onDidChangeModelLanguage = undefined;
            }
            const activeTextEditorControl = editorService.activeTextEditorControl;
            if (isCodeEditor(activeTextEditorControl)) {
                const language = activeTextEditorControl.getModel()?.getLanguageId();
                // TODO: instead of using idDebuggerInterestedInLanguage, have a specific ext point for languages
                // support disassembly
                this._languageSupportsDisassembleRequest?.set(!!language && debugService.getAdapterManager().someDebuggerInterestedInLanguage(language));
                this._onDidChangeModelLanguage = activeTextEditorControl.onDidChangeModelLanguage(e => {
                    this._languageSupportsDisassembleRequest?.set(debugService.getAdapterManager().someDebuggerInterestedInLanguage(e.newLanguage));
                });
            }
            else {
                this._languageSupportsDisassembleRequest?.set(false);
            }
        };
        onDidActiveEditorChangeListener();
        this._onDidActiveEditorChangeListener = editorService.onDidActiveEditorChange(onDidActiveEditorChangeListener);
    }
    dispose() {
        this._onDidActiveEditorChangeListener.dispose();
        this._onDidChangeModelLanguage?.dispose();
    }
};
DisassemblyViewContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IDebugService),
    __param(2, IContextKeyService)
], DisassemblyViewContribution);
export { DisassemblyViewContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzYXNzZW1ibHlWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGlzYXNzZW1ibHlWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLENBQUMsRUFBYSw2QkFBNkIsRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUd0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUs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