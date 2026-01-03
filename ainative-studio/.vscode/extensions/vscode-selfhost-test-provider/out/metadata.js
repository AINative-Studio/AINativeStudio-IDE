"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachTestMessageMetadata = attachTestMessageMetadata;
exports.getTestMessageMetadata = getTestMessageMetadata;
const cache = new Array();
let id = 0;
function getId() {
    return `msg:${id++}:`;
}
const regexp = /msg:\d+:/;
function attachTestMessageMetadata(message, metadata) {
    const existingMetadata = getTestMessageMetadata(message);
    if (existingMetadata) {
        Object.assign(existingMetadata, metadata);
        return;
    }
    const id = getId();
    if (typeof message.message === 'string') {
        message.message = `${message.message}\n${id}`;
    }
    else {
        message.message.appendText(`\n${id}`);
    }
    cache.push({ id, metadata });
    while (cache.length > 100) {
        cache.shift();
    }
}
function getTestMessageMetadata(message) {
    let value;
    if (typeof message.message === 'string') {
        value = message.message;
    }
    else {
        value = message.message.value;
    }
    const result = regexp.exec(value);
    if (!result) {
        return undefined;
    }
    const id = result[0];
    return cache.find(c => c.id === id)?.metadata;
}
//# sourceMappingURL=metadata.js.map