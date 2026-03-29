const baseUrl = process.env.SESSION_FLOW_URL || 'http://127.0.0.1:4310';
const endpoint = `${baseUrl}/api/session-flow/run`;

async function main() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'mock' })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Smoke failed with status ${response.status}: ${JSON.stringify(data)}`);
  }

  if (!Array.isArray(data.steps) || data.steps.length < 4) {
    throw new Error(`Unexpected response payload: ${JSON.stringify(data)}`);
  }

  console.log('smoke ok');
  console.log(
    JSON.stringify(
      {
        mode: data.mode,
        sessionCapId: data.sessionCapId,
        stepCount: data.steps.length,
        nonces: {
          before: data.nonceBeforeSet,
          afterSet: data.nonceAfterSet,
          afterDelete: data.nonceAfterDelete
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
