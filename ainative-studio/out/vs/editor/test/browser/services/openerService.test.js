/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OpenerService } from '../../../browser/services/openerService.js';
import { TestCodeEditorService } from '../editorTestServices.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { NullCommandService } from '../../../../platform/commands/test/common/nullCommandService.js';
import { matchesScheme, matchesSomeScheme } from '../../../../base/common/network.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
suite('OpenerService', function () {
    const themeService = new TestThemeService();
    const editorService = new TestCodeEditorService(themeService);
    let lastCommand;
    const commandService = new (class {
        constructor() {
            this.onWillExecuteCommand = () => Disposable.None;
            this.onDidExecuteCommand = () => Disposable.None;
        }
        executeCommand(id, ...args) {
            lastCommand = { id, args };
            return Promise.resolve(undefined);
        }
    })();
    setup(function () {
        lastCommand = undefined;
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('delegate to editorService, scheme:///fff', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        await openerService.open(URI.parse('another:///somepath'));
        assert.strictEqual(editorService.lastInput.options.selection, undefined);
    });
    test('delegate to editorService, scheme:///fff#L123', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        await openerService.open(URI.parse('file:///somepath#L23'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 1);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
        await openerService.open(URI.parse('another:///somepath#L23'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 1);
        await openerService.open(URI.parse('another:///somepath#L23,45'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 45);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
    });
    test('delegate to editorService, scheme:///fff#123,123', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        await openerService.open(URI.parse('file:///somepath#23'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 1);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
        await openerService.open(URI.parse('file:///somepath#23,45'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 45);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
    });
    test('delegate to commandsService, command:someid', async function () {
        const openerService = new OpenerService(editorService, commandService);
        const id = `aCommand${Math.random()}`;
        store.add(CommandsRegistry.registerCommand(id, function () { }));
        assert.strictEqual(lastCommand, undefined);
        await openerService.open(URI.parse('command:' + id));
        assert.strictEqual(lastCommand, undefined);
    });
    test('delegate to commandsService, command:someid, 2', async function () {
        const openerService = new OpenerService(editorService, commandService);
        const id = `aCommand${Math.random()}`;
        store.add(CommandsRegistry.registerCommand(id, function () { }));
        await openerService.open(URI.parse('command:' + id).with({ query: '\"123\"' }), { allowCommands: true });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 1);
        assert.strictEqual(lastCommand.args[0], '123');
        await openerService.open(URI.parse('command:' + id), { allowCommands: true });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 0);
        await openerService.open(URI.parse('command:' + id).with({ query: '123' }), { allowCommands: true });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 1);
        assert.strictEqual(lastCommand.args[0], 123);
        await openerService.open(URI.parse('command:' + id).with({ query: JSON.stringify([12, true]) }), { allowCommands: true });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 2);
        assert.strictEqual(lastCommand.args[0], 12);
        assert.strictEqual(lastCommand.args[1], true);
    });
    test('links are protected by validators', async function () {
        const openerService = new OpenerService(editorService, commandService);
        store.add(openerService.registerValidator({ shouldOpen: () => Promise.resolve(false) }));
        const httpResult = await openerService.open(URI.parse('https://www.microsoft.com'));
        const httpsResult = await openerService.open(URI.parse('https://www.microsoft.com'));
        assert.strictEqual(httpResult, false);
        assert.strictEqual(httpsResult, false);
    });
    test('links validated by validators go to openers', async function () {
        const openerService = new OpenerService(editorService, commandService);
        store.add(openerService.registerValidator({ shouldOpen: () => Promise.resolve(true) }));
        let openCount = 0;
        store.add(openerService.registerOpener({
            open: (resource) => {
                openCount++;
                return Promise.resolve(true);
            }
        }));
        await openerService.open(URI.parse('http://microsoft.com'));
        assert.strictEqual(openCount, 1);
        await openerService.open(URI.parse('https://microsoft.com'));
        assert.strictEqual(openCount, 2);
    });
    test('links aren\'t manipulated before being passed to validator: PR #118226', async function () {
        const openerService = new OpenerService(editorService, commandService);
        store.add(openerService.registerValidator({
            shouldOpen: (resource) => {
                // We don't want it to convert strings into URIs
                assert.strictEqual(resource instanceof URI, false);
                return Promise.resolve(false);
            }
        }));
        await openerService.open('https://wwww.microsoft.com');
        await openerService.open('https://www.microsoft.com??params=CountryCode%3DUSA%26Name%3Dvscode"');
    });
    test('links validated by multiple validators', async function () {
        const openerService = new OpenerService(editorService, commandService);
        let v1 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v1++;
                return Promise.resolve(true);
            }
        });
        let v2 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v2++;
                return Promise.resolve(true);
            }
        });
        let openCount = 0;
        openerService.registerOpener({
            open: (resource) => {
                openCount++;
                return Promise.resolve(true);
            }
        });
        await openerService.open(URI.parse('http://microsoft.com'));
        assert.strictEqual(openCount, 1);
        assert.strictEqual(v1, 1);
        assert.strictEqual(v2, 1);
        await openerService.open(URI.parse('https://microsoft.com'));
        assert.strictEqual(openCount, 2);
        assert.strictEqual(v1, 2);
        assert.strictEqual(v2, 2);
    });
    test('links invalidated by first validator do not continue validating', async function () {
        const openerService = new OpenerService(editorService, commandService);
        let v1 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v1++;
                return Promise.resolve(false);
            }
        });
        let v2 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v2++;
                return Promise.resolve(true);
            }
        });
        let openCount = 0;
        openerService.registerOpener({
            open: (resource) => {
                openCount++;
                return Promise.resolve(true);
            }
        });
        await openerService.open(URI.parse('http://microsoft.com'));
        assert.strictEqual(openCount, 0);
        assert.strictEqual(v1, 1);
        assert.strictEqual(v2, 0);
        await openerService.open(URI.parse('https://microsoft.com'));
        assert.strictEqual(openCount, 0);
        assert.strictEqual(v1, 2);
        assert.strictEqual(v2, 0);
    });
    test('matchesScheme', function () {
        assert.ok(matchesScheme('https://microsoft.com', 'https'));
        assert.ok(matchesScheme('http://microsoft.com', 'http'));
        assert.ok(matchesScheme('hTTPs://microsoft.com', 'https'));
        assert.ok(matchesScheme('httP://microsoft.com', 'http'));
        assert.ok(matchesScheme(URI.parse('https://microsoft.com'), 'https'));
        assert.ok(matchesScheme(URI.parse('http://microsoft.com'), 'http'));
        assert.ok(matchesScheme(URI.parse('hTTPs://microsoft.com'), 'https'));
        assert.ok(matchesScheme(URI.parse('httP://microsoft.com'), 'http'));
        assert.ok(!matchesScheme(URI.parse('https://microsoft.com'), 'http'));
        assert.ok(!matchesScheme(URI.parse('htt://microsoft.com'), 'http'));
        assert.ok(!matchesScheme(URI.parse('z://microsoft.com'), 'http'));
    });
    test('matchesSomeScheme', function () {
        assert.ok(matchesSomeScheme('https://microsoft.com', 'http', 'https'));
        assert.ok(matchesSomeScheme('http://microsoft.com', 'http', 'https'));
        assert.ok(!matchesSomeScheme('x://microsoft.com', 'http', 'https'));
    });
    test('resolveExternalUri', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        try {
            await openerService.resolveExternalUri(URI.parse('file:///Users/user/folder'));
            assert.fail('Should not reach here');
        }
        catch {
            // OK
        }
        const disposable = openerService.registerExternalUriResolver({
            async resolveExternalUri(uri) {
                return { resolved: uri, dispose() { } };
            }
        });
        const result = await openerService.resolveExternalUri(URI.parse('file:///Users/user/folder'));
        assert.deepStrictEqual(result.resolved.toString(), 'file:///Users/user/folder');
        disposable.dispose();
    });
    test('vscode.open command can\'t open HTTP URL with hash (#) in it [extension development] #140907', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        const actual = [];
        openerService.setDefaultExternalOpener({
            async openExternal(href) {
                actual.push(href);
                return true;
            }
        });
        const href = 'https://gitlab.com/viktomas/test-project/merge_requests/new?merge_request%5Bsource_branch%5D=test-%23-hash';
        const uri = URI.parse(href);
        assert.ok(await openerService.open(uri));
        assert.ok(await openerService.open(href));
        assert.deepStrictEqual(actual, [
            encodeURI(uri.toString(true)), // BAD, the encoded # (%23) is double encoded to %2523 (% is double encoded)
            href // good
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvc2VydmljZXMvb3BlbmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQW1CLE1BQU0sa0RBQWtELENBQUM7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFFckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTlGLEtBQUssQ0FBQyxlQUFlLEVBQUU7SUFDdEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO0lBQzVDLE1BQU0sYUFBYSxHQUFHLElBQUkscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFOUQsSUFBSSxXQUFvRCxDQUFDO0lBRXpELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQztRQUFBO1lBRTNCLHlCQUFvQixHQUFHLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENB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