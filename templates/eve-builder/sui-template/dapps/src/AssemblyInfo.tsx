import { useSmartObject } from "@evefrontier/dapp-kit";

export function AssemblyInfo() {
  /**
   * STEP 4 — useSmartObject() (@evefrontier/dapp-kit) uses VITE_ITEM_ID / URL params and the kit's GraphQL. Returns assembly, assemblyOwner, loading, error.
   */
  const { assembly, assemblyOwner, loading, error } = useSmartObject();

  if (loading) return <div>Loading assembly...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!assembly) return <div>No assembly found</div>;

  return (
    <div>
      <p>Name: {assembly.name || assembly.typeDetails?.name}</p>
      <p>Type: {assembly.type}</p>
      <p>State: {assembly.state}</p>
      <p>ID: {assembly.id}</p>
      {assemblyOwner && <p>Owner: {assemblyOwner.name}</p>}
    </div>
  );
}
