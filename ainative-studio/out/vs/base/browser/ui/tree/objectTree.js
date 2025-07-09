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
import { AbstractTree } from './abstractTree.js';
import { CompressibleObjectTreeModel } from './compressedObjectTreeModel.js';
import { ObjectTreeModel } from './objectTreeModel.js';
import { memoize } from '../../../common/decorators.js';
import { Iterable } from '../../../common/iterator.js';
export class ObjectTree extends AbstractTree {
    get onDidChangeCollapseState() { return this.model.onDidChangeCollapseState; }
    constructor(user, container, delegate, renderers, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
    }
    setChildren(element, children = Iterable.empty(), options) {
        this.model.setChildren(element, children, options);
    }
    rerender(element) {
        if (element === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(element);
    }
    updateElementHeight(element, height) {
        const elementIndex = this.model.getListIndex(element);
        if (elementIndex === -1) {
            return;
        }
        this.view.updateElementHeight(elementIndex, height);
    }
    resort(element, recursive = true) {
        this.model.resort(element, recursive);
    }
    hasElement(element) {
        return this.model.has(element);
    }
    createModel(user, options) {
        return new ObjectTreeModel(user, options);
    }
}
class CompressibleRenderer {
    get compressedTreeNodeProvider() {
        return this._compressedTreeNodeProvider();
    }
    constructor(_compressedTreeNodeProvider, stickyScrollDelegate, renderer) {
        this._compressedTreeNodeProvider = _compressedTreeNodeProvider;
        this.stickyScrollDelegate = stickyScrollDelegate;
        this.renderer = renderer;
        this.templateId = renderer.templateId;
        if (renderer.onDidChangeTwistieState) {
            this.onDidChangeTwistieState = renderer.onDidChangeTwistieState;
        }
    }
    renderTemplate(container) {
        const data = this.renderer.renderTemplate(container);
        return { compressedTreeNode: undefined, data };
    }
    renderElement(node, index, templateData, height) {
        let compressedTreeNode = this.stickyScrollDelegate.getCompressedNode(node);
        if (!compressedTreeNode) {
            compressedTreeNode = this.compressedTreeNodeProvider.getCompressedTreeNode(node.element);
        }
        if (compressedTreeNode.element.elements.length === 1) {
            templateData.compressedTreeNode = undefined;
            this.renderer.renderElement(node, index, templateData.data, height);
        }
        else {
            templateData.compressedTreeNode = compressedTreeNode;
            this.renderer.renderCompressedElements(compressedTreeNode, index, templateData.data, height);
        }
    }
    disposeElement(node, index, templateData, height) {
        if (templateData.compressedTreeNode) {
            this.renderer.disposeCompressedElements?.(templateData.compressedTreeNode, index, templateData.data, height);
        }
        else {
            this.renderer.disposeElement?.(node, index, templateData.data, height);
        }
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.data);
    }
    renderTwistie(element, twistieElement) {
        if (this.renderer.renderTwistie) {
            return this.renderer.renderTwistie(element, twistieElement);
        }
        return false;
    }
}
__decorate([
    memoize
], CompressibleRenderer.prototype, "compressedTreeNodeProvider", null);
class CompressibleStickyScrollDelegate {
    constructor(modelProvider) {
        this.modelProvider = modelProvider;
        this.compressedStickyNodes = new Map();
    }
    getCompressedNode(node) {
        return this.compressedStickyNodes.get(node);
    }
    constrainStickyScrollNodes(stickyNodes, stickyScrollMaxItemCount, maxWidgetHeight) {
        this.compressedStickyNodes.clear();
        if (stickyNodes.length === 0) {
            return [];
        }
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const stickyNodeBottom = stickyNode.position + stickyNode.height;
            const followingReachesMaxHeight = i + 1 < stickyNodes.length && stickyNodeBottom + stickyNodes[i + 1].height > maxWidgetHeight;
            if (followingReachesMaxHeight || i >= stickyScrollMaxItemCount - 1 && stickyScrollMaxItemCount < stickyNodes.length) {
                const uncompressedStickyNodes = stickyNodes.slice(0, i);
                const overflowingStickyNodes = stickyNodes.slice(i);
                const compressedStickyNode = this.compressStickyNodes(overflowingStickyNodes);
                return [...uncompressedStickyNodes, compressedStickyNode];
            }
        }
        return stickyNodes;
    }
    compressStickyNodes(stickyNodes) {
        if (stickyNodes.length === 0) {
            throw new Error('Can\'t compress empty sticky nodes');
        }
        const compressionModel = this.modelProvider();
        if (!compressionModel.isCompressionEnabled()) {
            return stickyNodes[0];
        }
        // Collect all elements to be compressed
        const elements = [];
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const compressedNode = compressionModel.getCompressedTreeNode(stickyNode.node.element);
            if (compressedNode.element) {
                // if an element is incompressible, it can't be compressed with it's parent element
                if (i !== 0 && compressedNode.element.incompressible) {
                    break;
                }
                elements.push(...compressedNode.element.elements);
            }
        }
        if (elements.length < 2) {
            return stickyNodes[0];
        }
        // Compress the elements
        const lastStickyNode = stickyNodes[stickyNodes.length - 1];
        const compressedElement = { elements, incompressible: false };
        const compressedNode = { ...lastStickyNode.node, children: [], element: compressedElement };
        const stickyTreeNode = new Proxy(stickyNodes[0].node, {});
        const compressedStickyNode = {
            node: stickyTreeNode,
            startIndex: stickyNodes[0].startIndex,
            endIndex: lastStickyNode.endIndex,
            position: stickyNodes[0].position,
            height: stickyNodes[0].height,
        };
        this.compressedStickyNodes.set(stickyTreeNode, compressedNode);
        return compressedStickyNode;
    }
}
function asObjectTreeOptions(compressedTreeNodeProvider, options) {
    return options && {
        ...options,
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            getKeyboardNavigationLabel(e) {
                let compressedTreeNode;
                try {
                    compressedTreeNode = compressedTreeNodeProvider().getCompressedTreeNode(e);
                }
                catch {
                    return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e);
                }
                if (compressedTreeNode.element.elements.length === 1) {
                    return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e);
                }
                else {
                    return options.keyboardNavigationLabelProvider.getCompressedNodeKeyboardNavigationLabel(compressedTreeNode.element.elements);
                }
            }
        }
    };
}
export class CompressibleObjectTree extends ObjectTree {
    constructor(user, container, delegate, renderers, options = {}) {
        const compressedTreeNodeProvider = () => this;
        const stickyScrollDelegate = new CompressibleStickyScrollDelegate(() => this.model);
        const compressibleRenderers = renderers.map(r => new CompressibleRenderer(compressedTreeNodeProvider, stickyScrollDelegate, r));
        super(user, container, delegate, compressibleRenderers, { ...asObjectTreeOptions(compressedTreeNodeProvider, options), stickyScrollDelegate });
    }
    setChildren(element, children = Iterable.empty(), options) {
        this.model.setChildren(element, children, options);
    }
    createModel(user, options) {
        return new CompressibleObjectTreeModel(user, options);
    }
    updateOptions(optionsUpdate = {}) {
        super.updateOptions(optionsUpdate);
        if (typeof optionsUpdate.compressionEnabled !== 'undefined') {
            this.model.setCompressionEnabled(optionsUpdate.compressionEnabled);
        }
    }
    getCompressedTreeNode(element = null) {
        return this.model.getCompressedTreeNode(element);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0VHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS9vYmplY3RUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQTZGLE1BQU0sbUJBQW1CLENBQUM7QUFDNUksT0FBTyxFQUFFLDJCQUEyQixFQUE4RCxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pJLE9BQU8sRUFBb0IsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQXlCdkQsTUFBTSxPQUFPLFVBQTJELFNBQVEsWUFBNkM7SUFJNUgsSUFBYSx3QkFBd0IsS0FBOEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUVoSixZQUNvQixJQUFZLEVBQy9CLFNBQXNCLEVBQ3RCLFFBQWlDLEVBQ2pDLFNBQStDLEVBQy9DLFVBQThDLEVBQUU7UUFFaEQsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFvRCxDQUFDLENBQUM7UUFOL0UsU0FBSSxHQUFKLElBQUksQ0FBUTtJQU9oQyxDQUFDO0lBRUQsV0FBVyxDQUFDLE9BQWlCLEVBQUUsV0FBNEMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQTBDO1FBQ3RJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxPQUFXO1FBQ25CLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsbUJBQW1CLENBQUMsT0FBVSxFQUFFLE1BQTBCO1FBQ3pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELElBQUksWUFBWSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQWlCLEVBQUUsU0FBUyxHQUFHLElBQUk7UUFDekMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFUyxXQUFXLENBQUMsSUFBWSxFQUFFLE9BQTJDO1FBQzlFLE9BQU8sSUFBSSxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FDRDtBQWdCRCxNQUFNLG9CQUFvQjtJQU16QixJQUFZLDBCQUEwQjtRQUNyQyxPQUFPLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRCxZQUFvQiwyQkFBOEUsRUFBVSxvQkFBc0UsRUFBVSxRQUFrRTtRQUExTyxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQW1EO1FBQVUseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFrRDtRQUFVLGFBQVEsR0FBUixRQUFRLENBQTBEO1FBQzdQLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUV0QyxJQUFJLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxRQUFRLENBQUMsdUJBQXVCLENBQUM7UUFDakUsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQStCLEVBQUUsS0FBYSxFQUFFLFlBQXFFLEVBQUUsTUFBMEI7UUFDOUosSUFBSSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQW1ELENBQUM7UUFDNUksQ0FBQztRQUVELElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEQsWUFBWSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztZQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckUsQ0FBQzthQUFNLENBQUM7WUFDUCxZQUFZLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7WUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RixDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBQyxJQUErQixFQUFFLEtBQWEsRUFBRSxZQUFxRSxFQUFFLE1BQTBCO1FBQy9KLElBQUksWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hFLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXFFO1FBQ3BGLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsYUFBYSxDQUFFLE9BQVUsRUFBRSxjQUEyQjtRQUNyRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBbERBO0lBREMsT0FBTztzRUFHUDtBQWtERixNQUFNLGdDQUFnQztJQUlyQyxZQUE2QixhQUFnRTtRQUFoRSxrQkFBYSxHQUFiLGFBQWEsQ0FBbUQ7UUFGNUUsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQTZFLENBQUM7SUFFN0IsQ0FBQztJQUVsRyxpQkFBaUIsQ0FBQyxJQUErQjtRQUNoRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELDBCQUEwQixDQUFDLFdBQStDLEVBQUUsd0JBQWdDLEVBQUUsZUFBdUI7UUFDcEksSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25DLElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUNqRSxNQUFNLHlCQUF5QixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUM7WUFFL0gsSUFBSSx5QkFBeUIsSUFBSSxDQUFDLElBQUksd0JBQXdCLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckgsTUFBTSx1QkFBdUIsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDeEQsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUM5RSxPQUFPLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQzNELENBQUM7UUFFRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFdBQStDO1FBRTFFLElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUM7WUFDOUMsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUVELHdDQUF3QztRQUN4QyxNQUFNLFFBQVEsR0FBUSxFQUFFLENBQUM7UUFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3QyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV2RixJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDNUIsbUZBQW1GO2dCQUNuRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdEQsTUFBTTtnQkFDUCxDQUFDO2dCQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ25ELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxpQkFBaUIsR0FBMkIsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ3RGLE1BQU0sY0FBYyxHQUFtRCxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxDQUFDO1FBRTVJLE1BQU0sY0FBYyxHQUFHLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFMUQsTUFBTSxvQkFBb0IsR0FBcUM7WUFDOUQsSUFBSSxFQUFFLGNBQWM7WUFDcEIsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO1lBQ3JDLFFBQVEsRUFBRSxjQUFjLENBQUMsUUFBUTtZQUNqQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7WUFDakMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO1NBQzdCLENBQUM7UUFFRixJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUUvRCxPQUFPLG9CQUFvQixDQUFDO0lBQzdCLENBQUM7Q0FDRDtBQVlELFNBQVMsbUJBQW1CLENBQWlCLDBCQUE2RSxFQUFFLE9BQXdEO0lBQ25MLE9BQU8sT0FBTyxJQUFJO1FBQ2pCLEdBQUcsT0FBTztRQUNWLCtCQUErQixFQUFFLE9BQU8sQ0FBQywrQkFBK0IsSUFBSTtZQUMzRSwwQkFBMEIsQ0FBQyxDQUFJO2dCQUM5QixJQUFJLGtCQUFrRSxDQUFDO2dCQUV2RSxJQUFJLENBQUM7b0JBQ0osa0JBQWtCLEdBQUcsMEJBQTBCLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQW1ELENBQUM7Z0JBQzlILENBQUM7Z0JBQUMsTUFBTSxDQUFDO29CQUNSLE9BQU8sT0FBTyxDQUFDLCtCQUFnQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxDQUFDO2dCQUVELElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3RELE9BQU8sT0FBTyxDQUFDLCtCQUFnQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxPQUFPLENBQUMsK0JBQWdDLENBQUMsd0NBQXdDLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMvSCxDQUFDO1lBQ0YsQ0FBQztTQUNEO0tBQ0QsQ0FBQztBQUNILENBQUM7QUFNRCxNQUFNLE9BQU8sc0JBQXVFLFNBQVEsVUFBMEI7SUFJckgsWUFDQyxJQUFZLEVBQ1osU0FBc0IsRUFDdEIsUUFBaUMsRUFDakMsU0FBMkQsRUFDM0QsVUFBMEQsRUFBRTtRQUU1RCxNQUFNLDBCQUEwQixHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztRQUM5QyxNQUFNLG9CQUFvQixHQUFHLElBQUksZ0NBQWdDLENBQWlCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwRyxNQUFNLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLG9CQUFvQixDQUFzQiwwQkFBMEIsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJKLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxFQUFFLEdBQUcsbUJBQW1CLENBQWlCLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztJQUNoSyxDQUFDO0lBRVEsV0FBVyxDQUFDLE9BQWlCLEVBQUUsV0FBZ0QsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQTBDO1FBQ25KLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVrQixXQUFXLENBQUMsSUFBWSxFQUFFLE9BQXVEO1FBQ25HLE9BQU8sSUFBSSwyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVRLGFBQWEsQ0FBQyxnQkFBc0QsRUFBRTtRQUM5RSxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRW5DLElBQUksT0FBTyxhQUFhLENBQUMsa0JBQWtCLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNwRSxDQUFDO0lBQ0YsQ0FBQztJQUVELHFCQUFxQixDQUFDLFVBQW9CLElBQUk7UUFDN0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FDRCJ9