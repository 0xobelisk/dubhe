import { Box, Container, Flex, Text } from "@radix-ui/themes";
import { AssemblyInfo } from "./AssemblyInfo";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

export function WalletStatus() {
  /** STEP 3 — useCurrentAccount() (@mysten/dapp-kit-react) → account for wallet status block. */
  const account = useCurrentAccount();

  return (
    <Container my="2">
      {/* STEP 3 — Reading state: connected vs not, address (full or abbreviated). */}
      {account ? (
        <Flex direction="column">
          <Box>Wallet connected</Box>
          <Box>Address: {account.address}</Box>
        </Flex>
      ) : (
        <Text>Wallet not connected</Text>
      )}

      <div className="divider" />

      <AssemblyInfo />
    </Container>
  );
}
