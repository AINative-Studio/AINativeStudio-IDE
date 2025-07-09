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
import { disposableTimeout } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableFromPromise, observableFromValueWithChangeEvent, observableSignalFromEvent, wasEventTriggeredRecently } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService } from '../../debug/common/debug.js';
let EditorTextPropertySignalsContribution = class EditorTextPropertySignalsContribution extends Disposable {
    constructor(_editorService, _instantiationService, _accessibilitySignalService) {
        super();
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._textProperties = [
            this._instantiationService.createInstance(MarkerTextProperty, AccessibilitySignal.errorAtPosition, AccessibilitySignal.errorOnLine, MarkerSeverity.Error),
            this._instantiationService.createInstance(MarkerTextProperty, AccessibilitySignal.warningAtPosition, AccessibilitySignal.warningOnLine, MarkerSeverity.Warning),
            this._instantiationService.createInstance(FoldedAreaTextProperty),
            this._instantiationService.createInstance(BreakpointTextProperty),
        ];
        this._someAccessibilitySignalIsEnabled = derived(this, reader => this._textProperties
            .flatMap(p => [p.lineSignal, p.positionSignal])
            .filter(isDefined)
            .some(signal => observableFromValueWithChangeEvent(this, this._accessibilitySignalService.getEnabledState(signal, false)).read(reader)));
        this._activeEditorObservable = observableFromEvent(this, this._editorService.onDidActiveEditorChange, (_) => {
            const activeTextEditorControl = this._editorService.activeTextEditorControl;
            const editor = isDiffEditor(activeTextEditorControl)
                ? activeTextEditorControl.getOriginalEditor()
                : isCodeEditor(activeTextEditorControl)
                    ? activeTextEditorControl
                    : undefined;
            return editor && editor.hasModel() ? { editor, model: editor.getModel() } : undefined;
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description updateSignalsEnabled */
            if (!this._someAccessibilitySignalIsEnabled.read(reader)) {
                return;
            }
            const activeEditor = this._activeEditorObservable.read(reader);
            if (activeEditor) {
                this._registerAccessibilitySignalsForEditor(activeEditor.editor, activeEditor.model, store);
            }
        }));
    }
    _registerAccessibilitySignalsForEditor(editor, editorModel, store) {
        let lastLine = -1;
        const ignoredLineSignalsForCurrentLine = new Set();
        const timeouts = store.add(new DisposableStore());
        const propertySources = this._textProperties.map(p => ({ source: p.createSource(editor, editorModel), property: p }));
        const didType = wasEventTriggeredRecently(editor.onDidChangeModelContent, 100, store);
        store.add(editor.onDidChangeCursorPosition(args => {
            timeouts.clear();
            if (args &&
                args.reason !== 3 /* CursorChangeReason.Explicit */ &&
                args.reason !== 0 /* CursorChangeReason.NotSet */) {
                // Ignore cursor changes caused by navigation (e.g. which happens when execution is paused).
                ignoredLineSignalsForCurrentLine.clear();
                return;
            }
            const trigger = (property, source, mode) => {
                const signal = mode === 'line' ? property.lineSignal : property.positionSignal;
                if (!signal
                    || !this._accessibilitySignalService.getEnabledState(signal, false).value
                    || !source.isPresent(position, mode, undefined)) {
                    return;
                }
                for (const modality of ['sound', 'announcement']) {
                    if (this._accessibilitySignalService.getEnabledState(signal, false, modality).value) {
                        const delay = this._accessibilitySignalService.getDelayMs(signal, modality, mode) + (didType.get() ? 1000 : 0);
                        timeouts.add(disposableTimeout(() => {
                            if (source.isPresent(position, mode, undefined)) {
                                if (!(mode === 'line') || !ignoredLineSignalsForCurrentLine.has(property)) {
                                    this._accessibilitySignalService.playSignal(signal, { modality });
                                }
                                ignoredLineSignalsForCurrentLine.add(property);
                            }
                        }, delay));
                    }
                }
            };
            // React to cursor changes
            const position = args.position;
            const lineNumber = position.lineNumber;
            if (lineNumber !== lastLine) {
                ignoredLineSignalsForCurrentLine.clear();
                lastLine = lineNumber;
                for (const p of propertySources) {
                    trigger(p.property, p.source, 'line');
                }
            }
            for (const p of propertySources) {
                trigger(p.property, p.source, 'positional');
            }
            // React to property state changes for the current cursor position
            for (const s of propertySources) {
                if (![s.property.lineSignal, s.property.positionSignal]
                    .some(s => s && this._accessibilitySignalService.getEnabledState(s, false).value)) {
                    return;
                }
                let lastValueAtPosition = undefined;
                let lastValueOnLine = undefined;
                timeouts.add(autorun(reader => {
                    const newValueAtPosition = s.source.isPresentAtPosition(args.position, reader);
                    const newValueOnLine = s.source.isPresentOnLine(args.position.lineNumber, reader);
                    if (lastValueAtPosition !== undefined && lastValueAtPosition !== undefined) {
                        if (!lastValueAtPosition && newValueAtPosition) {
                            trigger(s.property, s.source, 'positional');
                        }
                        if (!lastValueOnLine && newValueOnLine) {
                            trigger(s.property, s.source, 'line');
                        }
                    }
                    lastValueAtPosition = newValueAtPosition;
                    lastValueOnLine = newValueOnLine;
                }));
            }
        }));
    }
};
EditorTextPropertySignalsContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IInstantiationService),
    __param(2, IAccessibilitySignalService)
], EditorTextPropertySignalsContribution);
export { EditorTextPropertySignalsContribution };
class TextPropertySource {
    static { this.notPresent = new TextPropertySource({ isPresentAtPosition: () => false, isPresentOnLine: () => false }); }
    constructor(options) {
        this.isPresentOnLine = options.isPresentOnLine;
        this.isPresentAtPosition = options.isPresentAtPosition ?? (() => false);
    }
    isPresent(position, mode, reader) {
        return mode === 'line' ? this.isPresentOnLine(position.lineNumber, reader) : this.isPresentAtPosition(position, reader);
    }
}
let MarkerTextProperty = class MarkerTextProperty {
    constructor(positionSignal, lineSignal, severity, markerService) {
        this.positionSignal = positionSignal;
        this.lineSignal = lineSignal;
        this.severity = severity;
        this.markerService = markerService;
        this.debounceWhileTyping = true;
    }
    createSource(editor, model) {
        const obs = observableSignalFromEvent('onMarkerChanged', this.markerService.onMarkerChanged);
        return new TextPropertySource({
            isPresentAtPosition: (position, reader) => {
                obs.read(reader);
                const hasMarker = this.markerService
                    .read({ resource: model.uri })
                    .some((m) => m.severity === this.severity &&
                    m.startLineNumber <= position.lineNumber &&
                    position.lineNumber <= m.endLineNumber &&
                    m.startColumn <= position.column &&
                    position.column <= m.endColumn);
                return hasMarker;
            },
            isPresentOnLine: (lineNumber, reader) => {
                obs.read(reader);
                const hasMarker = this.markerService
                    .read({ resource: model.uri })
                    .some((m) => m.severity === this.severity &&
                    m.startLineNumber <= lineNumber &&
                    lineNumber <= m.endLineNumber);
                return hasMarker;
            }
        });
    }
};
MarkerTextProperty = __decorate([
    __param(3, IMarkerService)
], MarkerTextProperty);
class FoldedAreaTextProperty {
    constructor() {
        this.lineSignal = AccessibilitySignal.foldedArea;
    }
    createSource(editor, _model) {
        const foldingController = FoldingController.get(editor);
        if (!foldingController) {
            return TextPropertySource.notPresent;
        }
        const foldingModel = observableFromPromise(foldingController.getFoldingModel() ?? Promise.resolve(undefined));
        return new TextPropertySource({
            isPresentOnLine(lineNumber, reader) {
                const m = foldingModel.read(reader);
                const regionAtLine = m.value?.getRegionAtLine(lineNumber);
                const hasFolding = !regionAtLine
                    ? false
                    : regionAtLine.isCollapsed &&
                        regionAtLine.startLineNumber === lineNumber;
                return hasFolding;
            }
        });
    }
}
let BreakpointTextProperty = class BreakpointTextProperty {
    constructor(debugService) {
        this.debugService = debugService;
        this.lineSignal = AccessibilitySignal.break;
    }
    createSource(editor, model) {
        const signal = observableSignalFromEvent('onDidChangeBreakpoints', this.debugService.getModel().onDidChangeBreakpoints);
        const debugService = this.debugService;
        return new TextPropertySource({
            isPresentOnLine(lineNumber, reader) {
                signal.read(reader);
                const breakpoints = debugService
                    .getModel()
                    .getBreakpoints({ uri: model.uri, lineNumber });
                const hasBreakpoints = breakpoints.length > 0;
                return hasBreakpoints;
            }
        });
    }
};
BreakpointTextProperty = __decorate([
    __param(0, IDebugService)
], BreakpointTextProperty);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGV4dFByb3BlcnR5U2lnbmFsc0NvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5U2lnbmFscy9icm93c2VyL2VkaXRvclRleHRQcm9wZXJ0eVNpZ25hbHNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQVcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxrQ0FBa0MsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFPLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQWUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBSXRHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBeUIsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN6SyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7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