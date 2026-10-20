// Stub for native-only modules (react-native, expo-sharing, expo-application,
// expo-sqlite/kv-store, react-native-zip-archive) so services/backup.ts can
// load under Node. Only the names backup.ts imports are provided; none do
// anything, and tests must not reach them.
const notUnderNode = (name) => () => { throw new Error(`${name} is not available under Node`); };

export const Platform = { OS: 'ios' };
export const openDatabaseAsync = notUnderNode('openDatabaseAsync');
export const listContents = notUnderNode('listContents');
export const unzip = notUnderNode('unzip');
export const zip = notUnderNode('zip');
export const shareAsync = notUnderNode('shareAsync');
export const nativeApplicationVersion = '0.0.0';

const Storage = {
    getItem: notUnderNode('Storage.getItem'),
    setItem: notUnderNode('Storage.setItem'),
    removeItem: notUnderNode('Storage.removeItem'),
};
export default Storage;
