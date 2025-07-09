/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getHashedRemotesFromConfig as baseGetHashedRemotesFromConfig } from '../../common/workspaceTags.js';
function hash(value) {
    return crypto.createHash('sha256').update(value.toString()).digest('hex');
}
async function asyncHash(value) {
    return hash(value);
}
export async function getHashedRemotesFromConfig(text, stripEndingDotGit = false) {
    return baseGetHashedRemotesFromConfig(text, stripEndingDotGit, remote => asyncHash(remote));
}
suite('Telemetry - WorkspaceTags', () => {
    test('Single remote hashed', async function () {
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository.git')), [hash('github3.com/username/repository.git')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git')), [hash('git.server.org/project.git')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('user@git.server.org:project.git')), [hash('git.server.org/project.git')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('/opt/git/project.git')), []);
        // Strip .git
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository.git'), true), [hash('github3.com/username/repository')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), [hash('git.server.org/project')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hash('git.server.org/project')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('/opt/git/project.git'), true), []);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository.git'), true), await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository')));
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project')));
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hash('git.server.org/project')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('/opt/git/project.git'), true), await getHashedRemotesFromConfig(remote('/opt/git/project')));
    });
    test('Multiple remotes hashed', async function () {
        const config = ['https://github.com/microsoft/vscode.git', 'https://git.example.com/gitproject.git'].map(remote).join(' ');
        assert.deepStrictEqual(await getHashedRemotesFromConfig(config), [hash('github.com/microsoft/vscode.git'), hash('git.example.com/gitproject.git')]);
        // Strip .git
        assert.deepStrictEqual(await getHashedRemotesFromConfig(config, true), [hash('github.com/microsoft/vscode'), hash('git.example.com/gitproject')]);
        // Compare Striped .git with no .git
        const noDotGitConfig = ['https://github.com/microsoft/vscode', 'https://git.example.com/gitproject'].map(remote).join(' ');
        assert.deepStrictEqual(await getHashedRemotesFromConfig(config, true), await getHashedRemotesFromConfig(noDotGitConfig));
    });
    function remote(url) {
        return `[remote "origin"]
	url = ${url}
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RhZ3MvdGVzdC9ub2RlL3dvcmtzcGFjZVRhZ3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLDBCQUEwQixJQUFJLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFN0csU0FBUyxJQUFJLENBQUMsS0FBYTtJQUMxQixPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzRSxDQUFDO0FBRUQsS0FBSyxVQUFVLFNBQVMsQ0FBQyxLQUFhO0lBQ3JDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLDBCQUEwQixDQUFDLElBQVksRUFBRSxvQkFBNkIsS0FBSztJQUNoRyxPQUFPLDhCQUE4QixDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzdGLENBQUM7QUFFRCxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBRXZDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLO1FBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSwwQkFBMEIs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