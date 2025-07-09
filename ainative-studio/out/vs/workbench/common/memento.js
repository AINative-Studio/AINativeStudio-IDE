/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyObject } from '../../base/common/types.js';
import { onUnexpectedError } from '../../base/common/errors.js';
export class Memento {
    static { this.applicationMementos = new Map(); }
    static { this.profileMementos = new Map(); }
    static { this.workspaceMementos = new Map(); }
    static { this.COMMON_PREFIX = 'memento/'; }
    constructor(id, storageService) {
        this.storageService = storageService;
        this.id = Memento.COMMON_PREFIX + id;
    }
    getMemento(scope, target) {
        switch (scope) {
            case 1 /* StorageScope.WORKSPACE */: {
                let workspaceMemento = Memento.workspaceMementos.get(this.id);
                if (!workspaceMemento) {
                    workspaceMemento = new ScopedMemento(this.id, scope, target, this.storageService);
                    Memento.workspaceMementos.set(this.id, workspaceMemento);
                }
                return workspaceMemento.getMemento();
            }
            case 0 /* StorageScope.PROFILE */: {
                let profileMemento = Memento.profileMementos.get(this.id);
                if (!profileMemento) {
                    profileMemento = new ScopedMemento(this.id, scope, target, this.storageService);
                    Memento.profileMementos.set(this.id, profileMemento);
                }
                return profileMemento.getMemento();
            }
            case -1 /* StorageScope.APPLICATION */: {
                let applicationMemento = Memento.applicationMementos.get(this.id);
                if (!applicationMemento) {
                    applicationMemento = new ScopedMemento(this.id, scope, target, this.storageService);
                    Memento.applicationMementos.set(this.id, applicationMemento);
                }
                return applicationMemento.getMemento();
            }
        }
    }
    onDidChangeValue(scope, disposables) {
        return this.storageService.onDidChangeValue(scope, this.id, disposables);
    }
    saveMemento() {
        Memento.workspaceMementos.get(this.id)?.save();
        Memento.profileMementos.get(this.id)?.save();
        Memento.applicationMementos.get(this.id)?.save();
    }
    reloadMemento(scope) {
        let memento;
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                memento = Memento.applicationMementos.get(this.id);
                break;
            case 0 /* StorageScope.PROFILE */:
                memento = Memento.profileMementos.get(this.id);
                break;
            case 1 /* StorageScope.WORKSPACE */:
                memento = Memento.workspaceMementos.get(this.id);
                break;
        }
        memento?.reload();
    }
    static clear(scope) {
        switch (scope) {
            case 1 /* StorageScope.WORKSPACE */:
                Memento.workspaceMementos.clear();
                break;
            case 0 /* StorageScope.PROFILE */:
                Memento.profileMementos.clear();
                break;
            case -1 /* StorageScope.APPLICATION */:
                Memento.applicationMementos.clear();
                break;
        }
    }
}
class ScopedMemento {
    constructor(id, scope, target, storageService) {
        this.id = id;
        this.scope = scope;
        this.target = target;
        this.storageService = storageService;
        this.mementoObj = this.doLoad();
    }
    doLoad() {
        try {
            return this.storageService.getObject(this.id, this.scope, {});
        }
        catch (error) {
            // Seeing reports from users unable to open editors
            // from memento parsing exceptions. Log the contents
            // to diagnose further
            // https://github.com/microsoft/vscode/issues/102251
            onUnexpectedError(`[memento]: failed to parse contents: ${error} (id: ${this.id}, scope: ${this.scope}, contents: ${this.storageService.get(this.id, this.scope)})`);
        }
        return {};
    }
    getMemento() {
        return this.mementoObj;
    }
    reload() {
        // Clear old
        for (const name of Object.getOwnPropertyNames(this.mementoObj)) {
            delete this.mementoObj[name];
        }
        // Assign new
        Object.assign(this.mementoObj, this.doLoad());
    }
    save() {
        if (!isEmptyObject(this.mementoObj)) {
            this.storageService.store(this.id, this.mementoObj, this.scope, this.target);
        }
        else {
            this.storageService.remove(this.id, this.scope);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtZW50by5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL21lbWVudG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBTWhFLE1BQU0sT0FBTyxPQUFPO2FBRUssd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7YUFDdkQsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQzthQUNuRCxzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQzthQUVyRCxrQkFBYSxHQUFHLFVBQVUsQ0FBQztJQUluRCxZQUFZLEVBQVUsRUFBVSxjQUErQjtRQUEvQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDOUQsSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQW1CLEVBQUUsTUFBcUI7UUFDcEQsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLG1DQUEyQixDQUFDLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ3ZCLGdCQUFnQixHQUFHLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ2xGLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFH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QUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsYUFBYTtRQUNiLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakQsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9