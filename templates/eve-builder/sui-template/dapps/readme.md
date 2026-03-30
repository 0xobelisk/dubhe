# Reference DApp Starter Template

This dApp was created using `@mysten/create-dapp` that sets up a basic React
Client dApp using the following tools:

- [React](https://react.dev/) as the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type checking
- [Vite](https://vitejs.dev/) for build tooling
- [Radix UI](https://www.radix-ui.com/) for pre-built UI components
- [ESLint](https://eslint.org/)
- [`@evefrontier/dapp-kit`](https://sui-docs.evefrontier.com/) for connecting to
  wallets and loading Frontier data
- [`@mysten/dapp-kit-react`](https://sdk.mystenlabs.com/dapp-kit) for extended
  Sui React hooks
- [pnpm](https://pnpm.io/) for package management

## Features and where to find them

| Step  | Feature                               | What to use                                                                                                                                                                                                                                                                                         | Where                                 |
| ----- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **1** | **Provider setup**                    | `EveFrontierProvider(queryClient)` wraps the app. Composes: QueryClientProvider (React Query), DAppKitProvider (Mysten Sui client + wallet), VaultProvider (EVE wallet/connection), SmartObjectProvider (GraphQL assembly/context), NotificationProvider (toasts).                                  | `src/main.tsx`                        |
| **2** | **Wallet connection**                 | `useConnection()` (`@evefrontier/dapp-kit`) → handleConnect, handleDisconnect, isConnected, walletAddress, hasEveVault. `useCurrentAccount()` (`@mysten/dapp-kit-react`) → account for UI. `abbreviateAddress()` for display. Connect/disconnect and show abbreviated address in header.            | `src/App.tsx`                         |
| **3** | **Wallet status**                     | Same hooks (useConnection, useCurrentAccount) drive both header and status block; state stays in sync. Reading state: connected vs not, address (full or abbreviated).                                                                                                                              | `src/App.tsx`, `src/WalletStatus.tsx` |
| **4** | **EVE Smart Object / Assembly**       | `useSmartObject()` (`@evefrontier/dapp-kit`) uses VITE_ITEM_ID / URL params and the kit's GraphQL. Returns assembly, character, loading, error, refetch, optional setSelectedObjectId. Render name, type, state, id, owner character. `refetch()` re-runs the query; same pattern after a mutation. | `src/AssemblyInfo.tsx`                |
| **5** | **GraphQL helpers (optional)**        | When useSmartObject isn't enough: `getAssemblyWithOwner()`, `getOwnedObjectsByType()`, `executeGraphQLQuery()`, `transformToAssembly()`, `getObjectWithJson()`, etc. (`@evefrontier/dapp-kit`)                                                                                                      | `src/queries.ts`                      |
| **6** | **Sponsored transactions (optional)** | `useSponsoredTransaction()` (`@evefrontier/dapp-kit`). Supported only by wallets that implement the EVE Frontier feature (e.g. EVE Vault). Catch `WalletSponsoredTransactionNotSupportedError` and show "Use EVE Vault for sponsored tx".                                                           | Not in template; add when needed      |
| **7** | **Mysten layer**                      | `useDAppKit()` (`@mysten/dapp-kit-react`) → signAndExecuteTransaction, signTransaction, signPersonalMessage. For raw RPC or network: `useCurrentClient()`, `useCurrentNetwork()`. Prefer `@evefrontier/dapp-kit` for connection and EVE data.                                                       | `src/WalletStatus.tsx`                |

## Starting your dApp

To install dependencies you can run:

```bash
pnpm install
```

To start your dApp in development mode run:

```bash
pnpm dev
```

## Building

To build your app for deployment, run:

```bash
pnpm build
```
