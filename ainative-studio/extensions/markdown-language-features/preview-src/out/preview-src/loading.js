"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyleLoadingMonitor = void 0;
class StyleLoadingMonitor {
    constructor() {
        this._unloadedStyles = [];
        this._finishedLoading = false;
        const onStyleLoadError = (event) => {
            const source = event.target.dataset.source;
            this._unloadedStyles.push(source);
        };
        window.addEventListener('DOMContentLoaded', () => {
            for (const link of document.getElementsByClassName('code-user-style')) {
                if (link.dataset.source) {
                    link.onerror = onStyleLoadError;
                }
            }
        });
        window.addEventListener('load', () => {
            if (!this._unloadedStyles.length) {
                return;
            }
            this._finishedLoading = true;
            this._poster?.postMessage('previewStyleLoadError', { unloadedStyles: this._unloadedStyles });
        });
    }
    setPoster(poster) {
        this._poster = poster;
        if (this._finishedLoading) {
            poster.postMessage('previewStyleLoadError', { unloadedStyles: this._unloadedStyles });
        }
    }
}
exports.StyleLoadingMonitor = StyleLoadingMonitor;
//# sourceMappingURL=loading.js.map