# Legacy Endpoint Audit (Step 0)

The following controller endpoints/functions are legacy and superseded by the unified `transition` endpoint.

| Legacy Endpoint (POST)         | Service Function | Replacement Action(s) via /congviec/:id/transition |
| ------------------------------ | ---------------- | -------------------------------------------------- |
| /congviec/:id/giao-viec        | giaoViec         | GIAO_VIEC                                          |
| /congviec/:id/tiep-nhan        | tiepNhan         | TIEP_NHAN                                          |
| /congviec/:id/hoan-thanh       | hoanThanh        | HOAN_THANH_TAM or HOAN_THANH (auto-normalized)     |
| /congviec/:id/duyet-hoan-thanh | duyetHoanThanh   | DUYET_HOAN_THANH                                   |

Planned removal: after FE no longer invokes these (target: post Step 4), they will be deleted.

Migration notes:

1. Permission logic now resides in `ROLE_REQUIREMENTS` (constants/workActions.constants.js).
2. Error codes: NOT_ASSIGNER, NOT_MAIN, FORBIDDEN.
3. HOAN_THANH when CoDuyetHoanThanh=true auto-normalizes to HOAN_THANH_TAM.

-- Generated automatically during Step 0 implementation.
