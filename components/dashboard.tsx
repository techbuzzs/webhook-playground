"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { maskHeaders } from "@/lib/headers";
import type { Delivery, Endpoint, Profile } from "@/lib/types";

type AccountUser = { id: string; email?: string | null } | null;

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

function formatBytes(value: number) {
  if (value >= 1_048_576) return `${(value / 1_048_576).toFixed(1)} MB`;
  return `${Math.ceil(value / 1024)} KB`;
}

export function Dashboard() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [user, setUser] = useState<AccountUser>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [revealHeaders, setRevealHeaders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState("demo-plus");

  const selected = endpoints.find((item) => item.id === selectedId) ?? null;
  const webhookUrl = selected && typeof window !== "undefined"
    ? `${window.location.origin}/api/hooks/${selected.receiver_token}`
    : "";

  const loadEndpoints = useCallback(async () => {
    const data = await jsonRequest<{ endpoints: Endpoint[]; user: AccountUser; profile: Profile | null }>("/api/endpoints");
    setEndpoints(data.endpoints);
    setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
    setProfile(data.profile);
    setSelectedId((current) => current ?? data.endpoints[0]?.id ?? null);
  }, []);

  const loadDeliveries = useCallback(async (endpointId: string) => {
    const data = await jsonRequest<{ deliveries: Delivery[] }>(`/api/endpoints/${endpointId}/deliveries`);
    setDeliveries(data.deliveries);
    setSelectedDelivery((current) => {
      if (current) return data.deliveries.find((item) => item.id === current.id) ?? data.deliveries[0] ?? null;
      return data.deliveries[0] ?? null;
    });
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has("signedIn")) {
          const result = await jsonRequest<{ claimed: number }>("/api/endpoints/claim", { method: "POST" });
          if (result.claimed) setNotice(`Claimed ${result.claimed} anonymous endpoint${result.claimed === 1 ? "" : "s"}.`);
          window.history.replaceState({}, "", "/");
        } else if (params.has("authError")) {
          setError("GitHub sign-in did not complete. Please try again.");
          window.history.replaceState({}, "", "/");
        }
        await loadEndpoints();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load endpoints");
      } finally {
        setLoading(false);
      }
    }
    void initialize();
  }, [loadEndpoints]);

  useEffect(() => {
    if (!selectedId) return;
    const initial = window.setTimeout(
      () => void loadDeliveries(selectedId).catch(() => undefined),
      0,
    );
    const timer = window.setInterval(() => void loadDeliveries(selectedId).catch(() => undefined), 3000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [selectedId, loadDeliveries]);

  async function createEndpoint() {
    setCreating(true);
    setError(null);
    try {
      const data = await jsonRequest<{ endpoint: Endpoint }>("/api/endpoints", {
        method: "POST",
        body: JSON.stringify({ name: `Endpoint ${endpoints.length + 1}` }),
      });
      await loadEndpoints();
      setSelectedId(data.endpoint.id);
      setNotice("Endpoint created. It is ready to receive requests.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create endpoint");
    } finally {
      setCreating(false);
    }
  }

  async function signIn() {
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (authError) setError(authError.message);
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setNotice("Signed out. Your account endpoints remain saved.");
    await loadEndpoints();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    setNotice("Webhook URL copied.");
  }

  async function removeEndpoint() {
    if (!selected || !window.confirm(`Delete “${selected.name}” and all of its deliveries?`)) return;
    await jsonRequest(`/api/endpoints/${selected.id}`, { method: "DELETE" });
    setSelectedId(null);
    await loadEndpoints();
    setNotice("Endpoint deleted.");
  }

  async function renameEndpoint() {
    if (!selected) return;
    const name = window.prompt("Endpoint name", selected.name)?.trim();
    if (!name || name === selected.name) return;
    await jsonRequest(`/api/endpoints/${selected.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    await loadEndpoints();
    setNotice("Endpoint renamed.");
  }

  async function checkout() {
    setError(null);
    try {
      const result = await jsonRequest<{ tier: string; message: string }>("/api/mock-checkout", {
        method: "POST",
        body: JSON.stringify({ code: demoCode }),
      });
      setNotice(`${result.message}: ${result.tier}.`);
      await loadEndpoints();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Demo checkout failed");
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Permanently delete your account and all saved webhook data?")) return;
    await jsonRequest("/api/account", { method: "DELETE" });
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  const displayedHeaders = selectedDelivery
    ? revealHeaders
      ? selectedDelivery.headers
      : maskHeaders(selectedDelivery.headers)
    : {};

  return (
    <main>
      <header className="site-header shell">
        <Link className="brand" href="/" aria-label="Webhook Playground home">
          <span className="brand-mark">W/</span>
          <span>Webhook Playground</span>
        </Link>
        <nav>
          <Link href="/docs/api">API docs</Link>
          {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
          {user ? (
            <button className="button ghost small" onClick={() => void signOut()}>Sign out</button>
          ) : (
            <button className="button ghost small" onClick={() => void signIn()}>Sign in with GitHub</button>
          )}
        </nav>
      </header>

      <section className="hero shell">
        <div>
          <span className="eyebrow"><span className="pulse" /> Live request inspector</span>
          <h1>See what your webhook<br />actually received.</h1>
          <p>Create a temporary endpoint, send it anything, and inspect every byte—without configuring a server.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => void createEndpoint()} disabled={creating}>
              {creating ? "Creating…" : "+ Create endpoint"}
            </button>
            <span className="quiet">No account required</span>
          </div>
        </div>
        <div className="signal-card" aria-hidden="true">
          <div className="signal-top"><span /><span /><span /></div>
          <div className="signal-line"><b>POST</b><span>/api/hooks/••••••</span><em>200</em></div>
          <div className="signal-code">{`{\n  "event": "invoice.paid",\n  "status": "delivered"\n}`}</div>
          <div className="signal-foot"><span className="pulse" /> received just now</div>
        </div>
      </section>

      {(notice || error) && (
        <div className={`toast shell ${error ? "error" : ""}`} role="status">
          {error ?? notice}
          <button onClick={() => { setNotice(null); setError(null); }} aria-label="Dismiss">×</button>
        </div>
      )}

      <section className="workspace shell" aria-label="Webhook workspace">
        <aside className="endpoint-list panel">
          <div className="panel-heading">
            <div><span className="label">Endpoints</span><strong>{endpoints.length}</strong></div>
            <button className="icon-button" onClick={() => void createEndpoint()} aria-label="Create endpoint">+</button>
          </div>
          {loading ? <p className="empty">Loading…</p> : endpoints.length === 0 ? (
            <div className="empty"><span>⌁</span><p>No endpoints yet.</p><small>Create one to start listening.</small></div>
          ) : endpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              className={`endpoint-row ${selectedId === endpoint.id ? "active" : ""}`}
              onClick={() => { setSelectedId(endpoint.id); setRevealHeaders(false); }}
            >
              <span className="method-dot" />
              <span><b>{endpoint.name}</b><small>{endpoint.request_count} / {endpoint.request_limit} requests</small></span>
              <time>{new Date(endpoint.expires_at).toLocaleDateString()}</time>
            </button>
          ))}
        </aside>

        <section className="request-panel panel">
          {selected ? (
            <>
              <div className="endpoint-bar">
                <div>
                  <span className="label">Your webhook URL</span>
                  <code>{webhookUrl}</code>
                </div>
                <button className="button secondary small" onClick={() => void copyUrl()}>Copy URL</button>
                <button className="button ghost small" onClick={() => void renameEndpoint()}>Rename</button>
                <button className="button danger small" onClick={() => void removeEndpoint()}>Delete</button>
              </div>
              <div className="request-grid">
                <div className="deliveries">
                  <div className="section-title"><span>Deliveries</span><small>refreshes every 3s</small></div>
                  {deliveries.length === 0 ? (
                    <div className="empty tall"><span>↯</span><p>Waiting for a request</p><small>Send a webhook to the URL above.</small></div>
                  ) : deliveries.map((delivery) => (
                    <button
                      key={delivery.id}
                      className={`delivery-row ${selectedDelivery?.id === delivery.id ? "active" : ""}`}
                      onClick={() => { setSelectedDelivery(delivery); setRevealHeaders(false); }}
                    >
                      <b className={`method ${delivery.method.toLowerCase()}`}>{delivery.method}</b>
                      <span>{delivery.content_type ?? "no content type"}</span>
                      <time>{new Date(delivery.received_at).toLocaleTimeString()}</time>
                    </button>
                  ))}
                </div>
                <div className="inspector">
                  {selectedDelivery ? (
                    <>
                      <div className="inspector-meta">
                        <span className="method post">{selectedDelivery.method}</span>
                        <span>{formatBytes(selectedDelivery.body_size)}</span>
                        <time>{new Date(selectedDelivery.received_at).toLocaleString()}</time>
                      </div>
                      <details open>
                        <summary>Payload</summary>
                        <pre>{selectedDelivery.parsed_json !== null
                          ? JSON.stringify(selectedDelivery.parsed_json, null, 2)
                          : selectedDelivery.body || "(empty body)"}</pre>
                      </details>
                      <details>
                        <summary>
                          Headers
                          <button className="text-button" onClick={(event) => { event.preventDefault(); setRevealHeaders((value) => !value); }}>
                            {revealHeaders ? "Hide secrets" : "Reveal secrets"}
                          </button>
                        </summary>
                        <pre>{JSON.stringify(displayedHeaders, null, 2)}</pre>
                      </details>
                      <details>
                        <summary>Query parameters</summary>
                        <pre>{JSON.stringify(selectedDelivery.query, null, 2)}</pre>
                      </details>
                    </>
                  ) : <div className="empty tall"><p>Select a delivery to inspect it.</p></div>}
                </div>
              </div>
            </>
          ) : (
            <div className="empty workspace-empty"><span>W/</span><h2>Your webhook workbench</h2><p>Create an endpoint to begin capturing requests.</p></div>
          )}
        </section>
      </section>

      <section className="security-note shell">
        <b>Handle test data with care.</b>
        <span>Webhook headers and bodies can contain secrets. Sensitive headers are hidden by default, and all captures expire automatically.</span>
      </section>

      <section className="pricing shell" id="pricing">
        <div className="section-copy"><span className="eyebrow">Demo plans</span><h2>More room when your tests get busy.</h2><p>This playground uses a mocked paywall. No real payment is processed.</p></div>
        <div className="plan-grid">
          {[{ name: "Basic", price: "$0", info: "3 active endpoints · 100 requests" }, { name: "Plus", price: "$8", info: "6 active endpoints · 200 requests" }, { name: "Pro", price: "$18", info: "12 active endpoints · 400 requests" }].map((plan) => (
            <article className={`plan ${profile?.tier === plan.name.toLowerCase() ? "current" : ""}`} key={plan.name}>
              <span>{plan.name}</span><strong>{plan.price}<small>/mo</small></strong><p>{plan.info}</p>
            </article>
          ))}
        </div>
        <div className="demo-checkout">
          <div><b>Demo checkout</b><small>No card data is requested or stored.</small></div>
          <select value={demoCode} onChange={(event) => setDemoCode(event.target.value)} aria-label="Demo checkout code">
            <option value="demo-plus">demo-plus</option>
            <option value="demo-pro">demo-pro</option>
            <option value="demo-basic">demo-basic</option>
            <option value="demo-decline">demo-decline</option>
          </select>
          <button className="button primary small" onClick={() => void (user ? checkout() : signIn())}>
            {user ? "Apply demo code" : "Sign in to upgrade"}
          </button>
        </div>
        {user && <button className="delete-account" onClick={() => void deleteAccount()}>Delete my account and data</button>}
      </section>

      <footer className="shell"><span>Webhook Playground</span><span>Temporary by design. Built for Vercel + Supabase.</span></footer>
    </main>
  );
}
