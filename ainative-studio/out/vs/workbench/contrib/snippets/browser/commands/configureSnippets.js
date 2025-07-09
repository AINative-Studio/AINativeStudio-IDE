/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isValidBasename } from '../../../../../base/common/extpath.js';
import { extname } from '../../../../../base/common/path.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClassesForLanguageId } from '../../../../../editor/common/services/getIconClasses.js';
import * as nls from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { SnippetsAction } from './abstractSnippetsActions.js';
import { ISnippetsService } from '../snippets.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
var ISnippetPick;
(function (ISnippetPick) {
    function is(thing) {
        return !!thing && URI.isUri(thing.filepath);
    }
    ISnippetPick.is = is;
})(ISnippetPick || (ISnippetPick = {}));
async function computePicks(snippetService, userDataProfileService, languageService, labelService) {
    const existing = [];
    const future = [];
    const seen = new Set();
    const added = new Map();
    for (const file of await snippetService.getSnippetFiles()) {
        if (file.source === 3 /* SnippetSource.Extension */) {
            // skip extension snippets
            continue;
        }
        if (file.isGlobalSnippets) {
            await file.load();
            // list scopes for global snippets
            const names = new Set();
            let source;
            outer: for (const snippet of file.data) {
                if (!source) {
                    source = snippet.source;
                }
                for (const scope of snippet.scopes) {
                    const name = languageService.getLanguageName(scope);
                    if (name) {
                        if (names.size >= 4) {
                            names.add(`${name}...`);
                            break outer;
                        }
                        else {
                            names.add(name);
                        }
                    }
                }
            }
            const snippet = {
                label: basename(file.location),
                filepath: file.location,
                description: names.size === 0
                    ? nls.localize('global.scope', "(global)")
                    : nls.localize('global.1', "({0})", [...names].join(', '))
            };
            existing.push(snippet);
            if (!source) {
                continue;
            }
            const detail = nls.localize('detail.label', "({0}) {1}", source, labelService.getUriLabel(file.location, { relative: true }));
            const lastItem = added.get(basename(file.location));
            if (lastItem) {
                snippet.detail = detail;
                lastItem.snippet.detail = lastItem.detail;
            }
            added.set(basename(file.location), { snippet, detail });
        }
        else {
            // language snippet
            const mode = basename(file.location).replace(/\.json$/, '');
            existing.push({
                label: basename(file.location),
                description: `(${languageService.getLanguageName(mode) ?? mode})`,
                filepath: file.location
            });
            seen.add(mode);
        }
    }
    const dir = userDataProfileService.currentProfile.snippetsHome;
    for (const languageId of languageService.getRegisteredLanguageIds()) {
        const label = languageService.getLanguageName(languageId);
        if (label && !seen.has(languageId)) {
            future.push({
                label: languageId,
                description: `(${label})`,
                filepath: joinPath(dir, `${languageId}.json`),
                hint: true,
                iconClasses: getIconClassesForLanguageId(languageId)
            });
        }
    }
    existing.sort((a, b) => {
        const a_ext = extname(a.filepath.path);
        const b_ext = extname(b.filepath.path);
        if (a_ext === b_ext) {
            return a.label.localeCompare(b.label);
        }
        else if (a_ext === '.code-snippets') {
            return -1;
        }
        else {
            return 1;
        }
    });
    future.sort((a, b) => {
        return a.label.localeCompare(b.label);
    });
    return { existing, future };
}
async function createSnippetFile(scope, defaultPath, quickInputService, fileService, textFileService, opener) {
    function createSnippetUri(input) {
        const filename = extname(input) !== '.code-snippets'
            ? `${input}.code-snippets`
            : input;
        return joinPath(defaultPath, filename);
    }
    await fileService.createFolder(defaultPath);
    const input = await quickInputService.input({
        placeHolder: nls.localize('name', "Type snippet file name"),
        async validateInput(input) {
            if (!input) {
                return nls.localize('bad_name1', "Invalid file name");
            }
            if (!isValidBasename(input)) {
                return nls.localize('bad_name2', "'{0}' is not a valid file name", input);
            }
            if (await fileService.exists(createSnippetUri(input))) {
                return nls.localize('bad_name3', "'{0}' already exists", input);
            }
            return undefined;
        }
    });
    if (!input) {
        return undefined;
    }
    const resource = createSnippetUri(input);
    await textFileService.write(resource, [
        '{',
        '\t// Place your ' + scope + ' snippets here. Each snippet is defined under a snippet name and has a scope, prefix, body and ',
        '\t// description. Add comma separated ids of the languages where the snippet is applicable in the scope field. If scope ',
        '\t// is left empty or omitted, the snippet gets applied to all languages. The prefix is what is ',
        '\t// used to trigger the snippet and the body will be expanded and inserted. Possible variables are: ',
        '\t// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. ',
        '\t// Placeholders with the same ids are connected.',
        '\t// Example:',
        '\t// "Print to console": {',
        '\t// \t"scope": "javascript,typescript",',
        '\t// \t"prefix": "log",',
        '\t// \t"body": [',
        '\t// \t\t"console.log(\'$1\');",',
        '\t// \t\t"$2"',
        '\t// \t],',
        '\t// \t"description": "Log output to console"',
        '\t// }',
        '}'
    ].join('\n'));
    await opener.open(resource);
    return undefined;
}
async function createLanguageSnippetFile(pick, fileService, textFileService) {
    if (await fileService.exists(pick.filepath)) {
        return;
    }
    const contents = [
        '{',
        '\t// Place your snippets for ' + pick.label + ' here. Each snippet is defined under a snippet name and has a prefix, body and ',
        '\t// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:',
        '\t// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. Placeholders with the ',
        '\t// same ids are connected.',
        '\t// Example:',
        '\t// "Print to console": {',
        '\t// \t"prefix": "log",',
        '\t// \t"body": [',
        '\t// \t\t"console.log(\'$1\');",',
        '\t// \t\t"$2"',
        '\t// \t],',
        '\t// \t"description": "Log output to console"',
        '\t// }',
        '}'
    ].join('\n');
    await textFileService.write(pick.filepath, contents);
}
export class ConfigureSnippetsAction extends SnippetsAction {
    constructor() {
        super({
            id: 'workbench.action.openSnippets',
            title: nls.localize2('openSnippet.label', "Configure Snippets"),
            shortTitle: {
                ...nls.localize2('userSnippets', "Snippets"),
                mnemonicTitle: nls.localize({ key: 'miOpenSnippets', comment: ['&& denotes a mnemonic'] }, "&&Snippets"),
            },
            f1: true,
            menu: [
                { id: MenuId.MenubarPreferencesMenu, group: '2_configuration', order: 5 },
                { id: MenuId.GlobalActivity, group: '2_configuration', order: 5 },
            ]
        });
    }
    async run(accessor) {
        const snippetService = accessor.get(ISnippetsService);
        const quickInputService = accessor.get(IQuickInputService);
        const opener = accessor.get(IOpenerService);
        const languageService = accessor.get(ILanguageService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const workspaceService = accessor.get(IWorkspaceContextService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const labelService = accessor.get(ILabelService);
        const picks = await computePicks(snippetService, userDataProfileService, languageService, labelService);
        const existing = picks.existing;
        const globalSnippetPicks = [{
                scope: nls.localize('new.global_scope', 'global'),
                label: nls.localize('new.global', "New Global Snippets file..."),
                uri: userDataProfileService.currentProfile.snippetsHome
            }];
        const workspaceSnippetPicks = [];
        for (const folder of workspaceService.getWorkspace().folders) {
            workspaceSnippetPicks.push({
                scope: nls.localize('new.workspace_scope', "{0} workspace", folder.name),
                label: nls.localize('new.folder', "New Snippets file for '{0}'...", folder.name),
                uri: folder.toResource('.vscode')
            });
        }
        if (existing.length > 0) {
            existing.unshift({ type: 'separator', label: nls.localize('group.global', "Existing Snippets") });
            existing.push({ type: 'separator', label: nls.localize('new.global.sep', "New Snippets") });
        }
        else {
            existing.push({ type: 'separator', label: nls.localize('new.global.sep', "New Snippets") });
        }
        const pick = await quickInputService.pick([].concat(existing, globalSnippetPicks, workspaceSnippetPicks, picks.future), {
            placeHolder: nls.localize('openSnippet.pickLanguage', "Select Snippets File or Create Snippets"),
            matchOnDescription: true
        });
        if (globalSnippetPicks.indexOf(pick) >= 0) {
            return createSnippetFile(pick.scope, pick.uri, quickInputService, fileService, textFileService, opener);
        }
        else if (workspaceSnippetPicks.indexOf(pick) >= 0) {
            return createSnippetFile(pick.scope, pick.uri, quickInputService, fileService, textFileService, opener);
        }
        else if (ISnippetPick.is(pick)) {
            if (pick.hint) {
                await createLanguageSnippetFile(pick, fileService, textFileService);
            }
            return opener.open(pick.filepath);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJlU25pcHBldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9jb21tYW5kcy9jb25maWd1cmVTbmlwcGV0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0MsTUFBTSx5REFBeUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0JBQWdCLENB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