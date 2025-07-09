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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvdGVzdC9icm93c2VyL2NvbW1lbnRzVmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQW9DLGVBQWUsRUFBd0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUUxSSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFFckUsT0FBTyxFQUF3QyxzQkFBc0IsRUFBd0MsTUFBTSw2QkFBNkIsQ0FBQztBQUNqSixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRWxHLE1BQU0saUJBQWlCO0lBQ3RCLHVCQUF1QjtRQUN0QixPQUFPLElB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