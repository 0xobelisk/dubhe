import { Box, Flex, Heading } from "@radix-ui/themes";
import { WalletStatus } from "./WalletStatus";
import { abbreviateAddress, useConnection } from "@evefrontier/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

function App() {
  /**
   * STEP 2 — Wallet connection
   *
   * useConnection() (@evefrontier/dapp-kit) → handleConnect, handleDisconnect;
   * isConnected, walletAddress, hasEveVault. useCurrentAccount()
   * (@mysten/dapp-kit-react) → account (e.g. account.address) for UI. abbreviateAddress()
   * (@evefrontier/dapp-kit) for display.
   */
  const { handleConnect, handleDisconnect } = useConnection();
  const account = useCurrentAccount();

  return (
    <Box style={{ padding: "20px" }}>
      <Flex
        position="sticky"
        px="4"
        py="2"
        direction="row"
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Heading>EVE Frontier dApp Starter Template</Heading>

        {/* STEP 2 — Connect/disconnect; show abbreviated address in header. */}
        <button
          onClick={() =>
            account?.address ? handleDisconnect() : handleConnect()
          }
        >
          {account ? abbreviateAddress(account?.address) : "Connect Wallet"}
        </button>
      </Flex>
      {/* STEP 3 — Same hooks (useConnection, useCurrentAccount) drive WalletStatus; state stays in sync. */}
      <WalletStatus />
    </Box>
  );
}

export default App;
