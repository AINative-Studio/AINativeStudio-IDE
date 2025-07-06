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
import { localize } from '../../../../../nls.js';
import { URI } from '../../../../../base/common/uri.js';
import { IWebContentExtractorService } from '../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { ITrustedDomainService } from '../../../url/browser/trustedDomainService.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { InternalFetchWebPageToolId } from '../../common/tools/tools.js';
export const FetchWebPageToolData = {
    id: InternalFetchWebPageToolId,
    displayName: 'Fetch Web Page',
    canBeReferencedInPrompt: false,
    modelDescription: localize('fetchWebPage.modelDescription', 'Fetches the main content from a web page. This tool is useful for summarizing or analyzing the content of a webpage.'),
    source: { type: 'internal' },
    inputSchema: {
        type: 'object',
        properties: {
            urls: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: localize('fetchWebPage.urlsDescription', 'An array of URLs to fetch content from.')
            }
        },
        required: ['urls']
    }
};
let FetchWebPageTool = class FetchWebPageTool {
    constructor(_readerModeService, _trustedDomainService) {
        this._readerModeService = _readerModeService;
        this._trustedDomainService = _trustedDomainService;
        this._alreadyApprovedDomains = new Set();
    }
    async invoke(invocation, _countTokens, _token) {
        const parsedUriResults = this._parseUris(invocation.parameters.urls);
        const validUris = Array.from(parsedUriResults.values()).filter((uri) => !!uri);
        if (!validUris.length) {
            return {
                content: [{ kind: 'text', value: localize('fetchWebPage.noValidUrls', 'No valid URLs provided.') }]
            };
        }
        // We approved these via confirmation, so mark them as "approved" in this session
        // if they are not approved via the trusted domain service.
        for (const uri of validUris) {
            if (!this._trustedDomainService.isValid(uri)) {
                this._alreadyApprovedDomains.add(uri.toString(true));
            }
        }
        const contents = await this._readerModeService.extract(validUris);
        // Make an array that contains either the content or undefined for invalid URLs
        const contentsWithUndefined = [];
        let indexInContents = 0;
        parsedUriResults.forEach((uri) => {
            if (uri) {
                contentsWithUndefined.push(contents[indexInContents]);
                indexInContents++;
            }
            else {
                contentsWithUndefined.push(undefined);
            }
        });
        return { content: this._getPromptPartsForResults(contentsWithUndefined) };
    }
    async prepareToolInvocation(parameters, token) {
        const map = this._parseUris(parameters.urls);
        const invalid = new Array();
        const valid = new Array();
        map.forEach((uri, url) => {
            if (!uri) {
                invalid.push(url);
            }
            else {
                valid.push(uri);
            }
        });
        const urlsNeedingConfirmation = valid.filter(url => !this._trustedDomainService.isValid(url) && !this._alreadyApprovedDomains.has(url.toString(true)));
        const pastTenseMessage = invalid.length
            ? invalid.length > 1
                // If there are multiple invalid URLs, show them all
                ? new MarkdownString(localize('fetchWebPage.pastTenseMessage.plural', 'Fetched {0} web pages, but the following were invalid URLs:\n\n{1}\n\n', valid.length, invalid.map(url => `- ${url}`).join('\n')))
                // If there is only one invalid URL, show it
                : new MarkdownString(localize('fetchWebPage.pastTenseMessage.singular', 'Fetched web page, but the following was an invalid URL:\n\n{0}\n\n', invalid[0]))
            // No invalid URLs
            : new MarkdownString();
        const invocationMessage = new MarkdownString();
        if (valid.length > 1) {
            pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.plural', 'Fetched {0} web pages', valid.length));
            invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.plural', 'Fetching {0} web pages', valid.length));
        }
        else {
            const url = valid[0].toString();
            // If the URL is too long, show it as a link... otherwise, show it as plain text
            if (url.length > 400) {
                pastTenseMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.pastTenseMessageResult.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetched [web page]({0})', url));
                invocationMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.invocationMessage.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetching [web page]({0})', url));
            }
            else {
                pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.singular', 'Fetched {0}', url));
                invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.singular', 'Fetching {0}', url));
            }
        }
        const result = { invocationMessage, pastTenseMessage };
        if (urlsNeedingConfirmation.length) {
            const confirmationTitle = urlsNeedingConfirmation.length > 1
                ? localize('fetchWebPage.confirmationTitle.plural', 'Fetch untrusted web pages?')
                : localize('fetchWebPage.confirmationTitle.singular', 'Fetch untrusted web page?');
            const managedTrustedDomainsCommand = 'workbench.action.manageTrustedDomain';
            const confirmationMessage = new MarkdownString(urlsNeedingConfirmation.length > 1
                ? urlsNeedingConfirmation.map(uri => `- ${uri.toString()}`).join('\n')
                : urlsNeedingConfirmation[0].toString(), {
                isTrusted: { enabledCommands: [managedTrustedDomainsCommand] },
                supportThemeIcons: true
            });
            confirmationMessage.appendMarkdown('\n\n$(info) ' + localize('fetchWebPage.confirmationMessageManageTrustedDomains', 'You can [manage your trusted domains]({0}) to skip this confirmation in the future.', `command:${managedTrustedDomainsCommand}`));
            result.confirmationMessages = { title: confirmationTitle, message: confirmationMessage, allowAutoConfirm: false };
        }
        return result;
    }
    _parseUris(urls) {
        const results = new Map();
        urls?.forEach(uri => {
            try {
                const uriObj = URI.parse(uri);
                results.set(uri, uriObj);
            }
            catch (e) {
                results.set(uri, undefined);
            }
        });
        return results;
    }
    _getPromptPartsForResults(results) {
        return results.map(value => ({
            kind: 'text',
            value: value || localize('fetchWebPage.invalidUrl', 'Invalid URL')
        }));
    }
};
FetchWebPageTool = __decorate([
    __param(0, IWebContentExtractorService),
    __param(1, ITrustedDomainService)
], FetchWebPageTool);
export { FetchWebPageTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvZWxlY3Ryb24tc2FuZGJveC90b29scy9mZXRjaFBhZ2VUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVqRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDeEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXpFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFjO0lBQzlDLEVBQUUsRUFBRSwwQkFBMEI7SUFDOUIsV0FBVyxFQUFFLGdCQUFnQjtJQUM3Qix1QkFBdUIsRUFBRSxLQUFLO0lBQzlCLGdCQUFnQixFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxzSEFBc0gsQ0FBQztJQUNuTCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO0lBQzVCLFdBQVcsRUFBRTtRQUNaLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsSUFBSSxFQUFFO2dCQUNMLElBQUksRUFBRSxPQUFPO2dCQUNiLEtBQUssRUFBRTtvQkFDTixJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHlDQUF5QyxDQUFDO2FBQ2hHO1NBQ0Q7UUFDRCxR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