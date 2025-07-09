/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { BreadcrumbsModel } from '../../../../browser/parts/editor/breadcrumbsModel.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { TestContextService } from '../../../common/workbenchTestServices.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Breadcrumb Model', function () {
    let model;
    const workspaceService = new TestContextService(new Workspace('ffff', [new WorkspaceFolder({ uri: URI.parse('foo:/bar/baz/ws'), name: 'ws', index: 0 })]));
    const configService = new class extends TestConfigurationService {
        getValue(...args) {
            if (args[0] === 'breadcrumbs.filePath') {
                return 'on';
            }
            if (args[0] === 'breadcrumbs.symbolPath') {
                return 'on';
            }
            return super.getValue(...args);
        }
        updateValue() {
            return Promise.resolve();
        }
    };
    teardown(function () {
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('only uri, inside workspace', function () {
        model = new BreadcrumbsModel(URI.parse('foo:/bar/baz/ws/some/path/file.ts'), undefined, configService, workspaceService, new class extends mock() {
        });
        const elements = model.getElements();
        assert.strictEqual(elements.length, 3);
        const [one, two, three] = elements;
        assert.strictEqual(one.kind, FileKind.FOLDER);
        assert.strictEqual(two.kind, FileKind.FOLDER);
        assert.strictEqual(three.kind, FileKind.FILE);
        assert.strictEqual(one.uri.toString(), 'foo:/bar/baz/ws/some');
        assert.strictEqual(two.uri.toString(), 'foo:/bar/baz/ws/some/path');
        assert.strictEqual(three.uri.toString(), 'foo:/bar/baz/ws/some/path/file.ts');
    });
    test('display uri matters for FileElement', function () {
        model = new BreadcrumbsModel(URI.parse('foo:/bar/baz/ws/some/PATH/file.ts'), undefined, configService, workspaceService, new class extends mock() {
        });
        const elements = model.getElements();
        assert.strictEqual(elements.length, 3);
        const [one, two, three] = elements;
        assert.strictEqual(one.kind, FileKind.FOLDER);
        assert.strictEqual(two.kind, FileKind.FOLDER);
        assert.strictEqual(three.kind, FileKind.FILE);
        assert.strictEqual(one.uri.toString(), 'foo:/bar/baz/ws/some');
        assert.strictEqual(two.uri.toString(), 'foo:/bar/baz/ws/some/PATH');
        assert.strictEqual(three.uri.toString(), 'foo:/bar/baz/ws/some/PATH/file.ts');
    });
    test('only uri, outside workspace', function () {
        model = new BreadcrumbsModel(URI.parse('foo:/outside/file.ts'), undefined, configService, workspaceService, new class extends mock() {
        });
        const elements = model.getElements();
        assert.strictEqual(elements.length, 2);
        const [one, two] = elements;
        assert.strictEqual(one.kind, FileKind.FOLDER);
        assert.strictEqual(two.kind, FileKind.FILE);
        assert.strictEqual(one.uri.toString(), 'foo:/outside');
        assert.strictEqual(two.uri.toString(), 'foo:/outside/file.ts');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYk1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFlLE1BQU0sc0RBQXNELENBQUM7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMzRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLGtCQUFrQixFQUFFO0lBRXpCLElBQUksS0FBdUIsQ0FBQztJQUM1QixNQUFNLGdCQUFnQixHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENB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