/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { joinPath } from '../../../../base/common/resources.js';
class DependencyList {
    constructor(value) {
        this.value = new Set(value);
        this.defined = this.value.size > 0;
    }
    /** Gets whether any of the 'available' dependencies match the ones in this list */
    matches(available) {
        // For now this is simple, but this may expand to support globs later
        // @see https://github.com/microsoft/vscode/issues/119899
        return available.some(v => this.value.has(v));
    }
}
export class NotebookOutputRendererInfo {
    constructor(descriptor) {
        this.id = descriptor.id;
        this.extensionId = descriptor.extension.identifier;
        this.extensionLocation = descriptor.extension.extensionLocation;
        this.isBuiltin = descriptor.extension.isBuiltin;
        if (typeof descriptor.entrypoint === 'string') {
            this.entrypoint = {
                extends: undefined,
                path: joinPath(this.extensionLocation, descriptor.entrypoint)
            };
        }
        else {
            this.entrypoint = {
                extends: descriptor.entrypoint.extends,
                path: joinPath(this.extensionLocation, descriptor.entrypoint.path)
            };
        }
        this.displayName = descriptor.displayName;
        this.mimeTypes = descriptor.mimeTypes;
        this.mimeTypeGlobs = this.mimeTypes.map(pattern => glob.parse(pattern));
        this.hardDependencies = new DependencyList(descriptor.dependencies ?? Iterable.empty());
        this.optionalDependencies = new DependencyList(descriptor.optionalDependencies ?? Iterable.empty());
        this.messaging = descriptor.requiresMessaging ?? "never" /* RendererMessagingSpec.Never */;
    }
    matchesWithoutKernel(mimeType) {
        if (!this.matchesMimeTypeOnly(mimeType)) {
            return 3 /* NotebookRendererMatch.Never */;
        }
        if (this.hardDependencies.defined) {
            return 0 /* NotebookRendererMatch.WithHardKernelDependency */;
        }
        if (this.optionalDependencies.defined) {
            return 1 /* NotebookRendererMatch.WithOptionalKernelDependency */;
        }
        return 2 /* NotebookRendererMatch.Pure */;
    }
    matches(mimeType, kernelProvides) {
        if (!this.matchesMimeTypeOnly(mimeType)) {
            return 3 /* NotebookRendererMatch.Never */;
        }
        if (this.hardDependencies.defined) {
            return this.hardDependencies.matches(kernelProvides)
                ? 0 /* NotebookRendererMatch.WithHardKernelDependency */
                : 3 /* NotebookRendererMatch.Never */;
        }
        return this.optionalDependencies.matches(kernelProvides)
            ? 1 /* NotebookRendererMatch.WithOptionalKernelDependency */
            : 2 /* NotebookRendererMatch.Pure */;
    }
    matchesMimeTypeOnly(mimeType) {
        if (this.entrypoint.extends) { // We're extending another renderer
            return false;
        }
        return this.mimeTypeGlobs.some(pattern => pattern(mimeType)) || this.mimeTypes.some(pattern => pattern === mimeType);
    }
}
export class NotebookStaticPreloadInfo {
    constructor(descriptor) {
        this.type = descriptor.type;
        this.entrypoint = joinPath(descriptor.extension.extensionLocation, descriptor.entrypoint);
        this.extensionLocation = descriptor.extension.extensionLocation;
        this.localResourceRoots = descriptor.localResourceRoots.map(root => joinPath(descriptor.extension.extensionLocation, root));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRwdXRSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tPdXRwdXRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFLaEUsTUFBTSxjQUFjO0lBSW5CLFlBQVksS0FBdUI7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsbUZBQW1GO0lBQzVFLE9BQU8sQ0FBQyxTQUFnQztRQUM5QyxxRUFBcUU7UUFDckUseURBQXlEO1FBQ3pELE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQWdCdEMsWUFBWSxVQVNYO1FBQ0EsSUFBSSxDQUFDLEVBQUUsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsaUJB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