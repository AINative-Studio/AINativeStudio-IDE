/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../../base/common/event.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
let TerminalQuickFixService = class TerminalQuickFixService {
    get providers() { return this._providers; }
    constructor(_logService) {
        this._logService = _logService;
        this._selectors = new Map();
        this._providers = new Map();
        this._onDidRegisterProvider = new Emitter();
        this.onDidRegisterProvider = this._onDidRegisterProvider.event;
        this._onDidRegisterCommandSelector = new Emitter();
        this.onDidRegisterCommandSelector = this._onDidRegisterCommandSelector.event;
        this._onDidUnregisterProvider = new Emitter();
        this.onDidUnregisterProvider = this._onDidUnregisterProvider.event;
        this.extensionQuickFixes = new Promise((r) => quickFixExtensionPoint.setHandler(fixes => {
            r(fixes.filter(c => isProposedApiEnabled(c.description, 'terminalQuickFixProvider')).map(c => {
                if (!c.value) {
                    return [];
                }
                return c.value.map(fix => { return { ...fix, extensionIdentifier: c.description.identifier.value }; });
            }).flat());
        }));
        this.extensionQuickFixes.then(selectors => {
            for (const selector of selectors) {
                this.registerCommandSelector(selector);
            }
        });
    }
    registerCommandSelector(selector) {
        this._selectors.set(selector.id, selector);
        this._onDidRegisterCommandSelector.fire(selector);
    }
    registerQuickFixProvider(id, provider) {
        // This is more complicated than it looks like it should be because we need to return an
        // IDisposable synchronously but we must await ITerminalContributionService.quickFixes
        // asynchronously before actually registering the provider.
        let disposed = false;
        this.extensionQuickFixes.then(() => {
            if (disposed) {
                return;
            }
            this._providers.set(id, provider);
            const selector = this._selectors.get(id);
            if (!selector) {
                this._logService.error(`No registered selector for ID: ${id}`);
                return;
            }
            this._onDidRegisterProvider.fire({ selector, provider });
        });
        return toDisposable(() => {
            disposed = true;
            this._providers.delete(id);
            const selector = this._selectors.get(id);
            if (selector) {
                this._selectors.delete(id);
                this._onDidUnregisterProvider.fire(selector.id);
            }
        });
    }
};
TerminalQuickFixService = __decorate([
    __param(0, ILogService)
], TerminalQuickFixService);
export { TerminalQuickFixService };
const quickFixExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'terminalQuickFixes',
    defaultExtensionKind: ['workspace'],
    activationEventsGenerator: (terminalQuickFixes, result) => {
        for (const quickFixContrib of terminalQuickFixes ?? []) {
            result.push(`onTerminalQuickFixRequest:${quickFixContrib.id}`);
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.terminalQuickFixes', 'Contributes terminal quick fixes.'),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'commandLineMatcher', 'outputMatcher', 'commandExitResult'],
            defaultSnippets: [{
                    body: {
                        id: '$1',
                        commandLineMatcher: '$2',
                        outputMatcher: '$3',
                        exitStatus: '$4'
                    }
                }],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.id', "The ID of the quick fix provider"),
                    type: 'string',
                },
                commandLineMatcher: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.commandLineMatcher', "A regular expression or string to test the command line against"),
                    type: 'string',
                },
                outputMatcher: {
                    markdownDescription: localize('vscode.extension.contributes.terminalQuickFixes.outputMatcher', "A regular expression or string to match a single line of the output against, which provides groups to be referenced in terminalCommand and uri.\n\nFor example:\n\n `lineMatcher: /git push --set-upstream origin (?<branchName>[^\s]+)/;`\n\n`terminalCommand: 'git push --set-upstream origin ${group:branchName}';`\n"),
                    type: 'object',
                    required: ['lineMatcher', 'anchor', 'offset', 'length'],
                    properties: {
                        lineMatcher: {
                            description: 'A regular expression or string to test the command line against',
                            type: 'string'
                        },
                        anchor: {
                            description: 'Where the search should begin in the buffer',
                            enum: ['top', 'bottom']
                        },
                        offset: {
                            description: 'The number of lines vertically from the anchor in the buffer to start matching against',
                            type: 'number'
                        },
                        length: {
                            description: 'The number of rows to match against, this should be as small as possible for performance reasons',
                            type: 'number'
                        }
                    }
                },
                commandExitResult: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.commandExitResult', "The command exit result to match on"),
                    enum: ['success', 'error'],
                    enumDescriptions: [
                        'The command exited with an exit code of zero.',
                        'The command exited with a non-zero exit code.'
                    ]
                },
                kind: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.kind', "The kind of the resulting quick fix. This changes how the quick fix is presented. Defaults to {0}.", '`"fix"`'),
                    enum: ['default', 'explain'],
                    enumDescriptions: [
                        'A high confidence quick fix.',
                        'An explanation of the problem.'
                    ]
                }
            },
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrRml4L2Jyb3dzZXIvdGVybWluYWxRdWlja0ZpeFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBR3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRTNGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBTW5DLElBQUksU0FBUyxLQUE2QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBV25GLFlBQ2MsV0FBeUM7UUFBeEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFmL0MsZUFBVSxHQUEwQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTlELGVBQVUsR0FBMkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUd0RCwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBcUMsQ0FBQztRQUNsRiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBQ2xELGtDQUE2QixHQUFHLElBQUksT0FBTyxFQUE0QixDQUFDO1FBQ2hGLGlDQUE0QixHQUFHLElBQUksQ0FBQyw2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