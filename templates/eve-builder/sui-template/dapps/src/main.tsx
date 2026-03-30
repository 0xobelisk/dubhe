import React from "react";
import ReactDOM from "react-dom/client";
import "./main.css";

import { QueryClient } from "@tanstack/react-query";
import App from "./App.tsx";
import { EveFrontierProvider } from "@evefrontier/dapp-kit";
import { Theme } from "@radix-ui/themes";

const queryClient = new QueryClient();

/** STEP 1 — EveFrontierProvider(queryClient) wraps App; composes QueryClientProvider (React Query), DAppKitProvider (Mysten Sui client + wallet), VaultProvider (EVE wallet/connection), SmartObjectProvider (GraphQL assembly/context), NotificationProvider (toasts). */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme appearance="dark">
      <EveFrontierProvider queryClient={queryClient}>
        <App />
      </EveFrontierProvider>
    </Theme>
  </React.StrictMode>
);
