/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { setupInstantiationService } from './testNotebookEditor.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { NotebookKernelService } from '../../browser/services/notebookKernelServiceImpl.js';
import { INotebookService } from '../../common/notebookService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { NotebookKernelHistoryService } from '../../browser/services/notebookKernelHistoryServiceImpl.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
suite('NotebookKernelHistoryService', () => {
    let disposables;
    let instantiationService;
    let kernelService;
    let onDidAddNotebookDocument;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        disposables = new DisposableStore();
        onDidAddNotebookDocument = new Emitter();
        disposables.add(onDidAddNotebookDocument);
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(INotebookService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidAddNotebookDocument = onDidAddNotebookDocument.event;
                this.onWillRemoveNotebookDocument = Event.None;
            }
            getNotebookTextModels() { return []; }
        });
        instantiationService.stub(IMenuService, new class extends mock() {
            createMenu() {
                return new class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() { return []; }
                    dispose() { }
                };
            }
        });
        kernelService = disposables.add(instantiationService.createInstance(NotebookKernelService));
        instantiationService.set(INotebookKernelService, kernelService);
    });
    test('notebook kernel empty history', function () {
        const u1 = URI.parse('foo:///one');
        const k1 = new TestNotebookKernel({ label: 'z', notebookType: 'foo' });
        const k2 = new TestNotebookKernel({ label: 'a', notebookType: 'foo' });
        disposables.add(kernelService.registerKernel(k1));
        disposables.add(kernelService.registerKernel(k2));
        instantiationService.stub(IStorageService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillSaveState = Event.None;
            }
            onDidChangeValue(scope, key, disposable) {
                return Event.None;
            }
            get(key, scope, fallbackValue) {
                if (key === 'notebook.kernelHistory') {
                    return JSON.stringify({
                        'foo': {
                            'entries': []
                        }
                    });
                }
                return undefined;
            }
        });
        instantiationService.stub(INotebookLoggingService, new class extends mock() {
            info() { }
            debug() { }
        });
        const kernelHistoryService = disposables.add(instantiationService.createInstance(NotebookKernelHistoryService));
        let info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.equal(info.all.length, 0);
        assert.ok(!info.selected);
        // update priorities for u1 notebook
        kernelService.updateKernelNotebookAffinity(k2, u1, 2);
        info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.equal(info.all.length, 0);
        // MRU only auto selects kernel if there is only one
        assert.deepStrictEqual(info.selected, undefined);
    });
    test('notebook kernel history restore', function () {
        const u1 = URI.parse('foo:///one');
        const k1 = new TestNotebookKernel({ label: 'z', notebookType: 'foo' });
        const k2 = new TestNotebookKernel({ label: 'a', notebookType: 'foo' });
        const k3 = new TestNotebookKernel({ label: 'b', notebookType: 'foo' });
        disposables.add(kernelService.registerKernel(k1));
        disposables.add(kernelService.registerKernel(k2));
        disposables.add(kernelService.registerKernel(k3));
        instantiationService.stub(IStorageService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillSaveState = Event.None;
            }
            onDidChangeValue(scope, key, disposable) {
                return Event.None;
            }
            get(key, scope, fallbackValue) {
                if (key === 'notebook.kernelHistory') {
                    return JSON.stringify({
                        'foo': {
                            'entries': [
                                k2.id
                            ]
                        }
                    });
                }
                return undefined;
            }
        });
        instantiationService.stub(INotebookLoggingService, new class extends mock() {
            info() { }
            debug() { }
        });
        const kernelHistoryService = disposables.add(instantiationService.createInstance(NotebookKernelHistoryService));
        let info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.equal(info.all.length, 1);
        assert.deepStrictEqual(info.selected, undefined);
        kernelHistoryService.addMostRecentKernel(k3);
        info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.deepStrictEqual(info.all, [k3, k2]);
    });
});
class TestNotebookKernel {
    executeNotebookCellsRequest() {
        throw new Error('Method not implemented.');
    }
    cancelNotebookCellExecution() {
        throw new Error('Method not implemented.');
    }
    provideVariables(notebookUri, parentId, kind, start, token) {
        return AsyncIterableObject.EMPTY;
    }
    constructor(opts) {
        this.id = Math.random() + 'kernel';
        this.label = 'test-label';
        this.viewType = '*';
        this.onDidChange = Event.None;
        this.extension = new ExtensionIdentifier('test');
        this.localResourceRoot = URI.file('/test');
        this.preloadUris = [];
        this.preloadProvides = [];
        this.supportedLanguages = [];
        this.supportedLanguages = opts?.languages ?? [PLAINTEXT_LANGUAGE_ID];
        this.label = opts?.label ?? this.label;
        this.viewType = opts?.notebookType ?? this.viewType;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxIaXN0b3J5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rS2VybmVsSGlzdG9yeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLHNCQUFzQixFQUFtQixNQUFNLHVDQUF1QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBd0UsZUFBZSxFQUFrRyxNQUFNLG1EQUFtRCxDQUFDO0FBQzFQLE9BQU8sRUFBRSx1QkFBdUIsRUFB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