import * as FileSystem from 'expo-file-system/legacy';
import { sanitizeFileName } from '../utils/files';

/**
 * Keeps a private copy of every document inside the app's own storage
 * (proposal risk: "File paths and permissions differ between platforms").
 * The database stores only the stored file NAME. iOS changes the app folder path
 * between launches/updates, so the full path is rebuilt every time it is needed.
 *
 * expo-file-system has two APIs: the newer File/Directory classes (SDK 54+) and the
 * older function API. This module hides both behind the same small interface.
 */

const SUBFOLDER = 'documents';
const IS_MODERN = Boolean(FileSystem.File && FileSystem.Directory && FileSystem.Paths);

export function makeStoredName(originalName) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}_${rand}_${sanitizeFileName(originalName)}`;
}

// ---------------------------------------------------------------- modern API
const modern = {
  dir() {
    const dir = new FileSystem.Directory(FileSystem.Paths.document, SUBFOLDER);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    return dir;
  },
  async importFile(sourceUri, storedName) {
    const dest = new FileSystem.File(this.dir(), storedName);
    new FileSystem.File(sourceUri).copy(dest);
    return { uri: dest.uri, size: dest.size ?? 0 };
  },
  uriFor(storedName) {
    return new FileSystem.File(this.dir(), storedName).uri;
  },
  async exists(storedName) {
    return new FileSystem.File(this.dir(), storedName).exists;
  },
  async remove(storedName) {
    const f = new FileSystem.File(this.dir(), storedName);
    if (f.exists) f.delete();
  },
  async download(url, storedName) {
    const dest = new FileSystem.File(this.dir(), storedName);
    if (dest.exists) dest.delete();
    const saved = await FileSystem.File.downloadFileAsync(url, dest);
    return { uri: saved.uri, size: saved.size ?? 0 };
  },
};

// ---------------------------------------------------------------- legacy API
const legacy = {
  dirUri() {
    return `${FileSystem.documentDirectory}${SUBFOLDER}/`;
  },
  async ensureDir() {
    const info = await FileSystem.getInfoAsync(this.dirUri());
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.dirUri(), { intermediates: true });
    }
  },
  async importFile(sourceUri, storedName) {
    await this.ensureDir();
    const to = this.dirUri() + storedName;
    await FileSystem.copyAsync({ from: sourceUri, to });
    const info = await FileSystem.getInfoAsync(to);
    return { uri: to, size: info.size ?? 0 };
  },
  uriFor(storedName) {
    return this.dirUri() + storedName;
  },
  async exists(storedName) {
    const info = await FileSystem.getInfoAsync(this.uriFor(storedName));
    return info.exists;
  },
  async remove(storedName) {
    await FileSystem.deleteAsync(this.uriFor(storedName), { idempotent: true });
  },
  async download(url, storedName) {
    await this.ensureDir();
    const to = this.uriFor(storedName);
    const res = await FileSystem.downloadAsync(url, to);
    const info = await FileSystem.getInfoAsync(res.uri);
    return { uri: res.uri, size: info.size ?? 0 };
  },
};

const impl = IS_MODERN ? modern : legacy;

/** Copy a picked file into app storage. Returns { uri, size }. */
export const importFile = (sourceUri, storedName) => impl.importFile(sourceUri, storedName);

/** Full, current URI for a stored file name ('' if there is none). */
export const uriFor = (storedName) => (storedName ? impl.uriFor(storedName) : '');

export const fileExists = (storedName) => (storedName ? impl.exists(storedName) : Promise.resolve(false));

export const removeFile = async (storedName) => {
  if (!storedName) return;
  try {
    await impl.remove(storedName);
  } catch (_) {
    // Deleting a missing file is not an error for us.
  }
};

export const downloadFile = (url, storedName) => impl.download(url, storedName);
