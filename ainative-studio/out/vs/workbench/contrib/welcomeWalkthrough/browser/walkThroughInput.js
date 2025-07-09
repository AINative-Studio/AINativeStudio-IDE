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
var WalkThroughInput_1;
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { markedGfmHeadingIdPlugin } from '../../markdown/browser/markedGfmHeadingIdPlugin.js';
import { moduleToContent } from '../common/walkThroughContentProvider.js';
class WalkThroughModel extends EditorModel {
    constructor(mainRef, snippetRefs) {
        super();
        this.mainRef = mainRef;
        this.snippetRefs = snippetRefs;
    }
    get main() {
        return this.mainRef;
    }
    get snippets() {
        return this.snippetRefs.map(snippet => snippet.object);
    }
    dispose() {
        this.snippetRefs.forEach(ref => ref.dispose());
        super.dispose();
    }
}
let WalkThroughInput = WalkThroughInput_1 = class WalkThroughInput extends EditorInput {
    get capabilities() {
        return 8 /* EditorInputCapabilities.Singleton */ | super.capabilities;
    }
    get resource() { return this.options.resource; }
    constructor(options, instantiationService, textModelResolverService) {
        super();
        this.options = options;
        this.instantiationService = instantiationService;
        this.textModelResolverService = textModelResolverService;
        this.promise = null;
        this.maxTopScroll = 0;
        this.maxBottomScroll = 0;
    }
    get typeId() {
        return this.options.typeId;
    }
    getName() {
        return this.options.name;
    }
    getDescription() {
        return this.options.description || '';
    }
    getTelemetryFrom() {
        return this.options.telemetryFrom;
    }
    getTelemetryDescriptor() {
        const descriptor = super.getTelemetryDescriptor();
        descriptor['target'] = this.getTelemetryFrom();
        /* __GDPR__FRAGMENT__
            "EditorTelemetryDescriptor" : {
                "target" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        return descriptor;
    }
    get onReady() {
        return this.options.onReady;
    }
    get layout() {
        return this.options.layout;
    }
    resolve() {
        if (!this.promise) {
            this.promise = moduleToContent(this.instantiationService, this.options.resource)
                .then(content => {
                if (this.resource.path.endsWith('.html')) {
                    return new WalkThroughModel(content, []);
                }
                const snippets = [];
                let i = 0;
                const renderer = new marked.marked.Renderer();
                renderer.code = ({ lang }) => {
                    i++;
                    const resource = this.options.resource.with({ scheme: Schemas.walkThroughSnippet, fragment: `${i}.${lang}` });
                    snippets.push(this.textModelResolverService.createModelReference(resource));
                    return `<div id="snippet-${resource.fragment}" class="walkThroughEditorContainer" ></div>`;
                };
                const m = new marked.Marked({ renderer }, markedGfmHeadingIdPlugin());
                content = m.parse(content, { async: false });
                return Promise.all(snippets)
                    .then(refs => new WalkThroughModel(content, refs));
            });
        }
        return this.promise;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof WalkThroughInput_1) {
            return isEqual(otherInput.options.resource, this.options.resource);
        }
        return false;
    }
    dispose() {
        if (this.promise) {
            this.promise.then(model => model.dispose());
            this.promise = null;
        }
        super.dispose();
    }
    relativeScrollPosition(topScroll, bottomScroll) {
        this.maxTopScroll = Math.max(this.maxTopScroll, topScroll);
        this.maxBottomScroll = Math.max(this.maxBottomScroll, bottomScroll);
    }
};
WalkThroughInput = WalkThroughInput_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITextModelService)
], WalkThroughInput);
export { WalkThroughInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lV2Fsa3Rocm91Z2gvYnJvd3Nlci93YWxrVGhyb3VnaElucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsT0FBTyxFQUFvQixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTFFLE1BQU0sZ0JBQWlCLFNBQVEsV0FBVztJQUV6QyxZQUNTLE9BQWUsRUFDZixXQUEyQztRQUVuRCxLQUFLLEVBQUUsQ0FBQztRQUhBLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixnQkFBVyxHQUFYLFdBQVcsQ0FBZ0M7SUFHcEQsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMs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