import { createSiteWorker } from "@site/theme/worker";
import { redirects } from "../redirects";
import { withEditor } from "./editor-kit";

// withEditor (Craeft's site kit) only does anything on previews and at /admin: see editor-kit.ts.
export default withEditor(createSiteWorker({ redirects }), { site: "issue31-github-qa" });
