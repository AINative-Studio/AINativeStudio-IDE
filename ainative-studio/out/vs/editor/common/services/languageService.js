/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { LanguagesRegistry } from './languagesRegistry.js';
import { TokenizationRegistry } from '../languages.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { observableFromEvent } from '../../../base/common/observable.js';
export class LanguageService extends Disposable {
    static { this.instanceCount = 0; }
    constructor(warnOnOverwrite = false) {
        super();
        this._onDidRequestBasicLanguageFeatures = this._register(new Emitter());
        this.onDidRequestBasicLanguageFeatures = this._onDidRequestBasicLanguageFeatures.event;
        this._onDidRequestRichLanguageFeatures = this._register(new Emitter());
        this.onDidRequestRichLanguageFeatures = this._onDidRequestRichLanguageFeatures.event;
        this._onDidChange = this._register(new Emitter({ leakWarningThreshold: 200 /* https://github.com/microsoft/vscode/issues/119968 */ }));
        this.onDidChange = this._onDidChange.event;
        this._requestedBasicLanguages = new Set();
        this._requestedRichLanguages = new Set();
        LanguageService.instanceCount++;
        this._registry = this._register(new LanguagesRegistry(true, warnOnOverwrite));
        this.languageIdCodec = this._registry.languageIdCodec;
        this._register(this._registry.onDidChange(() => this._onDidChange.fire()));
    }
    dispose() {
        LanguageService.instanceCount--;
        super.dispose();
    }
    registerLanguage(def) {
        return this._registry.registerLanguage(def);
    }
    isRegisteredLanguageId(languageId) {
        return this._registry.isRegisteredLanguageId(languageId);
    }
    getRegisteredLanguageIds() {
        return this._registry.getRegisteredLanguageIds();
    }
    getSortedRegisteredLanguageNames() {
        return this._registry.getSortedRegisteredLanguageNames();
    }
    getLanguageName(languageId) {
        return this._registry.getLanguageName(languageId);
    }
    getMimeType(languageId) {
        return this._registry.getMimeType(languageId);
    }
    getIcon(languageId) {
        return this._registry.getIcon(languageId);
    }
    getExtensions(languageId) {
        return this._registry.getExtensions(languageId);
    }
    getFilenames(languageId) {
        return this._registry.getFilenames(languageId);
    }
    getConfigurationFiles(languageId) {
        return this._registry.getConfigurationFiles(languageId);
    }
    getLanguageIdByLanguageName(languageName) {
        return this._registry.getLanguageIdByLanguageName(languageName);
    }
    getLanguageIdByMimeType(mimeType) {
        return this._registry.getLanguageIdByMimeType(mimeType);
    }
    guessLanguageIdByFilepathOrFirstLine(resource, firstLine) {
        const languageIds = this._registry.guessLanguageIdByFilepathOrFirstLine(resource, firstLine);
        return languageIds.at(0) ?? null;
    }
    createById(languageId) {
        return new LanguageSelection(this.onDidChange, () => {
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    createByMimeType(mimeType) {
        return new LanguageSelection(this.onDidChange, () => {
            const languageId = this.getLanguageIdByMimeType(mimeType);
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    createByFilepathOrFirstLine(resource, firstLine) {
        return new LanguageSelection(this.onDidChange, () => {
            const languageId = this.guessLanguageIdByFilepathOrFirstLine(resource, firstLine);
            return this._createAndGetLanguageIdentifier(languageId);
        });
    }
    _createAndGetLanguageIdentifier(languageId) {
        if (!languageId || !this.isRegisteredLanguageId(languageId)) {
            // Fall back to plain text if language is unknown
            languageId = PLAINTEXT_LANGUAGE_ID;
        }
        return languageId;
    }
    requestBasicLanguageFeatures(languageId) {
        if (!this._requestedBasicLanguages.has(languageId)) {
            this._requestedBasicLanguages.add(languageId);
            this._onDidRequestBasicLanguageFeatures.fire(languageId);
        }
    }
    requestRichLanguageFeatures(languageId) {
        if (!this._requestedRichLanguages.has(languageId)) {
            this._requestedRichLanguages.add(languageId);
            // Ensure basic features are requested
            this.requestBasicLanguageFeatures(languageId);
            // Ensure tokenizers are created
            TokenizationRegistry.getOrCreate(languageId);
            this._onDidRequestRichLanguageFeatures.fire(languageId);
        }
    }
}
class LanguageSelection {
    constructor(onDidChangeLanguages, selector) {
        this._value = observableFromEvent(this, onDidChangeLanguages, () => selector());
        this.onDidChange = Event.fromObservable(this._value);
    }
    get languageId() {
        return this._value.get();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTNELE9BQU8sRUFBb0Isb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV0RixNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO2FBR3ZDLGtCQUFhLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFpQnpCLFlBQVksZUFBZSxHQUFHLEtBQUs7UUFDbEMsS0FBSyxFQUFFLENBQUM7UUFoQlEsdUNBQWtDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFDNUUsc0NBQWlDLEdBQUcsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQztRQUVqRixzQ0FBaUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztRQUMzRSxxQ0FBZ0MsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDO1FBRTdFLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBTyxFQUFFLG9CQUFvQixFQUFF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