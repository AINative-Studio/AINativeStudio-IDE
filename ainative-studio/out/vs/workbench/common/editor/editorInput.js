/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { EditorResourceAccessor, AbstractEditorInput, isEditorInput } from '../editor.js';
import { isEqual } from '../../../base/common/resources.js';
/**
 * Editor inputs are lightweight objects that can be passed to the workbench API to open inside the editor part.
 * Each editor input is mapped to an editor that is capable of opening it through the Platform facade.
 */
export class EditorInput extends AbstractEditorInput {
    constructor() {
        super(...arguments);
        this._onDidChangeDirty = this._register(new Emitter());
        this._onDidChangeLabel = this._register(new Emitter());
        this._onDidChangeCapabilities = this._register(new Emitter());
        this._onWillDispose = this._register(new Emitter());
        /**
         * Triggered when this input changes its dirty state.
         */
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        /**
         * Triggered when this input changes its label
         */
        this.onDidChangeLabel = this._onDidChangeLabel.event;
        /**
         * Triggered when this input changes its capabilities.
         */
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        /**
         * Triggered when this input is about to be disposed.
         */
        this.onWillDispose = this._onWillDispose.event;
    }
    /**
     * Identifies the type of editor this input represents
     * This ID is registered with the {@link EditorResolverService} to allow
     * for resolving an untyped input to a typed one
     */
    get editorId() {
        return undefined;
    }
    /**
     * The capabilities of the input.
     */
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */;
    }
    /**
     * Figure out if the input has the provided capability.
     */
    hasCapability(capability) {
        if (capability === 0 /* EditorInputCapabilities.None */) {
            return this.capabilities === 0 /* EditorInputCapabilities.None */;
        }
        return (this.capabilities & capability) !== 0;
    }
    isReadonly() {
        return this.hasCapability(2 /* EditorInputCapabilities.Readonly */);
    }
    /**
     * Returns the display name of this input.
     */
    getName() {
        return `Editor ${this.typeId}`;
    }
    /**
     * Returns the display description of this input.
     */
    getDescription(verbosity) {
        return undefined;
    }
    /**
     * Returns the display title of this input.
     */
    getTitle(verbosity) {
        return this.getName();
    }
    /**
     * Returns the extra classes to apply to the label of this input.
     */
    getLabelExtraClasses() {
        return [];
    }
    /**
     * Returns the aria label to be read out by a screen reader.
     */
    getAriaLabel() {
        return this.getTitle(0 /* Verbosity.SHORT */);
    }
    /**
     * Returns the icon which represents this editor input.
     * If undefined, the default icon will be used.
     */
    getIcon() {
        return undefined;
    }
    /**
     * Returns a descriptor suitable for telemetry events.
     *
     * Subclasses should extend if they can contribute.
     */
    getTelemetryDescriptor() {
        /* __GDPR__FRAGMENT__
            "EditorTelemetryDescriptor" : {
                "typeId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        return { typeId: this.typeId };
    }
    /**
     * Returns if this input is dirty or not.
     */
    isDirty() {
        return false;
    }
    /**
     * Returns if the input has unsaved changes.
     */
    isModified() {
        return this.isDirty();
    }
    /**
     * Returns if this input is currently being saved or soon to be
     * saved. Based on this assumption the editor may for example
     * decide to not signal the dirty state to the user assuming that
     * the save is scheduled to happen anyway.
     */
    isSaving() {
        return false;
    }
    /**
     * Returns a type of `IDisposable` that represents the resolved input.
     * Subclasses should override to provide a meaningful model or return
     * `null` if the editor does not require a model.
     *
     * The `options` parameter are passed down from the editor when the
     * input is resolved as part of it.
     */
    async resolve() {
        return null;
    }
    /**
     * Saves the editor. The provided groupId helps implementors
     * to e.g. preserve view state of the editor and re-open it
     * in the correct group after saving.
     *
     * @returns the resulting editor input (typically the same) of
     * this operation or `undefined` to indicate that the operation
     * failed or was canceled.
     */
    async save(group, options) {
        return this;
    }
    /**
     * Saves the editor to a different location. The provided `group`
     * helps implementors to e.g. preserve view state of the editor
     * and re-open it in the correct group after saving.
     *
     * @returns the resulting editor input (typically a different one)
     * of this operation or `undefined` to indicate that the operation
     * failed or was canceled.
     */
    async saveAs(group, options) {
        return this;
    }
    /**
     * Reverts this input from the provided group.
     */
    async revert(group, options) { }
    /**
     * Called to determine how to handle a resource that is renamed that matches
     * the editors resource (or is a child of).
     *
     * Implementors are free to not implement this method to signal no intent
     * to participate. If an editor is returned though, it will replace the
     * current one with that editor and optional options.
     */
    async rename(group, target) {
        return undefined;
    }
    /**
     * Returns a copy of the current editor input. Used when we can't just reuse the input
     */
    copy() {
        return this;
    }
    /**
     * Indicates if this editor can be moved to another group. By default
     * editors can freely be moved around groups. If an editor cannot be
     * moved, a message should be returned to show to the user.
     *
     * @returns `true` if the editor can be moved to the target group, or
     * a string with a message to show to the user if the editor cannot be
     * moved.
     */
    canMove(sourceGroup, targetGroup) {
        return true;
    }
    /**
     * Returns if the other object matches this input.
     */
    matches(otherInput) {
        // Typed inputs: via  === check
        if (isEditorInput(otherInput)) {
            return this === otherInput;
        }
        // Untyped inputs: go into properties
        const otherInputEditorId = otherInput.options?.override;
        // If the overrides are both defined and don't match that means they're separate inputs
        if (this.editorId !== otherInputEditorId && otherInputEditorId !== undefined && this.editorId !== undefined) {
            return false;
        }
        return isEqual(this.resource, EditorResourceAccessor.getCanonicalUri(otherInput));
    }
    /**
     * If a editor was registered onto multiple editor panes, this method
     * will be asked to return the preferred one to use.
     *
     * @param editorPanes a list of editor pane descriptors that are candidates
     * for the editor to open in.
     */
    prefersEditorPane(editorPanes) {
        return editorPanes.at(0);
    }
    /**
     * Returns a representation of this typed editor input as untyped
     * resource editor input that e.g. can be used to serialize the
     * editor input into a form that it can be restored.
     *
     * May return `undefined` if an untyped representation is not supported.
     */
    toUntyped(options) {
        return undefined;
    }
    /**
     * Returns if this editor is disposed.
     */
    isDisposed() {
        return this._store.isDisposed;
    }
    dispose() {
        if (!this.isDisposed()) {
            this._onWillDispose.fire();
        }
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXhELE9BQU8sRUFBdUosc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFxQixNQUFNLGNBQWMsQ0FBQztBQUNsUSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFnRDVEOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsV0FBWSxTQUFRLG1CQUFtQjtJQUE3RDs7UUFFb0Isc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDeEQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDeEQsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFFakUsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUV0RTs7V0FFRztRQUNNLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFFekQ7O1dBRUc7UUFDTSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBRXpEOztXQUVHO1FBQ00sNEJBQXVCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQztRQUV2RTs7V0FFRztRQUNNLGtCQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxL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