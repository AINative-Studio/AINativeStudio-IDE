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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJlU25pcHBldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL2NvbW1hbmRzL2NvbmZpZ3VyZVNuaXBwZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFrQyxNQUFNLHlEQUF5RCxDQUFDO0FBQzdILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FB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