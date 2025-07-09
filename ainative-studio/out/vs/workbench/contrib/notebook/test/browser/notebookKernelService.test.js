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
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
suite('NotebookKernelService', () => {
    let instantiationService;
    let kernelService;
    let disposables;
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
    test('notebook priorities', function () {
        const u1 = URI.parse('foo:///one');
        const u2 = URI.parse('foo:///two');
        const k1 = new TestNotebookKernel({ label: 'z' });
        const k2 = new TestNotebookKernel({ label: 'a' });
        disposables.add(kernelService.registerKernel(k1));
        disposables.add(kernelService.registerKernel(k2));
        // equal priorities -> sort by name
        let info = kernelService.getMatchingKernel({ uri: u1, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
        // update priorities for u1 notebook
        kernelService.updateKernelNotebookAffinity(k2, u1, 2);
        kernelService.updateKernelNotebookAffinity(k2, u2, 1);
        // updated
        info = kernelService.getMatchingKernel({ uri: u1, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
        // NOT updated
        info = kernelService.getMatchingKernel({ uri: u2, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
        // reset
        kernelService.updateKernelNotebookAffinity(k2, u1, undefined);
        info = kernelService.getMatchingKernel({ uri: u1, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
    });
    test('new kernel with higher affinity wins, https://github.com/microsoft/vscode/issues/122028', function () {
        const notebook = URI.parse('foo:///one');
        const kernel = new TestNotebookKernel();
        disposables.add(kernelService.registerKernel(kernel));
        let info = kernelService.getMatchingKernel({ uri: notebook, notebookType: 'foo' });
        assert.strictEqual(info.all.length, 1);
        assert.ok(info.all[0] === kernel);
        const betterKernel = new TestNotebookKernel();
        disposables.add(kernelService.registerKernel(betterKernel));
        info = kernelService.getMatchingKernel({ uri: notebook, notebookType: 'foo' });
        assert.strictEqual(info.all.length, 2);
        kernelService.updateKernelNotebookAffinity(betterKernel, notebook, 2);
        info = kernelService.getMatchingKernel({ uri: notebook, notebookType: 'foo' });
        assert.strictEqual(info.all.length, 2);
        assert.ok(info.all[0] === betterKernel);
        assert.ok(info.all[1] === kernel);
    });
    test('onDidChangeSelectedNotebooks not fired on initial notebook open #121904', function () {
        const uri = URI.parse('foo:///one');
        const jupyter = { uri, viewType: 'jupyter', notebookType: 'jupyter' };
        const dotnet = { uri, viewType: 'dotnet', notebookType: 'dotnet' };
        const jupyterKernel = new TestNotebookKernel({ viewType: jupyter.viewType });
        const dotnetKernel = new TestNotebookKernel({ viewType: dotnet.viewType });
        disposables.add(kernelService.registerKernel(jupyterKernel));
        disposables.add(kernelService.registerKernel(dotnetKernel));
        kernelService.selectKernelForNotebook(jupyterKernel, jupyter);
        kernelService.selectKernelForNotebook(dotnetKernel, dotnet);
        let info = kernelService.getMatchingKernel(dotnet);
        assert.strictEqual(info.selected === dotnetKernel, true);
        info = kernelService.getMatchingKernel(jupyter);
        assert.strictEqual(info.selected === jupyterKernel, true);
    });
    test('onDidChangeSelectedNotebooks not fired on initial notebook open #121904, p2', async function () {
        const uri = URI.parse('foo:///one');
        const jupyter = { uri, viewType: 'jupyter', notebookType: 'jupyter' };
        const dotnet = { uri, viewType: 'dotnet', notebookType: 'dotnet' };
        const jupyterKernel = new TestNotebookKernel({ viewType: jupyter.viewType });
        const dotnetKernel = new TestNotebookKernel({ viewType: dotnet.viewType });
        disposables.add(kernelService.registerKernel(jupyterKernel));
        disposables.add(kernelService.registerKernel(dotnetKernel));
        kernelService.selectKernelForNotebook(jupyterKernel, jupyter);
        kernelService.selectKernelForNotebook(dotnetKernel, dotnet);
        const transientOptions = {
            transientOutputs: false,
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
        };
        {
            // open as jupyter -> bind event
            const p1 = Event.toPromise(kernelService.onDidChangeSelectedNotebooks);
            const d1 = disposables.add(instantiationService.createInstance(NotebookTextModel, jupyter.viewType, jupyter.uri, [], {}, transientOptions));
            onDidAddNotebookDocument.fire(d1);
            const event = await p1;
            assert.strictEqual(event.newKernel, jupyterKernel.id);
        }
        {
            // RE-open as dotnet -> bind event
            const p2 = Event.toPromise(kernelService.onDidChangeSelectedNotebooks);
            const d2 = disposables.add(instantiationService.createInstance(NotebookTextModel, dotnet.viewType, dotnet.uri, [], {}, transientOptions));
            onDidAddNotebookDocument.fire(d2);
            const event2 = await p2;
            assert.strictEqual(event2.newKernel, dotnetKernel.id);
        }
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
        this.viewType = opts?.viewType ?? this.viewType;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rS2VybmVsU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLHNCQUFzQixFQUFtQixNQUFNLHVDQUF1QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXhGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxtQkFBbUIsRUFB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