# File Attachments — Upload / Download / View / Delete Flow

Purpose

- Document end-to-end flows for file handling in the project: uploads, validation, storage, streaming (view/download), thumbnails, soft-delete and permissions.
- Provide implementers and reviewers a single reference for routes, middleware, services, models, and recommended hardening.

Scope

- Covers both the newer `modules/workmanagement` flow (preferred) and legacy `routes/file.api.js` + `controllers/file.controller.js` behavior.

Actors

- Client (browser / mobile / API consumer)
- Authentication middleware (loginRequired)
- Upload middleware (Multer + verifyMagicAndTotalSize)
- File controller (module or legacy)
- File service (business logic, storage interface)
- Storage backend (local filesystem or remote like S3)
- Validation service (MIME, magic bytes, antivirus)
- Database models (TepTin or FileAttachment)

Key files and locations (repo references)

- New module (preferred):
  - routes: `modules/workmanagement/routes/files.api.js`
  - middleware: `modules/workmanagement/middlewares/upload.middleware.js`
  - controllers: `modules/workmanagement/controllers/file.controller.js`
  - services: `modules/workmanagement/services/file.service.js`
  - models: `modules/workmanagement/models/TepTin.js`
  - helpers/permissions: `modules/workmanagement/helpers/filePermissions.js`
- Legacy endpoints:
  - route: `routes/file.api.js`
  - controller: `controllers/file.controller.js`
- Design & guidelines: `Instructions/09_File_Attachments_Management.md`

High-level flows

1. Upload file(s) attached to a Task (single or multi-files)

- Endpoint: POST /api/workmanagement/congviec/:congViecId/files (or legacy POST route)
- Steps:
  1. Client sends authenticated request (Bearer cookie/session). Include form-data field `files`.
  2. `authentication.loginRequired` validates user session.
  3. Multer (configured in upload.middleware) writes files to disk (or memory) into a directory structure (e.g. `uploads/{congViecId}/{yyyy}/{mm}`) using safe filenames.
  4. After multer writes, `verifyMagicAndTotalSize` checks:
     - Total request size limit
     - Individual file size limit
     - Magic bytes using `file-type` to confirm claimed MIME
     - (Optional) Calls antivirus scanner
  5. Controller receives validated file metadata and calls `fileService.uploadForTask(...)`.
  6. `fileService.uploadForTask`:
     - `assertAccess(user, congViecId)` checks whether user can add files to the task.
     - If a separate StorageService is used, validation -> StorageService.uploadFile(file) is called; otherwise keep local path.
     - Create DB record (TepTin / FileAttachment) with: originalName, storedName, mimeType, size, path/URL, uploaderId, taskId, commentId (optional), createdAt.
     - Create thumbnail (for images) using Sharp (if configured).
     - Return DTO with inlineUrl and downloadUrl (signed or direct depending on storage).
  7. Controller returns JSON with saved file DTO(s).

2. Upload file(s) as part of a Comment

- Endpoint: POST /api/workmanagement/congviec/:congViecId/comments
- Similar to upload-for-task but controller first creates the Comment, then associates TepTin records to the created comment.

3. Download or View (inline)

- Endpoints: GET /api/workmanagement/files/:id/download and GET /api/workmanagement/files/:id/inline
- Steps:
  1. Controller calls `fileService.getById(id)` and `assertAccess(user, file)`.
  2. If stored locally: respond with `fs.createReadStream(file.path)`.
     - For inline view: set `Content-Disposition: inline; filename="OriginalName.ext"` and set `Content-Type` to file.mimeType.
     - For download: set `Content-Disposition: attachment; filename="OriginalName.ext"`.
  3. If stored remotely (S3): use StorageService.getStream or pre-signed URL and proxy or redirect accordingly.
  4. Optionally increase download/view counter and write an access log entry.

4. Delete (soft) and purge

- API: DELETE /api/workmanagement/files/:id
- Flow:
  1. `assertAccess(user, file)` -> verify delete permission (owner, admin, or task-manager policy).
  2. Perform soft-delete by updating `TrangThai` (DELETED), `deletedBy`, `deletedAt` fields in DB.
  3. Optionally schedule background job to permanently remove file from storage after retention window.
  4. Cascade: when a task is soft-deleted, service should soft-delete related TepTin records.

Permission checks

- Use `modules/workmanagement/helpers/filePermissions.js`:
  - `canAccessCongViec(user, congViec)` — read/view rights
  - `canUploadToCongViec(user, congViec)` — upload right
  - `canDeleteFile(user, file)` — delete right
- `service.assertAccess` wraps permission checks and throws AppError (403) when denied.

Validation and Security

- Validate:
  - File size (per-file and total request)
  - File type: check both reported MIME and magic bytes (via `file-type`)
  - Filename sanitization (no path traversal)
- Security:
  - Antivirus scan (ClamAV or hosted scanner) as step after multer and before DB write.
  - Serve files via controlled endpoints (not direct public disk URLs) to enforce auth.
  - For large files or public consumption, use signed URLs (S3) with short TTL.
  - Limit accepted file extensions and types per business needs.
  - Rate-limit upload endpoints to prevent abuse.

Storage options & considerations

- Local disk (current default): file path stored in DB, served with fs.createReadStream.
  - Pros: simple
  - Cons: scaling, backup, CDN integration
- S3-compatible/object storage
  - Use StorageService abstraction: `uploadFile(buffer|stream) -> { url, key, size, mime }` and `getStream(key)`.
  - Prefer pre-signed URLs for downloads to offload bandwidth and simplify CDN.

Thumbnails / image processing

- Create thumbnails on upload for images using `sharp` and store as separate TepTin record or as derivative file with naming convention (e.g. `${key}--thumb.jpg`).
- Serve thumbnail via `/files/:id/thumbnail` or include thumbnailUrl in DTO.

Error modes and edge cases

- Partial failures: some files uploaded, others failed — return 207 Multi-Status or explicit per-file error details.
- Corrupt file: magic bytes mismatch -> reject and delete tmp file.
- Disk full / storage failure: ensure multer temp cleanup and meaningful 5xx return.
- Concurrent deletes & downloads: check file existence at stream time and handle 404 vs 410 for permanently deleted.

Observability & auditing

- Log upload/download actions with: userId, fileId, action, IP, timestamp, size.
- Maintain metrics: uploads/day, bytes stored, downloads/day.

API surface (suggested concise list)

- POST /api/workmanagement/congviec/:congViecId/files — upload files for a task
- POST /api/workmanagement/congviec/:congViecId/comments — create comment with files
- GET /api/workmanagement/files/:id/inline — view inline
- GET /api/workmanagement/files/:id/download — download
- DELETE /api/workmanagement/files/:id — soft-delete
- GET /api/workmanagement/files/:id/thumbnail — optional thumbnail endpoint

Database model (summary for TepTin / FileAttachment)

- id
- originalName
- storedName / key
- mimeType
- size
- path or storageKey
- uploaderId
- congViecId
- binhLuanId (nullable)
- createdAt, updatedAt
- trangThai (ACTIVE / DELETED)

Implementer checklist

- [ ] Ensure `uploads/` is in `.gitignore` (done)
- [ ] Verify multer config limits match business rules
- [ ] Use `file-type` to check magic bytes
- [ ] Integrate antivirus scan step
- [ ] Wrap storage with StorageService abstraction
- [ ] Add thumbnail creation for images
- [ ] Add logging/audit for upload/download/delete
- [ ] Implement background purge for permanently deleting files
- [ ] Add tests: upload happy path, invalid MIME, large file, unauthorized access

Recommended improvements (low-to-medium effort)

- Switch to signed URLs (S3) for public downloads.
- Add chunked uploads and resume for >100MB files.
- Add streaming range support for large media files.
- Add unit + integration tests for service and controller layers.

References

- `Instructions/09_File_Attachments_Management.md` — design doc with models and services.
- `modules/workmanagement/...` — actual implementation files described above.

Diagram suggestion

- Create a sequence diagram for the Upload flow (Client -> Auth -> Multer -> Validator -> Service -> Storage -> DB -> Response).

Notes / Next steps I can do for you

- Generate sequence diagram (text or image) for any specific flow.
- Search repo and list exact locations where `uploads/` is referenced.
- Add unit tests for `file.service.uploadForTask` and for `verifyMagicAndTotalSize`.

---

Document created: Instructions/10_File_Attachments_Flow.md
