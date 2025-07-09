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
var EditorDictation_1;
import './editorDictation.css';
import { localize, localize2 } from '../../../../../nls.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { HasSpeechProvider, ISpeechService, SpeechToTextInProgress, SpeechToTextStatus } from '../../../speech/common/speechService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { EditorAction2, registerEditorContribution } from '../../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { toAction } from '../../../../../base/common/actions.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isWindows } from '../../../../../base/common/platform.js';
const EDITOR_DICTATION_IN_PROGRESS = new RawContextKey('editorDictation.inProgress', false);
const VOICE_CATEGORY = localize2('voiceCategory', "Voice");
export class EditorDictationStartAction extends EditorAction2 {
    constructor() {
        super({
            id: 'workbench.action.editorDictation.start',
            title: localize2('startDictation', "Start Dictation in Editor"),
            category: VOICE_CATEGORY,
            precondition: ContextKeyExpr.and(HasSpeechProvider, SpeechToTextInProgress.toNegated(), // disable when any speech-to-text is in progress
            EditorContextKeys.readOnly.toNegated() // disable in read-only editors
            ),
            f1: true,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 52 /* KeyCode.KeyV */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                secondary: isWindows ? [
                    512 /* KeyMod.Alt */ | 91 /* KeyCode.Backquote */
                ] : undefined
            }
        });
    }
    runEditorCommand(accessor, editor) {
        const keybindingService = accessor.get(IKeybindingService);
        const holdMode = keybindingService.enableKeybindingHoldMode(this.desc.id);
        if (holdMode) {
            let shouldCallStop = false;
            const handle = setTimeout(() => {
                shouldCallStop = true;
            }, 500);
            holdMode.finally(() => {
                clearTimeout(handle);
                if (shouldCallStop) {
                    EditorDictation.get(editor)?.stop();
                }
            });
        }
        EditorDictation.get(editor)?.start();
    }
}
export class EditorDictationStopAction extends EditorAction2 {
    static { this.ID = 'workbench.action.editorDictation.stop'; }
    constructor() {
        super({
            id: EditorDictationStopAction.ID,
            title: localize2('stopDictation', "Stop Dictation in Editor"),
            category: VOICE_CATEGORY,
            precondition: EDITOR_DICTATION_IN_PROGRESS,
            f1: true,
            keybinding: {
                primary: 9 /* KeyCode.Escape */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        EditorDictation.get(editor)?.stop();
    }
}
export class DictationWidget extends Disposable {
    constructor(editor, keybindingService) {
        super();
        this.editor = editor;
        this.suppressMouseDown = true;
        this.allowEditorOverflow = true;
        this.domNode = document.createElement('div');
        const actionBar = this._register(new ActionBar(this.domNode));
        const stopActionKeybinding = keybindingService.lookupKeybinding(EditorDictationStopAction.ID)?.getLabel();
        actionBar.push(toAction({
            id: EditorDictationStopAction.ID,
            label: stopActionKeybinding ? localize('stopDictationShort1', "Stop Dictation ({0})", stopActionKeybinding) : localize('stopDictationShort2', "Stop Dictation"),
            class: ThemeIcon.asClassName(Codicon.micFilled),
            run: () => EditorDictation.get(editor)?.stop()
        }), { icon: true, label: false, keybinding: stopActionKeybinding });
        this.domNode.classList.add('editor-dictation-widget');
        this.domNode.appendChild(actionBar.domNode);
    }
    getId() {
        return 'editorDictation';
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        if (!this.editor.hasModel()) {
            return null;
        }
        const selection = this.editor.getSelection();
        return {
            position: selection.getPosition(),
            preference: [
                selection.getPosition().equals(selection.getStartPosition()) ? 1 /* ContentWidgetPositionPreference.ABOVE */ : 2 /* ContentWidgetPositionPreference.BELOW */,
                0 /* ContentWidgetPositionPreference.EXACT */
            ]
        };
    }
    beforeRender() {
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const width = this.editor.getLayoutInfo().contentWidth * 0.7;
        this.domNode.style.setProperty('--vscode-editor-dictation-widget-height', `${lineHeight}px`);
        this.domNode.style.setProperty('--vscode-editor-dictation-widget-width', `${width}px`);
        return null;
    }
    show() {
        this.editor.addContentWidget(this);
    }
    layout() {
        this.editor.layoutContentWidget(this);
    }
    active() {
        this.domNode.classList.add('recording');
    }
    hide() {
        this.domNode.classList.remove('recording');
        this.editor.removeContentWidget(this);
    }
}
let EditorDictation = class EditorDictation extends Disposable {
    static { EditorDictation_1 = this; }
    static { this.ID = 'editorDictation'; }
    static get(editor) {
        return editor.getContribution(EditorDictation_1.ID);
    }
    constructor(editor, speechService, contextKeyService, keybindingService) {
        super();
        this.editor = editor;
        this.speechService = speechService;
        this.sessionDisposables = this._register(new MutableDisposable());
        this.widget = this._register(new DictationWidget(this.editor, keybindingService));
        this.editorDictationInProgress = EDITOR_DICTATION_IN_PROGRESS.bindTo(contextKeyService);
    }
    async start() {
        const disposables = new DisposableStore();
        this.sessionDisposables.value = disposables;
        this.widget.show();
        disposables.add(toDisposable(() => this.widget.hide()));
        this.editorDictationInProgress.set(true);
        disposables.add(toDisposable(() => this.editorDictationInProgress.reset()));
        const collection = this.editor.createDecorationsCollection();
        disposables.add(toDisposable(() => collection.clear()));
        disposables.add(this.editor.onDidChangeCursorPosition(() => this.widget.layout()));
        let previewStart = undefined;
        let lastReplaceTextLength = 0;
        const replaceText = (text, isPreview) => {
            if (!previewStart) {
                previewStart = assertIsDefined(this.editor.getPosition());
            }
            const endPosition = new Position(previewStart.lineNumber, previewStart.column + text.length);
            this.editor.executeEdits(EditorDictation_1.ID, [
                EditOperation.replace(Range.fromPositions(previewStart, previewStart.with(undefined, previewStart.column + lastReplaceTextLength)), text)
            ], [
                Selection.fromPositions(endPosition)
            ]);
            if (isPreview) {
                collection.set([
                    {
                        range: Range.fromPositions(previewStart, previewStart.with(undefined, previewStart.column + text.length)),
                        options: {
                            description: 'editor-dictation-preview',
                            inlineClassName: 'ghost-text-decoration-preview'
                        }
                    }
                ]);
            }
            else {
                collection.clear();
            }
            lastReplaceTextLength = text.length;
            if (!isPreview) {
                previewStart = undefined;
                lastReplaceTextLength = 0;
            }
            this.editor.revealPositionInCenterIfOutsideViewport(endPosition);
        };
        const cts = new CancellationTokenSource();
        disposables.add(toDisposable(() => cts.dispose(true)));
        const session = await this.speechService.createSpeechToTextSession(cts.token, 'editor');
        disposables.add(session.onDidChange(e => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            switch (e.status) {
                case SpeechToTextStatus.Started:
                    this.widget.active();
                    break;
                case SpeechToTextStatus.Stopped:
                    disposables.dispose();
                    break;
                case SpeechToTextStatus.Recognizing: {
                    if (!e.text) {
                        return;
                    }
                    replaceText(e.text, true);
                    break;
                }
                case SpeechToTextStatus.Recognized: {
                    if (!e.text) {
                        return;
                    }
                    replaceText(`${e.text} `, false);
                    break;
                }
            }
        }));
    }
    stop() {
        this.sessionDisposables.clear();
    }
};
EditorDictation = EditorDictation_1 = __decorate([
    __param(1, ISpeechService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService)
], EditorDictation);
export { EditorDictation };
registerEditorContribution(EditorDictation.ID, EditorDictation, 4 /* EditorContributionInstantiation.Lazy */);
registerAction2(EditorDictationStartAction);
registerAction2(EditorDictationStopAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRGljdGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9kaWN0YXRpb24vZWRpdG9yRGljdGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHdkgsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6SSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQW1DLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0ksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFJdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NB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