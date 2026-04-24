const features = [
  "Clean, well-documented APIs",
  "Sandbox & live environments",
  "Real-time logs & webhooks",
  "SDKs in multiple languages",
];

const langs = [
  { name: "JS", color: "bg-yellow-400 text-black" },
  { name: "TS", color: "bg-blue-500 text-white" },
  { name: "PY", color: "bg-blue-700 text-white" },
  { name: "PHP", color: "bg-indigo-500 text-white" },
  { name: "GO", color: "bg-cyan-500 text-white" },
];

export function DeveloperEcosystem() {
  return (
    <section id="developers" className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">5</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Developer Ecosystem</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Built for developers.<br />Loved by businesses.
            </h2>
            <ul className="mt-8 space-y-3 text-base text-muted-foreground">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-2">
              {langs.map((l) => (
                <div key={l.name} className={`flex h-10 w-10 items-center justify-center rounded-md font-mono text-xs font-bold ${l.color}`}>
                  {l.name}
                </div>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div className="overflow-hidden rounded-xl border border-border bg-primary-deep shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="flex border-b border-white/10 bg-primary px-4">
              {["Request", "Response", "Python", "cURL"].map((t, i) => (
                <button key={t} className={`border-b-2 px-4 py-3 text-xs font-medium ${i === 0 ? "border-accent text-white" : "border-transparent text-white/50"}`}>
                  {t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 py-3">
                <span className="rounded bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">200 OK</span>
                <span className="text-[10px] text-white/50">354ms</span>
              </div>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-white/90">
{`GET /v2/flights/search
Headers:
  Authorization: Bearer ••••••••••••••••

{
  "status": "success",
  "data": {
    "flights": [
      {
        "id": "FL123",
        "airline": "Emirates",
        "price": 450.00,
        "currency": "USD",
        "route": "LOS → DXB"
      }
    ]
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
