import { createToolkitAuthPlugin, renderAuthPage } from "@agent-native/toolkit/app/auth/server";

import { brandAuthPage } from "../lib/brand-auth-page.js";

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  rootAuth: true,
  marketing: false,
  // Same framework sign-in page and scripts, dressed as Shop Ledger.
  renderSignInPage: (props) => brandAuthPage(renderAuthPage(props), props.appBasePath),
});
