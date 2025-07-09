/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
export class CodeEditorContributions extends Disposable {
    constructor() {
        super();
        this._editor = null;
        this._instantiationService = null;
        /**
         * Contains all instantiated contributions.
         */
        this._instances = this._register(new DisposableMap());
        /**
         * Contains contributions which are not yet instantiated.
         */
        this._pending = new Map();
        /**
         * Tracks which instantiation kinds are still left in `_pending`.
         */
        this._finishedInstantiation = [];
        this._finishedInstantiation[0 /* EditorContributionInstantiation.Eager */] = false;
        this._finishedInstantiation[1 /* EditorContributionInstantiation.AfterFirstRender */] = false;
        this._finishedInstantiation[2 /* EditorContributionInstantiation.BeforeFirstInteraction */] = false;
        this._finishedInstantiation[3 /* EditorContributionInstantiation.Eventually */] = false;
    }
    initialize(editor, contributions, instantiationService) {
        this._editor = editor;
        this._instantiationService = instantiationService;
        for (const desc of contributions) {
            if (this._pending.has(desc.id)) {
                onUnexpectedError(new Error(`Cannot have two contributions with the same id ${desc.id}`));
                continue;
            }
            this._pending.set(desc.id, desc);
        }
        this._instantiateSome(0 /* EditorContributionInstantiation.Eager */);
        // AfterFirstRender
        // - these extensions will be instantiated at the latest 50ms after the first render.
        // - but if there is idle time, we will instantiate them sooner.
        this._register(runWhenWindowIdle(getWindow(this._editor.getDomNode()), () => {
            this._instantiateSome(1 /* EditorContributionInstantiation.AfterFirstRender */);
        }));
        // BeforeFirstInteraction
        // - these extensions will be instantiated at the latest before a mouse or a keyboard event.
        // - but if there is idle time, we will instantiate them sooner.
        this._register(runWhenWindowIdle(getWindow(this._editor.getDomNode()), () => {
            this._instantiateSome(2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
        }));
        // Eventually
        // - these extensions will only be instantiated when there is idle time.
        // - since there is no guarantee that there will ever be idle time, we set a timeout of 5s here.
        this._register(runWhenWindowIdle(getWindow(this._editor.getDomNode()), () => {
            this._instantiateSome(3 /* EditorContributionInstantiation.Eventually */);
        }, 5000));
    }
    saveViewState() {
        const contributionsState = {};
        for (const [id, contribution] of this._instances) {
            if (typeof contribution.saveViewState === 'function') {
                contributionsState[id] = contribution.saveViewState();
            }
        }
        return contributionsState;
    }
    restoreViewState(contributionsState) {
        for (const [id, contribution] of this._instances) {
            if (typeof contribution.restoreViewState === 'function') {
                contribution.restoreViewState(contributionsState[id]);
            }
        }
    }
    get(id) {
        this._instantiateById(id);
        return this._instances.get(id) || null;
    }
    /**
     * used by tests
     */
    set(id, value) {
        this._instances.set(id, value);
    }
    onBeforeInteractionEvent() {
        // this method is called very often by the editor!
        this._instantiateSome(2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
    }
    onAfterModelAttached() {
        return runWhenWindowIdle(getWindow(this._editor?.getDomNode()), () => {
            this._instantiateSome(1 /* EditorContributionInstantiation.AfterFirstRender */);
        }, 50);
    }
    _instantiateSome(instantiation) {
        if (this._finishedInstantiation[instantiation]) {
            // already done with this instantiation!
            return;
        }
        this._finishedInstantiation[instantiation] = true;
        const contribs = this._findPendingContributionsByInstantiation(instantiation);
        for (const contrib of contribs) {
            this._instantiateById(contrib.id);
        }
    }
    _findPendingContributionsByInstantiation(instantiation) {
        const result = [];
        for (const [, desc] of this._pending) {
            if (desc.instantiation === instantiation) {
                result.push(desc);
            }
        }
        return result;
    }
    _instantiateById(id) {
        const desc = this._pending.get(id);
        if (!desc) {
            return;
        }
        this._pending.delete(id);
        if (!this._instantiationService || !this._editor) {
            throw new Error(`Cannot instantiate contributions before being initialized!`);
        }
        try {
            const instance = this._instantiationService.createInstance(desc.ctor, this._editor);
            this._instances.set(desc.id, instance);
            if (typeof instance.restoreViewState === 'function' && desc.instantiation !== 0 /* EditorContributionInstantiation.Eager */) {
                console.warn(`Editor contribution '${desc.id}' should be eager instantiated because it uses saveViewState / restoreViewState.`);
            }
        }
        catch (err) {
            onUnexpectedError(err);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvckNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2NvZGVFZGl0b3IvY29kZUVkaXRvckNvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFNOUYsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFrQnREO1FBR0MsS0FBSyxFQUFFLENBQUM7UUFuQkQsWUFBTyxHQUF1QixJQUFJLENBQUM7UUFDbkMsMEJBQXFCLEdBQWlDLElBQUksQ0FBQztRQUVuRTs7V0FFRztRQUNjLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUErQixDQUFDLENBQUM7UUFDL0Y7O1dBRUc7UUFDYyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTBDLENBQUM7UUFDOUU7O1dBRUc7UUFDYywyQkFBc0IsR0FBYyxFQUFFLENBQUM7UUFPdkQsSUFBSSxDQUFDLHNCQUFzQiwrQ0FBdUMsR0FBRyxLQUFLLENBQUM7UUFDM0UsSUFBSSxDQUFDLHNCQUFzQiwwREFBa0QsR0FBRyxLQUFLLENBQUM7UUFDdEYsSUFBSSxDQUFDLHNCQUFzQixnRUFBd0QsR0FBRyxLQUFLLENBQUM7UUFDNUYsSUFBSSxDQUFDLHNCQUFzQixvREFBNEMsR0FBRyxLQUFLLENBQUM7SUFDakYsQ0FBQztJQUVNLFVBQVUsQ0FBQyxNQUFtQixFQUFFLGFBQStDLEVBQUUs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