import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { createLicenseGateFromEnv } from "@zhirai/license-web";
import { LicenseGateProvider, LicenseModalGuard } from "@zhirai/license-web/react";

const str = (v: unknown) => String(v ?? "").trim();
const truthy = (v: string) => ["1", "true", "yes", "on"].includes(v.toLowerCase());
const falsy = (v: string) => ["0", "false", "no", "off"].includes(v.toLowerCase());

const verifyUrl = str(import.meta.env.VITE_LICENSE_VERIFY_URL);
const projectId = str(import.meta.env.VITE_LICENSE_PROJECT_ID);
const enableGateRaw = str(import.meta.env.VITE_ENABLE_LICENSE_GATE);
const enableGate =
  enableGateRaw && (truthy(enableGateRaw) || falsy(enableGateRaw))
    ? truthy(enableGateRaw)
    : !!verifyUrl &&
      !!projectId &&
      !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\b/i.test(verifyUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {enableGate ? (
      <LicenseGateProvider gate={createLicenseGateFromEnv(import.meta.env)}>
        <LicenseModalGuard remindMs={120000} closeMs={60000}>
          <App />
        </LicenseModalGuard>
      </LicenseGateProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);
