// Stub for expo-file-system so services/database.ts can load under Node.
// Records deletions so tests can assert on file-side effects.
export const deleted = [];
export const failOn = new Set();

export class File {
    constructor(...parts) {
        this.path = parts.map(p => (typeof p === 'string' ? p : p.path)).join('/');
    }
    get exists() { return true; }
    delete() {
        if (failOn.has(this.path)) throw new Error('simulated delete failure: ' + this.path);
        deleted.push(this.path);
    }
}
export class Directory {
    constructor(...parts) { this.path = parts.join('/'); }
    get exists() { return true; }
    create() {}
}
export const Paths = { document: 'DOC' };
