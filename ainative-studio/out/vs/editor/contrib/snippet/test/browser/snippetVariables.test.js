/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { sep } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { SnippetParser } from '../../browser/snippetParser.js';
import { ClipboardBasedVariableResolver, CompositeSnippetVariableResolver, ModelBasedVariableResolver, SelectionBasedVariableResolver, TimeBasedVariableResolver, WorkspaceBasedVariableResolver } from '../../browser/snippetVariables.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { toWorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { toWorkspaceFolders } from '../../../../../platform/workspaces/common/workspaces.js';
suite('Snippet Variables Resolver', function () {
    const labelService = new class extends mock() {
        getUriLabel(uri) {
            return uri.fsPath;
        }
    };
    let model;
    let resolver;
    setup(function () {
        model = createTextModel([
            'this is line one',
            'this is line two',
            '    this is line three'
        ].join('\n'), undefined, undefined, URI.parse('file:///foo/files/text.txt'));
        resolver = new CompositeSnippetVariableResolver([
            new ModelBasedVariableResolver(labelService, model),
            new SelectionBasedVariableResolver(model, new Selection(1, 1, 1, 1), 0, undefined),
        ]);
    });
    teardown(function () {
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertVariableResolve(resolver, varName, expected) {
        const snippet = new SnippetParser().parse(`$${varName}`);
        const variable = snippet.children[0];
        variable.resolve(resolver);
        if (variable.children.length === 0) {
            assert.strictEqual(undefined, expected);
        }
        else {
            assert.strictEqual(variable.toString(), expected);
        }
    }
    test('editor variables, basics', function () {
        assertVariableResolve(resolver, 'TM_FILENAME', 'text.txt');
        assertVariableResolve(resolver, 'something', undefined);
    });
    test('editor variables, file/dir', function () {
        const disposables = new DisposableStore();
        assertVariableResolve(resolver, 'TM_FILENAME', 'text.txt');
        if (!isWindows) {
            assertVariableResolve(resolver, 'TM_DIRECTORY', '/foo/files');
            assertVariableResolve(resolver, 'TM_FILEPATH', '/foo/files/text.txt');
        }
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('http://www.pb.o/abc/def/ghi'))));
        assertVariableResolve(resolver, 'TM_FILENAME', 'ghi');
        if (!isWindows) {
            assertVariableResolve(resolver, 'TM_DIRECTORY', '/abc/def');
            assertVariableResolve(resolver, 'TM_FILEPATH', '/abc/def/ghi');
        }
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('mem:fff.ts'))));
        assertVariableResolve(resolver, 'TM_DIRECTORY', '');
        assertVariableResolve(resolver, 'TM_FILEPATH', 'fff.ts');
        disposables.dispose();
    });
    test('Path delimiters in code snippet variables aren\'t specific to remote OS #76840', function () {
        const labelService = new class extends mock() {
            getUriLabel(uri) {
                return uri.fsPath.replace(/\/|\\/g, '|');
            }
        };
        const model = createTextModel([].join('\n'), undefined, undefined, URI.parse('foo:///foo/files/text.txt'));
        const resolver = new CompositeSnippetVariableResolver([new ModelBasedVariableResolver(labelService, model)]);
        assertVariableResolve(resolver, 'TM_FILEPATH', '|foo|files|text.txt');
        model.dispose();
    });
    test('editor variables, selection', function () {
        resolver = new SelectionBasedVariableResolver(model, new Selection(1, 2, 2, 3), 0, undefined);
        assertVariableResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
        assertVariableResolve(resolver, 'TM_CURRENT_LINE', 'this is line two');
        assertVariableResolve(resolver, 'TM_LINE_INDEX', '1');
        assertVariableResolve(resolver, 'TM_LINE_NUMBER', '2');
        assertVariableResolve(resolver, 'CURSOR_INDEX', '0');
        assertVariableResolve(resolver, 'CURSOR_NUMBER', '1');
        resolver = new SelectionBasedVariableResolver(model, new Selection(1, 2, 2, 3), 4, undefined);
        assertVariableResolve(resolver, 'CURSOR_INDEX', '4');
        assertVariableResolve(resolver, 'CURSOR_NUMBER', '5');
        resolver = new SelectionBasedVariableResolver(model, new Selection(2, 3, 1, 2), 0, undefined);
        assertVariableResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
        assertVariableResolve(resolver, 'TM_CURRENT_LINE', 'this is line one');
        assertVariableResolve(resolver, 'TM_LINE_INDEX', '0');
        assertVariableResolve(resolver, 'TM_LINE_NUMBER', '1');
        resolver = new SelectionBasedVariableResolver(model, new Selection(1, 2, 1, 2), 0, undefined);
        assertVariableResolve(resolver, 'TM_SELECTED_TEXT', undefined);
        assertVariableResolve(resolver, 'TM_CURRENT_WORD', 'this');
        resolver = new SelectionBasedVariableResolver(model, new Selection(3, 1, 3, 1), 0, undefined);
        assertVariableResolve(resolver, 'TM_CURRENT_WORD', undefined);
    });
    test('TextmateSnippet, resolve variable', function () {
        const snippet = new SnippetParser().parse('"$TM_CURRENT_WORD"', true);
        assert.strictEqual(snippet.toString(), '""');
        snippet.resolveVariables(resolver);
        assert.strictEqual(snippet.toString(), '"this"');
    });
    test('TextmateSnippet, resolve variable with default', function () {
        const snippet = new SnippetParser().parse('"${TM_CURRENT_WORD:foo}"', true);
        assert.strictEqual(snippet.toString(), '"foo"');
        snippet.resolveVariables(resolver);
        assert.strictEqual(snippet.toString(), '"this"');
    });
    test('More useful environment variables for snippets, #32737', function () {
        const disposables = new DisposableStore();
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', 'text');
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('http://www.pb.o/abc/def/ghi'))));
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', 'ghi');
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('mem:.git'))));
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', '.git');
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('mem:foo.'))));
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', 'foo');
        disposables.dispose();
    });
    function assertVariableResolve2(input, expected, varValue) {
        const snippet = new SnippetParser().parse(input)
            .resolveVariables({ resolve(variable) { return varValue || variable.name; } });
        const actual = snippet.toString();
        assert.strictEqual(actual, expected);
    }
    test('Variable Snippet Transform', function () {
        const snippet = new SnippetParser().parse('name=${TM_FILENAME/(.*)\\..+$/$1/}', true);
        snippet.resolveVariables(resolver);
        assert.strictEqual(snippet.toString(), 'name=text');
        assertVariableResolve2('${ThisIsAVar/([A-Z]).*(Var)/$2/}', 'Var');
        assertVariableResolve2('${ThisIsAVar/([A-Z]).*(Var)/$2-${1:/downcase}/}', 'Var-t');
        assertVariableResolve2('${Foo/(.*)/${1:+Bar}/img}', 'Bar');
        //https://github.com/microsoft/vscode/issues/33162
        assertVariableResolve2('export default class ${TM_FILENAME/(\\w+)\\.js/$1/g}', 'export default class FooFile', 'FooFile.js');
        assertVariableResolve2('${foobarfoobar/(foo)/${1:+FAR}/g}', 'FARbarFARbar'); // global
        assertVariableResolve2('${foobarfoobar/(foo)/${1:+FAR}/}', 'FARbarfoobar'); // first match
        assertVariableResolve2('${foobarfoobar/(bazz)/${1:+FAR}/g}', 'foobarfoobar'); // no match, no else
        // assertVariableResolve2('${foobarfoobar/(bazz)/${1:+FAR}/g}', ''); // no match
        assertVariableResolve2('${foobarfoobar/(foo)/${2:+FAR}/g}', 'barbar'); // bad group reference
    });
    test('Snippet transforms do not handle regex with alternatives or optional matches, #36089', function () {
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'MyClass', 'my-class.js');
        // no hyphens
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'Myclass', 'myclass.js');
        // none matching suffix
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'Myclass.foo', 'myclass.foo');
        // more than one hyphen
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'ThisIsAFile', 'this-is-a-file.js');
        // KEBAB CASE
        assertVariableResolve2('${TM_FILENAME_BASE/([A-Z][a-z]+)([A-Z][a-z]+$)?/${1:/downcase}-${2:/downcase}/g}', 'capital-case', 'CapitalCase');
        assertVariableResolve2('${TM_FILENAME_BASE/([A-Z][a-z]+)([A-Z][a-z]+$)?/${1:/downcase}-${2:/downcase}/g}', 'capital-case-more', 'CapitalCaseMore');
    });
    test('Add variable to insert value from clipboard to a snippet #40153', function () {
        assertVariableResolve(new ClipboardBasedVariableResolver(() => undefined, 1, 0, true), 'CLIPBOARD', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => null, 1, 0, true), 'CLIPBOARD', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => '', 1, 0, true), 'CLIPBOARD', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'foo', 1, 0, true), 'CLIPBOARD', 'foo');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'foo', 1, 0, true), 'foo', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'foo', 1, 0, true), 'cLIPBOARD', undefined);
    });
    test('Add variable to insert value from clipboard to a snippet #40153, 2', function () {
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1', 1, 2, true), 'CLIPBOARD', 'line1');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2\nline3', 1, 2, true), 'CLIPBOARD', 'line1\nline2\nline3');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2', 1, 2, true), 'CLIPBOARD', 'line2');
        resolver = new ClipboardBasedVariableResolver(() => 'line1\nline2', 0, 2, true);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2', 0, 2, true), 'CLIPBOARD', 'line1');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2', 0, 2, false), 'CLIPBOARD', 'line1\nline2');
    });
    function assertVariableResolve3(resolver, varName) {
        const snippet = new SnippetParser().parse(`$${varName}`);
        const variable = snippet.children[0];
        assert.strictEqual(variable.resolve(resolver), true, `${varName} failed to resolve`);
    }
    test('Add time variables for snippets #41631, #43140', function () {
        const resolver = new TimeBasedVariableResolver;
        assertVariableResolve3(resolver, 'CURRENT_YEAR');
        assertVariableResolve3(resolver, 'CURRENT_YEAR_SHORT');
        assertVariableResolve3(resolver, 'CURRENT_MONTH');
        assertVariableResolve3(resolver, 'CURRENT_DATE');
        assertVariableResolve3(resolver, 'CURRENT_HOUR');
        assertVariableResolve3(resolver, 'CURRENT_MINUTE');
        assertVariableResolve3(resolver, 'CURRENT_SECOND');
        assertVariableResolve3(resolver, 'CURRENT_DAY_NAME');
        assertVariableResolve3(resolver, 'CURRENT_DAY_NAME_SHORT');
        assertVariableResolve3(resolver, 'CURRENT_MONTH_NAME');
        assertVariableResolve3(resolver, 'CURRENT_MONTH_NAME_SHORT');
        assertVariableResolve3(resolver, 'CURRENT_SECONDS_UNIX');
        assertVariableResolve3(resolver, 'CURRENT_TIMEZONE_OFFSET');
    });
    test('Time-based snippet variables resolve to the same values even as time progresses', async function () {
        const snippetText = `
			$CURRENT_YEAR
			$CURRENT_YEAR_SHORT
			$CURRENT_MONTH
			$CURRENT_DATE
			$CURRENT_HOUR
			$CURRENT_MINUTE
			$CURRENT_SECOND
			$CURRENT_DAY_NAME
			$CURRENT_DAY_NAME_SHORT
			$CURRENT_MONTH_NAME
			$CURRENT_MONTH_NAME_SHORT
			$CURRENT_SECONDS_UNIX
			$CURRENT_TIMEZONE_OFFSET
		`;
        const clock = sinon.useFakeTimers();
        try {
            const resolver = new TimeBasedVariableResolver;
            const firstResolve = new SnippetParser().parse(snippetText).resolveVariables(resolver);
            clock.tick((365 * 24 * 3600 * 1000) + (24 * 3600 * 1000) + (3661 * 1000)); // 1 year + 1 day + 1 hour + 1 minute + 1 second
            const secondResolve = new SnippetParser().parse(snippetText).resolveVariables(resolver);
            assert.strictEqual(firstResolve.toString(), secondResolve.toString(), `Time-based snippet variables resolved differently`);
        }
        finally {
            clock.restore();
        }
    });
    test('creating snippet - format-condition doesn\'t work #53617', function () {
        const snippet = new SnippetParser().parse('${TM_LINE_NUMBER/(10)/${1:?It is:It is not}/} line 10', true);
        snippet.resolveVariables({ resolve() { return '10'; } });
        assert.strictEqual(snippet.toString(), 'It is line 10');
        snippet.resolveVariables({ resolve() { return '11'; } });
        assert.strictEqual(snippet.toString(), 'It is not line 10');
    });
    test('Add workspace name and folder variables for snippets #68261', function () {
        let workspace;
        const workspaceService = new class {
            constructor() {
                this._throw = () => { throw new Error(); };
                this.onDidChangeWorkbenchState = this._throw;
                this.onDidChangeWorkspaceName = this._throw;
                this.onWillChangeWorkspaceFolders = this._throw;
                this.onDidChangeWorkspaceFolders = this._throw;
                this.getCompleteWorkspace = this._throw;
                this.getWorkbenchState = this._throw;
                this.getWorkspaceFolder = this._throw;
                this.isCurrentWorkspace = this._throw;
                this.isInsideWorkspace = this._throw;
            }
            getWorkspace() { return workspace; }
        };
        const resolver = new WorkspaceBasedVariableResolver(workspaceService);
        // empty workspace
        workspace = new Workspace('');
        assertVariableResolve(resolver, 'WORKSPACE_NAME', undefined);
        assertVariableResolve(resolver, 'WORKSPACE_FOLDER', undefined);
        // single folder workspace without config
        workspace = new Workspace('', [toWorkspaceFolder(URI.file('/folderName'))]);
        assertVariableResolve(resolver, 'WORKSPACE_NAME', 'folderName');
        if (!isWindows) {
            assertVariableResolve(resolver, 'WORKSPACE_FOLDER', '/folderName');
        }
        // workspace with config
        const workspaceConfigPath = URI.file('testWorkspace.code-workspace');
        workspace = new Workspace('', toWorkspaceFolders([{ path: 'folderName' }], workspaceConfigPath, extUriBiasedIgnorePathCase), workspaceConfigPath);
        assertVariableResolve(resolver, 'WORKSPACE_NAME', 'testWorkspace');
        if (!isWindows) {
            assertVariableResolve(resolver, 'WORKSPACE_FOLDER', '/');
        }
    });
    test('Add RELATIVE_FILEPATH snippet variable #114208', function () {
        let resolver;
        // Mock a label service (only coded for file uris)
        const workspaceLabelService = ((rootPath) => {
            const labelService = new class extends mock() {
                getUriLabel(uri, options = {}) {
                    const rootFsPath = URI.file(rootPath).fsPath + sep;
                    const fsPath = uri.fsPath;
                    if (options.relative && rootPath && fsPath.startsWith(rootFsPath)) {
                        return fsPath.substring(rootFsPath.length);
                    }
                    return fsPath;
                }
            };
            return labelService;
        });
        const model = createTextModel('', undefined, undefined, URI.parse('file:///foo/files/text.txt'));
        // empty workspace
        resolver = new ModelBasedVariableResolver(workspaceLabelService(''), model);
        if (!isWindows) {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', '/foo/files/text.txt');
        }
        else {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', '\\foo\\files\\text.txt');
        }
        // single folder workspace
        resolver = new ModelBasedVariableResolver(workspaceLabelService('/foo'), model);
        if (!isWindows) {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', 'files/text.txt');
        }
        else {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', 'files\\text.txt');
        }
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFZhcmlhYmxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NuaXBwZXQvdGVzdC9icm93c2VyL3NuaXBwZXRWYXJpYWJsZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBOEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsZ0NBQWdDLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQUUseUJBQXlCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1TyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFM0UsT0FBTyxFQUF3QyxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2hJ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QUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFL0cscUJBQXFCLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFM0cscUJBQXFCLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFeEcscUJBQXFCLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdkcscUJBQXFCLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckcscUJBQXFCLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDNUcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0VBQW9FLEVBQUU7UUFFMUUscUJBQXFCLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0cscUJBQXFCLENBQUMsSUFBSSw4QkFB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