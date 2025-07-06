"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFileInRepo = isFileInRepo;
exports.getRepositoryForFile = getRepositoryForFile;
exports.rangeString = rangeString;
exports.notebookCellRangeString = notebookCellRangeString;
exports.encodeURIComponentExceptSlashes = encodeURIComponentExceptSlashes;
exports.getLink = getLink;
exports.getAvatarLink = getAvatarLink;
exports.getBranchLink = getBranchLink;
exports.getCommitLink = getCommitLink;
exports.getVscodeDevHost = getVscodeDevHost;
exports.ensurePublished = ensurePublished;
const vscode = __importStar(require("vscode"));
const util_1 = require("./util");
function isFileInRepo(repository, file) {
    return file.path.toLowerCase() === repository.rootUri.path.toLowerCase() ||
        (file.path.toLowerCase().startsWith(repository.rootUri.path.toLowerCase()) &&
            file.path.substring(repository.rootUri.path.length).startsWith('/'));
}
function getRepositoryForFile(gitAPI, file) {
    for (const repository of gitAPI.repositories) {
        if (isFileInRepo(repository, file)) {
            return repository;
        }
    }
    return undefined;
}
var LinkType;
(function (LinkType) {
    LinkType[LinkType["File"] = 1] = "File";
    LinkType[LinkType["Notebook"] = 2] = "Notebook";
})(LinkType || (LinkType = {}));
function extractContext(context) {
    if (context instanceof vscode.Uri) {
        return { fileUri: context, lineNumber: undefined };
    }
    else if (context !== undefined && 'lineNumber' in context && 'uri' in context) {
        return { fileUri: context.uri, lineNumber: context.lineNumber };
    }
    else {
        return { fileUri: undefined, lineNumber: undefined };
    }
}
function getFileAndPosition(context) {
    let range;
    const { fileUri, lineNumber } = extractContext(context);
    const uri = fileUri ?? vscode.window.activeTextEditor?.document.uri;
    if (uri) {
        if (uri.scheme === 'vscode-notebook-cell' && vscode.window.activeNotebookEditor?.notebook.uri.fsPath === uri.fsPath) {
            // if the active editor is a notebook editor and the focus is inside any a cell text editor
            // generate deep link for text selection for the notebook cell.
            const cell = vscode.window.activeNotebookEditor.notebook.getCells().find(cell => cell.document.uri.fragment === uri?.fragment);
            const cellIndex = cell?.index ?? vscode.window.activeNotebookEditor.selection.start;
            const range = getRangeOrSelection(lineNumber);
            return { type: LinkType.Notebook, uri, cellIndex, range };
        }
        else {
            // the active editor is a text editor
            range = getRangeOrSelection(lineNumber);
            return { type: LinkType.File, uri, range };
        }
    }
    if (vscode.window.activeNotebookEditor) {
        // if the active editor is a notebook editor but the focus is not inside any cell text editor, generate deep link for the cell selection in the notebook document.
        return { type: LinkType.Notebook, uri: vscode.window.activeNotebookEditor.notebook.uri, cellIndex: vscode.window.activeNotebookEditor.selection.start, range: undefined };
    }
    return undefined;
}
function getRangeOrSelection(lineNumber) {
    return lineNumber !== undefined && (!vscode.window.activeTextEditor || vscode.window.activeTextEditor.selection.isEmpty || !vscode.window.activeTextEditor.selection.contains(new vscode.Position(lineNumber - 1, 0)))
        ? new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 1)
        : vscode.window.activeTextEditor?.selection;
}
function rangeString(range) {
    if (!range) {
        return '';
    }
    let hash = `#L${range.start.line + 1}`;
    if (range.start.line !== range.end.line) {
        hash += `-L${range.end.line + 1}`;
    }
    return hash;
}
function notebookCellRangeString(index, range) {
    if (index === undefined) {
        return '';
    }
    if (!range) {
        return `#C${index + 1}`;
    }
    let hash = `#C${index + 1}:L${range.start.line + 1}`;
    if (range.start.line !== range.end.line) {
        hash += `-L${range.end.line + 1}`;
    }
    return hash;
}
function encodeURIComponentExceptSlashes(path) {
    // There may be special characters like # and whitespace in the path.
    // These characters are not escaped by encodeURI(), so it is not sufficient to
    // feed the full URI to encodeURI().
    // Additonally, if we feed the full path into encodeURIComponent(),
    // this will also encode the path separators, leading to an invalid path.
    // Therefore, split on the path separator and encode each segment individually.
    return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}
async function getLink(gitAPI, useSelection, shouldEnsurePublished, hostPrefix, linkType = 'permalink', context, useRange) {
    hostPrefix = hostPrefix ?? 'https://github.com';
    const fileAndPosition = getFileAndPosition(context);
    const fileUri = fileAndPosition?.uri;
    // Use the first repo if we cannot determine a repo from the uri.
    const githubRepository = gitAPI.repositories.find(repo => (0, util_1.repositoryHasGitHubRemote)(repo));
    const gitRepo = (fileUri ? getRepositoryForFile(gitAPI, fileUri) : githubRepository) ?? githubRepository;
    if (!gitRepo) {
        return;
    }
    if (shouldEnsurePublished && fileUri) {
        await ensurePublished(gitRepo, fileUri);
    }
    let repo;
    gitRepo.state.remotes.find(remote => {
        if (remote.fetchUrl) {
            const foundRepo = (0, util_1.getRepositoryFromUrl)(remote.fetchUrl);
            if (foundRepo && (remote.name === gitRepo.state.HEAD?.upstream?.remote)) {
                repo = foundRepo;
                return;
            }
            else if (foundRepo && !repo) {
                repo = foundRepo;
            }
        }
        return;
    });
    if (!repo) {
        return;
    }
    const blobSegment = gitRepo.state.HEAD ? (`/blob/${linkType === 'headlink' && gitRepo.state.HEAD.name ? encodeURIComponentExceptSlashes(gitRepo.state.HEAD.name) : gitRepo.state.HEAD?.commit}`) : '';
    const uriWithoutFileSegments = `${hostPrefix}/${repo.owner}/${repo.repo}${blobSegment}`;
    if (!fileUri) {
        return uriWithoutFileSegments;
    }
    const encodedFilePath = encodeURIComponentExceptSlashes(fileUri.path.substring(gitRepo.rootUri.path.length));
    const fileSegments = fileAndPosition.type === LinkType.File
        ? (useSelection ? `${encodedFilePath}${useRange ? rangeString(fileAndPosition.range) : ''}` : '')
        : (useSelection ? `${encodedFilePath}${useRange ? notebookCellRangeString(fileAndPosition.cellIndex, fileAndPosition.range) : ''}` : '');
    return `${uriWithoutFileSegments}${fileSegments}`;
}
function getAvatarLink(userId, size) {
    return `https://avatars.githubusercontent.com/u/${userId}?s=${size}`;
}
function getBranchLink(url, branch, hostPrefix = 'https://github.com') {
    const repo = (0, util_1.getRepositoryFromUrl)(url);
    if (!repo) {
        throw new Error('Invalid repository URL provided');
    }
    branch = encodeURIComponentExceptSlashes(branch);
    return `${hostPrefix}/${repo.owner}/${repo.repo}/tree/${branch}`;
}
function getCommitLink(url, hash, hostPrefix = 'https://github.com') {
    const repo = (0, util_1.getRepositoryFromUrl)(url);
    if (!repo) {
        throw new Error('Invalid repository URL provided');
    }
    return `${hostPrefix}/${repo.owner}/${repo.repo}/commit/${hash}`;
}
function getVscodeDevHost() {
    return `https://${vscode.env.appName.toLowerCase().includes('insiders') ? 'insiders.' : ''}vscode.dev/github`;
}
async function ensurePublished(repository, file) {
    await repository.status();
    if ((repository.state.HEAD?.type === 0 /* RefType.Head */ || repository.state.HEAD?.type === 2 /* RefType.Tag */)
        // If HEAD is not published, make sure it is
        && !repository?.state.HEAD?.upstream) {
        const publishBranch = vscode.l10n.t('Publish Branch & Copy Link');
        const selection = await vscode.window.showInformationMessage(vscode.l10n.t('The current branch is not published to the remote. Would you like to publish your branch before copying a link?'), { modal: true }, publishBranch);
        if (selection !== publishBranch) {
            throw new vscode.CancellationError();
        }
        await vscode.commands.executeCommand('git.publish');
    }
    const uncommittedChanges = [...repository.state.workingTreeChanges, ...repository.state.indexChanges];
    if (uncommittedChanges.find((c) => c.uri.toString() === file.toString()) && !repository.state.HEAD?.ahead && !repository.state.HEAD?.behind) {
        const commitChanges = vscode.l10n.t('Commit Changes');
        const copyAnyway = vscode.l10n.t('Copy Anyway');
        const selection = await vscode.window.showWarningMessage(vscode.l10n.t('The current file has uncommitted changes. Please commit your changes before copying a link.'), { modal: true }, commitChanges, copyAnyway);
        if (selection !== copyAnyway) {
            // Focus the SCM view
            vscode.commands.executeCommand('workbench.view.scm');
            throw new vscode.CancellationError();
        }
    }
    else if (repository.state.HEAD?.ahead) {
        const pushCommits = vscode.l10n.t('Push Commits & Copy Link');
        const selection = await vscode.window.showInformationMessage(vscode.l10n.t('The current branch has unpublished commits. Would you like to push your commits before copying a link?'), { modal: true }, pushCommits);
        if (selection !== pushCommits) {
            throw new vscode.CancellationError();
        }
        await repository.push();
    }
    else if (repository.state.HEAD?.behind) {
        const pull = vscode.l10n.t('Pull Changes & Copy Link');
        const selection = await vscode.window.showInformationMessage(vscode.l10n.t('The current branch is not up to date. Would you like to pull before copying a link?'), { modal: true }, pull);
        if (selection !== pull) {
            throw new vscode.CancellationError();
        }
        await repository.pull();
    }
    await repository.status();
}
//# sourceMappingURL=links.js.map