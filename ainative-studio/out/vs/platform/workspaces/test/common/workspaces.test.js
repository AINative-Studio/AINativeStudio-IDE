/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { reviveIdentifier, hasWorkspaceFileExtension, isWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier, toWorkspaceIdentifier, isEmptyWorkspaceIdentifier } from '../../../workspace/common/workspace.js';
suite('Workspaces', () => {
    test('reviveIdentifier', () => {
        const serializedWorkspaceIdentifier = { id: 'id', configPath: URI.file('foo').toJSON() };
        assert.strictEqual(isWorkspaceIdentifier(reviveIdentifier(serializedWorkspaceIdentifier)), true);
        const serializedSingleFolderWorkspaceIdentifier = { id: 'id', uri: URI.file('foo').toJSON() };
        assert.strictEqual(isSingleFolderWorkspaceIdentifier(reviveIdentifier(serializedSingleFolderWorkspaceIdentifier)), true);
        const serializedEmptyWorkspaceIdentifier = { id: 'id' };
        assert.strictEqual(reviveIdentifier(serializedEmptyWorkspaceIdentifier).id, serializedEmptyWorkspaceIdentifier.id);
        assert.strictEqual(isWorkspaceIdentifier(serializedEmptyWorkspaceIdentifier), false);
        assert.strictEqual(isSingleFolderWorkspaceIdentifier(serializedEmptyWorkspaceIdentifier), false);
        assert.strictEqual(reviveIdentifier(undefined), undefined);
    });
    test('hasWorkspaceFileExtension', () => {
        assert.strictEqual(hasWorkspaceFileExtension('something'), false);
        assert.strictEqual(hasWorkspaceFileExtension('something.code-workspace'), true);
    });
    test('toWorkspaceIdentifier', () => {
        let identifier = toWorkspaceIdentifier({ id: 'id', folders: [] });
        assert.ok(identifier);
        assert.ok(isEmptyWorkspaceIdentifier(identifier));
        assert.ok(!isWorkspaceIdentifier(identifier));
        assert.ok(!isWorkspaceIdentifier(identifier));
        identifier = toWorkspaceIdentifier({ id: 'id', folders: [{ index: 0, name: 'test', toResource: () => URI.file('test'), uri: URI.file('test') }] });
        assert.ok(identifier);
        assert.ok(isSingleFolderWorkspaceIdentifier(identifier));
        assert.ok(!isWorkspaceIdentifier(identifier));
        identifier = toWorkspaceIdentifier({ id: 'id', configuration: URI.file('test.code-workspace'), folders: [] });
        assert.ok(identifier);
        assert.ok(!isSingleFolderWorkspaceIdentifier(identifier));
        assert.ok(isWorkspaceIdentifier(identifier));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvdGVzdC9jb21tb24vd29ya3NwYWNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUE4RSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxxQkFBcUIsRUFBRSxpQ0FBaUMsRUFBNkIscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV6VCxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUV4QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sNkJBQTZCLEdBQW1DLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ3pILE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpHLE1BQU0seUNBQXlDLEdBQStDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQzFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUNBQWlDLENBQUMsZ0JBQWdCLENBQUMseUNBQXlDLENB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