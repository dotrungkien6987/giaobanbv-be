// Work Management Action Constants & Role Requirements
// @stage Step1 constants extraction (unified between BE/FE)
// NOTE: Keep this list in sync with FE copy at
// fe-bcgiaobanbvt/src/features/QuanLyCongViec/CongViec/workActions.constants.js

const WORK_ACTIONS = Object.freeze({
  GIAO_VIEC: "GIAO_VIEC",
  HUY_GIAO: "HUY_GIAO",
  TIEP_NHAN: "TIEP_NHAN",
  HOAN_THANH_TAM: "HOAN_THANH_TAM",
  HUY_HOAN_THANH_TAM: "HUY_HOAN_THANH_TAM",
  DUYET_HOAN_THANH: "DUYET_HOAN_THANH",
  HOAN_THANH: "HOAN_THANH",
  MO_LAI_HOAN_THANH: "MO_LAI_HOAN_THANH",
});

// Roles (context booleans provided by service.transition): isAssigner, isMain
// Each entry returns true if the performer context is allowed.
// For HOAN_THANH the requirement (assigner) only applies in non-approval flow.
const ROLE_REQUIREMENTS = Object.freeze({
  [WORK_ACTIONS.GIAO_VIEC]: (ctx, cv) => ctx.isAssigner,
  [WORK_ACTIONS.HUY_GIAO]: (ctx, cv) => ctx.isAssigner,
  [WORK_ACTIONS.TIEP_NHAN]: (ctx, cv) => ctx.isMain,
  [WORK_ACTIONS.HOAN_THANH_TAM]: (ctx, cv) => ctx.isMain,
  [WORK_ACTIONS.HUY_HOAN_THANH_TAM]: (ctx, cv) => ctx.isMain || ctx.isAssigner,
  [WORK_ACTIONS.DUYET_HOAN_THANH]: (ctx, cv) => ctx.isAssigner,
  [WORK_ACTIONS.HOAN_THANH]: (ctx, cv) => !cv.CoDuyetHoanThanh && ctx.isMain,
  [WORK_ACTIONS.MO_LAI_HOAN_THANH]: (ctx, cv) => ctx.isAssigner,
});

module.exports = { WORK_ACTIONS, ROLE_REQUIREMENTS };
