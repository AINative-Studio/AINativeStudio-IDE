/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { CommentsPanel } from '../../browser/commentsView.js';
import { CommentService, ICommentService } from '../../browser/commentService.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
class TestCommentThread {
    isDocumentCommentThread() {
        return true;
    }
    constructor(commentThreadHandle, controllerHandle, threadId, resource, range, comments) {
        this.commentThreadHandle = commentThreadHandle;
        this.controllerHandle = controllerHandle;
        this.threadId = threadId;
        this.resource = resource;
        this.range = range;
        this.comments = comments;
        this.onDidChangeComments = new Emitter().event;
        this.onDidChangeInitialCollapsibleState = new Emitter().event;
        this.canReply = false;
        this.onDidChangeInput = new Emitter().event;
        this.onDidChangeRange = new Emitter().event;
        this.onDidChangeLabel = new Emitter().event;
        this.onDidChangeCollapsibleState = new Emitter().event;
        this.onDidChangeState = new Emitter().event;
        this.onDidChangeCanReply = new Emitter().event;
        this.isDisposed = false;
        this.isTemplate = false;
        this.label = undefined;
        this.contextValue = undefined;
    }
}
class TestCommentController {
    constructor() {
        this.id = 'test';
        this.label = 'Test Comments';
        this.owner = 'test';
        this.features = {};
    }
    createCommentThreadTemplate(resource, range) {
        throw new Error('Method not implemented.');
    }
    updateCommentThreadTemplate(threadHandle, range) {
        throw new Error('Method not implemented.');
    }
    deleteCommentThreadMain(commentThreadId) {
        throw new Error('Method not implemented.');
    }
    toggleReaction(uri, thread, comment, reaction, token) {
        throw new Error('Method not implemented.');
    }
    getDocumentComments(resource, token) {
        throw new Error('Method not implemented.');
    }
    getNotebookComments(resource, token) {
        throw new Error('Method not implemented.');
    }
    setActiveCommentAndThread(commentInfo) {
        throw new Error('Method not implemented.');
    }
}
export class TestViewDescriptorService {
    constructor() {
        this.onDidChangeLocation = new Emitter().event;
    }
    getViewLocationById(id) {
        return 1 /* ViewContainerLocation.Panel */;
    }
    getViewDescriptorById(id) {
        return null;
    }
    getViewContainerByViewId(id) {
        return {
            id: 'comments',
            title: { value: 'Comments', original: 'Comments' },
            ctorDescriptor: {}
        };
    }
    getViewContainerModel(viewContainer) {
        const partialViewContainerModel = {
            onDidChangeContainerInfo: new Emitter().event
        };
        return partialViewContainerModel;
    }
    getDefaultContainerById(id) {
        return null;
    }
}
suite('Comments View', function () {
    teardown(() => {
        instantiationService.dispose();
        commentService.dispose();
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    let disposables;
    let instantiationService;
    let commentService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService({}, disposables);
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IHoverService, NullHoverService);
        instantiationService.stub(IContextViewService, {});
        instantiationService.stub(IViewDescriptorService, new TestViewDescriptorService());
        commentService = instantiationService.createInstance(CommentService);
        instantiationService.stub(ICommentService, commentService);
        commentService.registerCommentController('test', new TestCommentController());
    });
    test('collapse all', async function () {
        const view = instantiationService.createInstance(CommentsPanel, { id: 'comments', title: 'Comments' });
        view.render();
        commentService.setWorkspaceComments('test', [
            new TestCommentThread(1, 1, '1', 'test1', new Range(1, 1, 1, 1), [{ body: 'test', uniqueIdInThread: 1, userName: 'alex' }]),
            new TestCommentThread(2, 1, '1', 'test2', new Range(1, 1, 1, 1), [{ body: 'test', uniqueIdInThread: 1, userName: 'alex' }]),
        ]);
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.areAllCommentsExpanded(), true);
        view.collapseAll();
        assert.strictEqual(view.isSomeCommentsExpanded(), false);
        view.dispose();
    });
    test('expand all', async function () {
        const view = instantiationService.createInstance(CommentsPanel, { id: 'comments', title: 'Comments' });
        view.render();
        commentService.setWorkspaceComments('test', [
            new TestCommentThread(1, 1, '1', 'test1', new Range(1, 1, 1, 1), [{ body: 'test', uniqueIdInThread: 1, userName: 'alex' }]),
            new TestCommentThread(2, 1, '1', 'test2', new Range(1, 1, 1, 1), [{ body: 'test', uniqueIdInThread: 1, userName: 'alex' }]),
        ]);
        assert.strictEqual(view.getFilterStats().total, 2);
        view.collapseAll();
        assert.strictEqual(view.isSomeCommentsExpanded(), false);
        view.expandAll();
        assert.strictEqual(view.areAllCommentsExpanded(), true);
        view.dispose();
    });
    test('filter by text', async function () {
        const view = instantiationService.createInstance(CommentsPanel, { id: 'comments', title: 'Comments' });
        view.setVisible(true);
        view.render();
        commentService.setWorkspaceComments('test', [
            new TestCommentThread(1, 1, '1', 'test1', new Range(1, 1, 1, 1), [{ body: 'This comment is a cat.', uniqueIdInThread: 1, userName: 'alex' }]),
            new TestCommentThread(2, 1, '1', 'test2', new Range(1, 1, 1, 1), [{ body: 'This comment is a dog.', uniqueIdInThread: 1, userName: 'alex' }]),
        ]);
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.getFilterStats().filtered, 2);
        view.getFilterWidget().setFilterText('cat');
        // Setting showResolved causes the filter to trigger for the purposes of this test.
        view.filters.showResolved = false;
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.getFilterStats().filtered, 1);
        view.clearFilterText();
        // Setting showResolved causes the filter to trigger for the purposes of this test.
        view.filters.showResolved = true;
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.getFilterStats().filtered, 2);
        view.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy90ZXN0L2Jyb3dzZXIvY29tbWVudHNWaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBb0MsZUFBZSxFQUF3QixNQUFNLGlDQUFpQyxDQUFDO0FBRTFJLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxPQUFPLEVBQXdDLHNCQUFzQixFQUF3QyxNQUFNLDZCQUE2QixDQUFDO0FBQ2pKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUduRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFbEcsTUFBTSxpQkFBaUI7SUFDdEIsdUJBQXVCO1FBQ3RCLE9BQU8sSUFB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