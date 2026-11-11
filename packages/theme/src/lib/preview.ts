// Editor markers (roadmap 16.2): in previews only (a draft branch's build, or `astro dev` in Craeft's
// live preview), each block and element says what it is, so Craeft's editor can select it on the
// page. Production builds (the prod-main branch, or a build on a computer) never carry them.
const branch = process.env.WORKERS_CI_BRANCH;
export const editorMarkers = branch ? branch !== "prod-main" : import.meta.env.DEV;

/** `data-craeft-*` attributes, or none in production. */
export const mark = (attrs: Record<string, string | number>): Record<string, string | number> =>
  editorMarkers ? Object.fromEntries(Object.entries(attrs).map(([k, v]) => [`data-craeft-${k}`, v])) : {};
