import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params.js";

export const base44 = createClient({
  appId: appParams.appId,
});