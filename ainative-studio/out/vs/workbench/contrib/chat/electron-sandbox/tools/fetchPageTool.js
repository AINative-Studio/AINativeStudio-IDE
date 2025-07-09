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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2VsZWN0cm9uLXNhbmRib3gvdG9vbHMvZmV0Y2hQYWdlVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV6RSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBYztJQUM5QyxFQUFFLEVBQUUsMEJBQTBCO0lBQzlCLFdBQVcsRUFBRSxnQkFBZ0I7SUFDN0IsdUJBQXVCLEVBQUUsS0FBSztJQUM5QixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsc0hBQXNILENBQUM7SUFDbkwsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtJQUM1QixXQUFXLEVBQUU7UUFDWixJQUFJLEVBQUUsUUFBUTtRQUNkLFVBQVUsRUFBRTtZQUNYLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsT0FBTztnQkFDYixLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx5Q0FBeUMsQ0FBQzthQUNoRztTQUNEO1FBQ0Qs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