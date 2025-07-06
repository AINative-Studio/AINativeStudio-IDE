"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeAttribute = escapeAttribute;
exports.getNonce = getNonce;
function escapeAttribute(value) {
    return value.toString()
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 64; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=dom.js.map