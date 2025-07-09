/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getDomainsOfRemotes, getRemotes } from '../../common/configRemotes.js';
suite('Config Remotes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const allowedDomains = [
        'github.com',
        'github2.com',
        'github3.com',
        'example.com',
        'example2.com',
        'example3.com',
        'server.org',
        'server2.org',
    ];
    test('HTTPS remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://github.com/microsoft/vscode.git'), allowedDomains), ['github.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://git.example.com/gitproject.git'), allowedDomains), ['example.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://username@github2.com/username/repository.git'), allowedDomains), ['github2.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://username:password@github3.com/username/repository.git'), allowedDomains), ['github3.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://username:password@example2.com:1234/username/repository.git'), allowedDomains), ['example2.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://example3.com:1234/username/repository.git'), allowedDomains), ['example3.com']);
    });
    test('SSH remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('ssh://user@git.server.org/project.git'), allowedDomains), ['server.org']);
    });
    test('SCP-like remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('git@github.com:microsoft/vscode.git'), allowedDomains), ['github.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('user@git.server.org:project.git'), allowedDomains), ['server.org']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('git.server2.org:project.git'), allowedDomains), ['server2.org']);
    });
    test('Local remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('/opt/git/project.git'), allowedDomains), []);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('file:///opt/git/project.git'), allowedDomains), []);
    });
    test('Multiple remotes', function () {
        const config = ['https://github.com/microsoft/vscode.git', 'https://git.example.com/gitproject.git'].map(remote).join('');
        assert.deepStrictEqual(getDomainsOfRemotes(config, allowedDomains).sort(), ['example.com', 'github.com']);
    });
    test('Non allowed domains are anonymized', () => {
        const config = ['https://github.com/microsoft/vscode.git', 'https://git.foobar.com/gitproject.git'].map(remote).join('');
        assert.deepStrictEqual(getDomainsOfRemotes(config, allowedDomains).sort(), ['aaaaaa.aaa', 'github.com']);
    });
    test('HTTPS remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('https://github.com/microsoft/vscode.git')), ['github.com/microsoft/vscode.git']);
        assert.deepStrictEqual(getRemotes(remote('https://git.example.com/gitproject.git')), ['git.example.com/gitproject.git']);
        assert.deepStrictEqual(getRemotes(remote('https://username@github2.com/username/repository.git')), ['github2.com/username/repository.git']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@github3.com/username/repository.git')), ['github3.com/username/repository.git']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@example2.com:1234/username/repository.git')), ['example2.com/username/repository.git']);
        assert.deepStrictEqual(getRemotes(remote('https://example3.com:1234/username/repository.git')), ['example3.com/username/repository.git']);
        // Strip .git
        assert.deepStrictEqual(getRemotes(remote('https://github.com/microsoft/vscode.git'), true), ['github.com/microsoft/vscode']);
        assert.deepStrictEqual(getRemotes(remote('https://git.example.com/gitproject.git'), true), ['git.example.com/gitproject']);
        assert.deepStrictEqual(getRemotes(remote('https://username@github2.com/username/repository.git'), true), ['github2.com/username/repository']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@github3.com/username/repository.git'), true), ['github3.com/username/repository']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@example2.com:1234/username/repository.git'), true), ['example2.com/username/repository']);
        assert.deepStrictEqual(getRemotes(remote('https://example3.com:1234/username/repository.git'), true), ['example3.com/username/repository']);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(getRemotes(remote('https://github.com/microsoft/vscode.git'), true), getRemotes(remote('https://github.com/microsoft/vscode')));
        assert.deepStrictEqual(getRemotes(remote('https://git.example.com/gitproject.git'), true), getRemotes(remote('https://git.example.com/gitproject')));
        assert.deepStrictEqual(getRemotes(remote('https://username@github2.com/username/repository.git'), true), getRemotes(remote('https://username@github2.com/username/repository')));
        assert.deepStrictEqual(getRemotes(remote('https://username:password@github3.com/username/repository.git'), true), getRemotes(remote('https://username:password@github3.com/username/repository')));
        assert.deepStrictEqual(getRemotes(remote('https://username:password@example2.com:1234/username/repository.git'), true), getRemotes(remote('https://username:password@example2.com:1234/username/repository')));
        assert.deepStrictEqual(getRemotes(remote('https://example3.com:1234/username/repository.git'), true), getRemotes(remote('https://example3.com:1234/username/repository')));
    });
    test('SSH remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('ssh://user@git.server.org/project.git')), ['git.server.org/project.git']);
        // Strip .git
        assert.deepStrictEqual(getRemotes(remote('ssh://user@git.server.org/project.git'), true), ['git.server.org/project']);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(getRemotes(remote('ssh://user@git.server.org/project.git'), true), getRemotes(remote('ssh://user@git.server.org/project')));
    });
    test('SCP-like remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('git@github.com:microsoft/vscode.git')), ['github.com/microsoft/vscode.git']);
        assert.deepStrictEqual(getRemotes(remote('user@git.server.org:project.git')), ['git.server.org/project.git']);
        assert.deepStrictEqual(getRemotes(remote('git.server2.org:project.git')), ['git.server2.org/project.git']);
        // Strip .git
        assert.deepStrictEqual(getRemotes(remote('git@github.com:microsoft/vscode.git'), true), ['github.com/microsoft/vscode']);
        assert.deepStrictEqual(getRemotes(remote('user@git.server.org:project.git'), true), ['git.server.org/project']);
        assert.deepStrictEqual(getRemotes(remote('git.server2.org:project.git'), true), ['git.server2.org/project']);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(getRemotes(remote('git@github.com:microsoft/vscode.git'), true), getRemotes(remote('git@github.com:microsoft/vscode')));
        assert.deepStrictEqual(getRemotes(remote('user@git.server.org:project.git'), true), getRemotes(remote('user@git.server.org:project')));
        assert.deepStrictEqual(getRemotes(remote('git.server2.org:project.git'), true), getRemotes(remote('git.server2.org:project')));
    });
    test('Local remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('/opt/git/project.git')), []);
        assert.deepStrictEqual(getRemotes(remote('file:///opt/git/project.git')), []);
    });
    test('Multiple remotes to be hashed', function () {
        const config = ['https://github.com/microsoft/vscode.git', 'https://git.example.com/gitproject.git'].map(remote).join(' ');
        assert.deepStrictEqual(getRemotes(config), ['github.com/microsoft/vscode.git', 'git.example.com/gitproject.git']);
        // Strip .git
        assert.deepStrictEqual(getRemotes(config, true), ['github.com/microsoft/vscode', 'git.example.com/gitproject']);
        // Compare Striped .git with no .git
        const noDotGitConfig = ['https://github.com/microsoft/vscode', 'https://git.example.com/gitproject'].map(remote).join(' ');
        assert.deepStrictEqual(getRemotes(config, true), getRemotes(noDotGitConfig));
    });
    function remote(url) {
        return `[remote "origin"]
	url = ${url}
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnUmVtb3Rlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vY29uZmlnUmVtb3Rlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFaEYsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUU1Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sY0FBYyxHQUFHO1FBQ3RCLFlBQVk7UUFDWixhQUFhO1FBQ2IsYUFBYTtRQUNiLGFBQWE7UUFDYixjQUFjO1FBQ2QsY0FBYztRQUNkLFlBQVk7UUFDWixhQUFhO0tBQ2IsQ0FBQztJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMseUNBQXlDLENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDL0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsd0NBQXdDLENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDL0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsc0RBQXNELENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDN0ksTUFBTSxDQUFD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