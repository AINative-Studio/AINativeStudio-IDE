/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../../base/common/objects.js';
export class BaseCellEditorOptions extends Disposable {
    static { this.fixedEditorOptions = {
        scrollBeyondLastLine: false,
        scrollbar: {
            verticalScrollbarSize: 14,
            horizontal: 'auto',
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            alwaysConsumeMouseWheel: false
        },
        renderLineHighlightOnlyWhenFocus: true,
        overviewRulerLanes: 0,
        lineDecorationsWidth: 0,
        folding: true,
        fixedOverflowWidgets: true,
        minimap: { enabled: false },
        renderValidationDecorations: 'on',
        lineNumbersMinChars: 3
    }; }
    get value() {
        return this._value;
    }
    constructor(notebookEditor, notebookOptions, configurationService, language) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookOptions = notebookOptions;
        this.configurationService = configurationService;
        this.language = language;
        this._localDisposableStore = this._register(new DisposableStore());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor') || e.affectsConfiguration('notebook')) {
                this._recomputeOptions();
            }
        }));
        this._register(notebookOptions.onDidChangeOptions(e => {
            if (e.cellStatusBarVisibility || e.editorTopPadding || e.editorOptionsCustomizations) {
                this._recomputeOptions();
            }
        }));
        this._register(this.notebookEditor.onDidChangeModel(() => {
            this._localDisposableStore.clear();
            if (this.notebookEditor.hasModel()) {
                this._localDisposableStore.add(this.notebookEditor.onDidChangeOptions(() => {
                    this._recomputeOptions();
                }));
                this._recomputeOptions();
            }
        }));
        if (this.notebookEditor.hasModel()) {
            this._localDisposableStore.add(this.notebookEditor.onDidChangeOptions(() => {
                this._recomputeOptions();
            }));
        }
        this._value = this._computeEditorOptions();
    }
    _recomputeOptions() {
        this._value = this._computeEditorOptions();
        this._onDidChange.fire();
    }
    _computeEditorOptions() {
        const editorOptions = deepClone(this.configurationService.getValue('editor', { overrideIdentifier: this.language }));
        const editorOptionsOverrideRaw = this.notebookOptions.getDisplayOptions().editorOptionsCustomizations;
        const editorOptionsOverride = {};
        if (editorOptionsOverrideRaw) {
            for (const key in editorOptionsOverrideRaw) {
                if (key.indexOf('editor.') === 0) {
                    editorOptionsOverride[key.substring(7)] = editorOptionsOverrideRaw[key];
                }
            }
        }
        const computed = Object.freeze({
            ...editorOptions,
            ...BaseCellEditorOptions.fixedEditorOptions,
            ...editorOptionsOverride,
            ...{ padding: { top: 12, bottom: 12 } },
            readOnly: this.notebookEditor.isReadOnly
        });
        return computed;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvY2VsbEVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBTWxFLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO2FBQ3JDLHVCQUFrQixHQUFtQjtRQUNuRCxvQkFBb0IsRUFBRSxLQUFLO1FBQzNCLFNBQVMsRUFBRTtZQUNWLHFCQUFxQixFQUFFLEVBQUU7WUFDekIsVUFBVSxFQUFFLE1BQU07WUFDbEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLHVCQUF1QixFQUFFLEtBQUs7U0FDOUI7UUFDRCxnQ0FBZ0MsRUFBRSxJQUFJO1FBQ3RDLGtCQUFrQixFQUFFLENBQUM7UUFDckIsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixPQUFPLEVBQUUsSUFBSTtRQUNiLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtRQUMzQiwyQkFBMkIsRUFBRSxJQUFJO1FBQ2pDLG1CQUFtQixFQUFFLENBQUM7S0FDdEIsQUFsQmdDLENBa0IvQjtJQU9GLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsWUFBcUIsY0FB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