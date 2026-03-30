'use client';

import { FormEvent, useMemo, useState } from 'react';

type RunnerMode = 'mock' | 'live';

interface SessionFlowStep {
  name: string;
  ok: boolean;
  digest?: string;
  detail?: string;
}

interface SessionFlowResult {
  mode: RunnerMode;
  ownerAddress: string;
  delegateAddress: string;
  frameworkPackageId: string;
  appPackageId: string;
  sessionCapId: string;
  dappKeyType: string;
  nonceBeforeSet: string;
  nonceAfterSet: string;
  nonceAfterDelete: string;
  steps: SessionFlowStep[];
}

interface FormState {
  mode: RunnerMode;
  networkType: string;
  frameworkPackageId: string;
  appPackageId: string;
  dappHubId: string;
  sessionRegistryId: string;
  dappKeyType: string;
  ownerSecretKey: string;
  delegateSecretKey: string;
  sessionCapId: string;
  delegateAddress: string;
  scopeMask: string;
  maxUses: string;
  expiresInMinutes: string;
  recordKey: string;
  recordValueU32: string;
}

const defaults: FormState = {
  mode: 'mock',
  networkType: process.env.NEXT_PUBLIC_DEFAULT_NETWORK ?? 'testnet',
  frameworkPackageId: process.env.NEXT_PUBLIC_DEFAULT_FRAMEWORK_PACKAGE_ID ?? '',
  appPackageId: process.env.NEXT_PUBLIC_DEFAULT_APP_PACKAGE_ID ?? '',
  dappHubId: process.env.NEXT_PUBLIC_DEFAULT_DAPP_HUB_ID ?? '',
  sessionRegistryId: process.env.NEXT_PUBLIC_DEFAULT_SESSION_REGISTRY_ID ?? '',
  dappKeyType: process.env.NEXT_PUBLIC_DEFAULT_DAPP_KEY_TYPE ?? '',
  ownerSecretKey: '',
  delegateSecretKey: '',
  sessionCapId: '',
  delegateAddress: '',
  scopeMask: '5',
  maxUses: '20',
  expiresInMinutes: '10',
  recordKey: 'session-demo',
  recordValueU32: '1'
};

export default function Page() {
  const [form, setForm] = useState<FormState>(defaults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SessionFlowResult | null>(null);

  const resultJson = useMemo(() => {
    if (!result) {
      return '';
    }
    return JSON.stringify(result, null, 2);
  }, [result]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        mode: form.mode,
        config:
          form.mode === 'live'
            ? {
                networkType: form.networkType,
                frameworkPackageId: form.frameworkPackageId,
                appPackageId: form.appPackageId || undefined,
                dappHubId: form.dappHubId,
                sessionRegistryId: form.sessionRegistryId,
                dappKeyType: form.dappKeyType || undefined,
                ownerSecretKey: form.ownerSecretKey,
                delegateSecretKey: form.delegateSecretKey,
                sessionCapId: form.sessionCapId || undefined,
                delegateAddress: form.delegateAddress || undefined,
                scopeMask: Number(form.scopeMask),
                maxUses: Number(form.maxUses),
                expiresInMinutes: Number(form.expiresInMinutes),
                recordKey: form.recordKey,
                recordValueU32: Number(form.recordValueU32)
              }
            : undefined
      };

      const response = await fetch('/api/session-flow/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as SessionFlowResult | { error: string };

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Unknown server error');
      }

      setResult(data as SessionFlowResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="hero">
        <h1>Dubhe Session Flow Runner</h1>
        <p>
          One page to test the full flow: owner registers session, delegate executes with
          nonce-protected calls, owner assets stay bound to owner subject, and cap can be revoked.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>How To Use</h2>
          <ol className="help-list">
            <li>Set mode to mock for UI smoke, or live for real chain execution.</li>
            <li>For live mode, fill package/object IDs and owner/delegate secret keys.</li>
            <li>Click run. Server route executes create, set, delete, and revoke sequence.</li>
            <li>Inspect nonce progression and step digests in the result panel.</li>
          </ol>
        </article>

        <article className="panel">
          <h2>Flow Mapping</h2>
          <ol className="help-list">
            <li>Register: `createSessionCapWithLimits` (owner signer).</li>
            <li>
              Execute: `setRecordWithSessionCap` and `deleteRecordWithSessionCap` (delegate signer).
            </li>
            <li>Safety: `expected_nonce` is enforced by framework and managed by SDK helper.</li>
            <li>Unbind: `revokeSessionCap` (delegate signer in this cap-ownership model).</li>
          </ol>
        </article>
      </section>

      <section className="panel">
        <h2>Run Scenario</h2>
        <form className="form" onSubmit={onSubmit}>
          <div className="row">
            <div className="field">
              <label htmlFor="mode">Mode</label>
              <select
                id="mode"
                value={form.mode}
                onChange={(e) => setField('mode', e.target.value as RunnerMode)}
              >
                <option value="mock">mock (UI + API smoke)</option>
                <option value="live">live (on-chain)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="network">Network</label>
              <input
                id="network"
                value={form.networkType}
                onChange={(e) => setField('networkType', e.target.value)}
                placeholder="testnet | devnet | mainnet | localnet"
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="frameworkPkg">Framework Package ID</label>
              <input
                id="frameworkPkg"
                value={form.frameworkPackageId}
                onChange={(e) => setField('frameworkPackageId', e.target.value)}
                placeholder="0x..."
                disabled={form.mode === 'mock'}
              />
            </div>
            <div className="field">
              <label htmlFor="appPkg">App Package ID (optional)</label>
              <input
                id="appPkg"
                value={form.appPackageId}
                onChange={(e) => setField('appPackageId', e.target.value)}
                placeholder="0x..."
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="hub">DappHub Object ID</label>
              <input
                id="hub"
                value={form.dappHubId}
                onChange={(e) => setField('dappHubId', e.target.value)}
                placeholder="0x..."
                disabled={form.mode === 'mock'}
              />
            </div>
            <div className="field">
              <label htmlFor="registry">SessionRegistry Object ID</label>
              <input
                id="registry"
                value={form.sessionRegistryId}
                onChange={(e) => setField('sessionRegistryId', e.target.value)}
                placeholder="0x..."
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="ownerKey">Owner Secret Key</label>
              <input
                id="ownerKey"
                type="password"
                value={form.ownerSecretKey}
                onChange={(e) => setField('ownerSecretKey', e.target.value)}
                placeholder="bech32 / hex / base64"
                disabled={form.mode === 'mock'}
              />
            </div>
            <div className="field">
              <label htmlFor="delegateKey">Delegate Secret Key</label>
              <input
                id="delegateKey"
                type="password"
                value={form.delegateSecretKey}
                onChange={(e) => setField('delegateSecretKey', e.target.value)}
                placeholder="bech32 / hex / base64"
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="scopeMask">Scope Mask</label>
              <input
                id="scopeMask"
                value={form.scopeMask}
                onChange={(e) => setField('scopeMask', e.target.value)}
                disabled={form.mode === 'mock'}
              />
            </div>
            <div className="field">
              <label htmlFor="maxUses">Max Uses</label>
              <input
                id="maxUses"
                value={form.maxUses}
                onChange={(e) => setField('maxUses', e.target.value)}
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="exp">Expires In Minutes</label>
              <input
                id="exp"
                value={form.expiresInMinutes}
                onChange={(e) => setField('expiresInMinutes', e.target.value)}
                disabled={form.mode === 'mock'}
              />
            </div>
            <div className="field">
              <label htmlFor="recordKey">Record Key</label>
              <input
                id="recordKey"
                value={form.recordKey}
                onChange={(e) => setField('recordKey', e.target.value)}
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="recordValue">Record Value (u32)</label>
              <input
                id="recordValue"
                value={form.recordValueU32}
                onChange={(e) => setField('recordValueU32', e.target.value)}
                disabled={form.mode === 'mock'}
              />
            </div>
            <div className="field">
              <label htmlFor="capId">SessionCap ID (optional, skip create)</label>
              <input
                id="capId"
                value={form.sessionCapId}
                onChange={(e) => setField('sessionCapId', e.target.value)}
                disabled={form.mode === 'mock'}
              />
            </div>
          </div>

          <button disabled={loading} type="submit">
            {loading ? 'Running flow...' : 'Run Full Session Flow'}
          </button>
          <div className={`status ${error ? 'error' : ''}`}>
            {error
              ? `Error: ${error}`
              : 'Live mode sends real transactions. Mock mode is deterministic smoke.'}
          </div>
        </form>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Steps</h2>
          <div className="steps">
            {result?.steps.map((step) => (
              <div key={step.name + step.digest} className={`step ${step.ok ? 'ok' : ''}`}>
                <div>
                  {step.ok ? 'PASS' : 'FAIL'} · {step.name}
                </div>
                {step.digest ? <div>digest: {step.digest}</div> : null}
                {step.detail ? <div>{step.detail}</div> : null}
              </div>
            ))}
            {!result ? <div className="status">No run yet.</div> : null}
          </div>
        </article>

        <article className="panel">
          <h2>Raw Result</h2>
          <pre className="result">{resultJson || 'Run once to view response payload.'}</pre>
        </article>
      </section>
    </main>
  );
}
