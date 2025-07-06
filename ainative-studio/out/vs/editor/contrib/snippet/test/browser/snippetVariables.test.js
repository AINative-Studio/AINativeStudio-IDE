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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFZhcmlhYmxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L3Rlc3QvYnJvd3Nlci9zbmlwcGV0VmFyaWFibGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQThCLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0YsT0FBTyxFQUFFLDhCQUE4QixFQUFFLGdDQUFnQyxFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLHlCQUF5QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNU8sT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTNFLE9BQU8sRUFBd0MsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztB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QixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRS9HLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNHLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXhHLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXZHLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JHLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzVHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9FQUFvRSxFQUFFO1FBRTFFLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNHLHFCQUFxQixDQUFDLElBQUksOEJBQThCLENBQUMsR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUV2SSxxQkFBcUIsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsSCxRQUFRLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRixxQkFBcUIsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVsSCxxQkFBcUIsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUMzSCxDQUFDLENBQUMsQ0FBQztJQUdILFNBQVMsc0JBQXNCLENBQUMsUUFBMEIsRUFBRSxPQUFlO1FBQzFFLE1BQU0sT0FBTyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLFFBQVEsR0FBYSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLG9CQUFvQixDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELElBQUksQ0FBQyxnREFBZ0QsRUFBRTtRQUV0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUFDO1FBRS9DLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNqRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2RCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbEQsc0JBQXNCLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pELHNCQUFzQixDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNqRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNyRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUMzRCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2RCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM3RCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUN6RCxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRSxLQUFLO1FBQzVGLE1BQU0sV0FBVyxHQUFHOzs7Ozs7Ozs7Ozs7OztHQWNuQixDQUFDO1FBRUYsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BDLElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQUM7WUFFL0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkYsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUUsZ0RBQWdEO1lBQzVILE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXhGLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxtREFBbUQsQ0FBQyxDQUFDO1FBQzVILENBQUM7Z0JBQVMsQ0FBQztZQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMERBQTBELEVBQUU7UUFFaEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsdURBQXVELEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUV4RCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkRBQTZELEVBQUU7UUFFbkUsSUFBSSxTQUFxQixDQUFDO1FBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSTtZQUFBO2dCQUU1QixXQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0Qyw4QkFBeUIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN4Qyw2QkFBd0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN2QyxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUMzQyxnQ0FBMkIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUMxQyx5QkFBb0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUVuQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNoQyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNqQyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNqQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ2pDLENBQUM7WUFMQSxZQUFZLEtBQWlCLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztTQUtoRCxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXRFLGtCQUFrQjtRQUNsQixTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIscUJBQXFCLENBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzdELHFCQUFxQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUUvRCx5Q0FBeUM7UUFDekMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUscUJBQXFCLENBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELHdCQUF3QjtRQUN4QixNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUNyRSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxtQkFBbUIsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDbEoscUJBQXFCLENBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFO1FBRXRELElBQUksUUFBMEIsQ0FBQztRQUUvQixrREFBa0Q7UUFDbEQsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUMsUUFBZ0IsRUFBaUIsRUFBRTtZQUNsRSxNQUFNLFlBQVksR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWlCO2dCQUNsRCxXQUFXLENBQUMsR0FBUSxFQUFFLFVBQWtDLEVBQUU7b0JBQ2xFLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztvQkFDbkQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztvQkFDMUIsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFFBQVEsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7d0JBQ25FLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVDLENBQUM7b0JBQ0QsT0FBTyxNQUFNLENBQUM7Z0JBQ2YsQ0FBQzthQUNELENBQUM7WUFDRixPQUFPLFlBQVksQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztRQUVqRyxrQkFBa0I7UUFDbEIsUUFBUSxHQUFHLElBQUksMEJBQTBCLENBQ3hDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxFQUN6QixLQUFLLENBQ0wsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUM3RSxDQUFDO2FBQU0sQ0FBQztZQUNQLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsUUFBUSxHQUFHLElBQUksMEJBQTBCLENBQ3hDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxFQUM3QixLQUFLLENBQ0wsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RSxDQUFDO2FBQU0sQ0FBQztZQUNQLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7UUFFRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9