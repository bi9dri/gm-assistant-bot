# FileSystem Architecture

## Overview

`FileSystem` class (`frontend/src/fileSystem.ts`) is an abstraction over the browser's **OPFS (Origin Private File System)**. It is used to persist node attachment files in browser-private storage without uploading to a server.

---

## Directory Layout

```
(OPFS root)
├── template/
│   └── {templateId}/
│       ├── filename.png
│       └── {random8hex}/filename.png   ← collision avoidance for duplicate names
└── session/
    └── {sessionId}/
        ├── filename.png
        └── {random8hex}/filename.png
```

- Files added during template editing go under `template/{templateId}/`
- On session creation, `template/{templateId}/` is copied to `session/{sessionId}/`
- Files added during session execution go under `session/{sessionId}/`

---

## Constructor

```ts
const fs = new FileSystem();
```

Throws if `navigator.storage.getDirectory` is unavailable (OPFS not supported). Always guard with try-catch when calling from non-UI code paths (e.g., hooks that may run in unsupported environments).

```ts
try {
  const fs = new FileSystem();
} catch {
  return;
}
```

---

## Public API

| Method | Description |
|--------|-------------|
| `writeFile(path, data)` | Write `Blob` or `string` to path. Intermediate directories are created automatically. |
| `readFile(path)` | Returns `File`. Throws if path does not exist. |
| `deleteFile(path)` | Removes file. Throws if not found. |
| `fileExists(path)` | Returns `true`/`false`. Never throws. |
| `clearTemplateFiles(templateId)` | Recursively removes `template/{templateId}/`. No-op if directory missing. |
| `clearSessionFiles(sessionId)` | Recursively removes `session/{sessionId}/`. No-op if directory missing. |
| `copyTemplateFilesToSession(templateId, sessionId)` | Deep-copies template files to session directory. No-op if template has no files. |
| `exportTemplate(templateId)` | Bundles template JSON + OPFS files into a ZIP `Blob`. |
| `importTemplate(zipFile)` | Restores a template from a ZIP file. |

---

## File Path Generation

Use `saveFileToOPFS()` helper (`frontend/src/components/Node/utils/messageSchema.ts`) to generate paths. Never construct paths manually.

```ts
const filePath = await saveFileToOPFS(file, { templateId });
// → "template/1/image.png"
// If "template/1/image.png" already exists:
// → "template/1/a3f2c1b4/image.png"
```

- `sessionId` takes precedence over `templateId` when both are provided.
- Duplicate filenames get a random 8-hex subdirectory prefix.

The `Attachment` schema stored in nodes and IndexedDB:

```ts
const AttachmentSchema = z.object({
  fileName: z.string(),   // display name
  filePath: z.string(),   // OPFS path — persisted in store and DB
  fileSize: z.number(),   // bytes
});
```

---

## File Lifecycle

```
Template editing
  └─ saveFileToOPFS({ templateId })
       → writes to template/{id}/file.png
       → Attachment.filePath stored in Zustand → persisted to IndexedDB

Session creation (CreateSession.tsx)
  └─ copyTemplateFilesToSession(templateId, sessionId)
       → deep-copies template/{id}/ → session/{newId}/
  └─ convertFilePaths()
       → rewrites all filePath strings: "template/1/" → "session/2/"
       → updated in IndexedDB

Session execution — new file added
  └─ saveFileToOPFS({ sessionId })
       → writes to session/{id}/file.png

Template deleted
  └─ clearTemplateFiles(templateId)

Session deleted
  └─ clearSessionFiles(sessionId)
```

---

## Nodes That Hold File References

Only two node types reference file paths:

| Node | filePath location |
|------|-------------------|
| `SendMessageNode` | `data.messages[].attachments[].filePath` |
| `CombinationSendMessageNode` | `data.entries[].messages[].attachments[].filePath` |

---

## Known Pitfalls

### Call `getDirectoryHandle` one segment at a time

Some browsers (e.g. Safari) throw `NotAllowedError` when resolving a deep path in one call. `FileSystem` internally walks segments one by one. Follow the same pattern if you ever access OPFS directly.

```ts
// Good: walk one segment at a time (as FileSystem does internally)
let dir = await navigator.storage.getDirectory();
for (const seg of segments.slice(0, -1)) {
  dir = await dir.getDirectoryHandle(seg, { create: true });
}
```

### Missing files at runtime

OPFS files can disappear due to import bugs or browser storage clears while the IndexedDB record still holds the `filePath`. Use `fileExists()` for pre-flight checks. `useFileExistenceValidation` hook (`frontend/src/hooks/useFileExistenceValidation.ts`) runs this check once when the workflow view initializes and highlights affected nodes.

---

## Testing

Mock `navigator.storage.getDirectory` with an in-memory `MockFileSystemStorage`. See `frontend/src/fileSystem.test.ts` for the full mock implementation.

```ts
Object.defineProperty(globalThis, "navigator", {
  value: { storage: { getDirectory: mock(async () => createMockDirectoryHandle("")) } },
  writable: true,
  configurable: true,
});
```

`exportTemplate` / `importTemplate` are not unit-tested (complex OPFS tree walk) — covered by e2e tests.

---

## Related Files

| File | Role |
|------|------|
| `frontend/src/fileSystem.ts` | `FileSystem` class |
| `frontend/src/fileSystem.test.ts` | Unit tests |
| `frontend/src/components/Node/utils/messageSchema.ts` | `saveFileToOPFS` helper, `Attachment` schema |
| `frontend/src/hooks/useFileExistenceValidation.ts` | Validates file existence on view mount |
| `frontend/src/components/CreateSession.tsx` | Copies files on session creation |
| `frontend/src/components/TemplateCard.tsx` | Template delete / export |
| `frontend/src/components/SessionCard.tsx` | Session delete |
