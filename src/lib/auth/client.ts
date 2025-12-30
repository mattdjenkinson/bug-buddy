import {
  adminClient,
  inferAdditionalFields,
  lastLoginMethodClient,
} from "better-auth/client/plugins";

import { createAuthClient } from "better-auth/react";
import { auth } from ".";

export const authClient = createAuthClient({
  plugins: [
    lastLoginMethodClient(),
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
