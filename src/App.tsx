import { useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { FileTool } from "./features/files/FileTool";
import { PasswordTool } from "./features/passwords/PasswordTool";
import { HashTool } from "./features/hashing/HashTool";

type Tool = "encrypt" | "decrypt" | "passwords" | "hash";
const TOOLS: {
  id: Tool;
  icon: IconName;
  label: string;
  title: string;
  description: string;
  detail: string;
}[] = [
  {
    id: "encrypt",
    icon: "lock",
    label: "Encrypt a file",
    title: "Keep your files to yourself.",
    description:
      "Wrap any file in strong encryption. Only someone with your password can open it.",
    detail: "AES-256-GCM encryption",
  },
  {
    id: "decrypt",
    icon: "unlock",
    label: "Decrypt a file",
    title: "Back in your hands.",
    description:
      "Open a Privacy Suite file with its password. Everything happens right here.",
    detail: "Authenticated decryption",
  },
  {
    id: "passwords",
    icon: "key",
    label: "Password generator",
    title: "Make a better secret.",
    description:
      "Strong, random passwords without a server, an account, or a paper trail.",
    detail: "Cryptographically secure randomness",
  },
  {
    id: "hash",
    icon: "hash",
    label: "Hash & verify",
    title: "The same file. For certain.",
    description:
      "Create a SHA-256 fingerprint and compare it with a hash you trust.",
    detail: "SHA-256 file fingerprinting",
  },
];

export const App = () => {
  const [tool, setTool] = useState<Tool>("encrypt");
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineError, setOfflineError] = useState(
    !("serviceWorker" in navigator),
  );
  const [online, setOnline] = useState(navigator.onLine);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const current = TOOLS.find((item) => item.id === tool) ?? TOOLS[0];
  const supported = !!globalThis.crypto?.subtle;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    let mounted = true;
    let installer: ServiceWorker | null = null;
    const installationChanged = () => {
      if (mounted && installer?.state === "redundant") setOfflineError(true);
    };
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          if (!mounted) return;
          installer = registration.installing;
          installer?.addEventListener("statechange", installationChanged);
          installationChanged();
          await navigator.serviceWorker.ready;
          if (mounted) setOfflineReady(true);
        })
        .catch(() => {
          if (mounted) setOfflineError(true);
        });
    }
    return () => {
      mounted = false;
      installer?.removeEventListener("statechange", installationChanged);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!current) return null;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to tool
      </a>
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Privacy Suite home">
          <span className="brand-mark">
            <Icon name="shield" size={27} />
          </span>
          <span>
            privacy<span className="brand-light">suite</span>
            <small>A LITTLE MORE PEACE OF MIND.</small>
          </span>
        </a>
        <div className="sidebar-section">
          <span className="eyebrow">YOUR PRIVATE TOOLKIT</span>
          <nav aria-label="Privacy tools">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                disabled={busy}
                aria-current={tool === item.id ? "page" : undefined}
                className={`nav-item ${tool === item.id ? "active" : ""}`}
                onClick={() => setTool(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {tool === item.id && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-note">
          <span className="small-shield">
            <Icon name="shield" size={24} />
          </span>
          <strong>
            Your device.
            <br />
            Your business.
          </strong>
          <p>
            No accounts. No uploads.
            <br />
            No one looking over your shoulder.
          </p>
          <button
            className="text-button"
            onClick={() => setShowPrivacy(!showPrivacy)}
          >
            Our privacy promise <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="version">v0.1.0</span>
          <span>Open source. Open doors.</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Useful tools. Zero uploads.</span>
          <span className="status-pill">
            <span className="status-dot" />
            {offlineReady
              ? online
                ? "Ready for offline use"
                : "Working offline"
              : offlineError
                ? "Offline setup unavailable"
                : import.meta.env.DEV
                  ? "Local development"
                  : "Preparing offline access"}
          </span>
        </header>
        <main id="main">
          <div className="intro">
            <div>
              <span className="eyebrow">
                PRIVACY, WITHOUT THE COMPLICATED PART.
              </span>
              <h1>
                Yours.
                <br className="mobile-break" /> <em>Only yours.</em>
              </h1>
              <p>A small toolkit for things that should stay private.</p>
            </div>
            <div className="intro-seal" aria-hidden="true">
              <Icon name="shield" size={50} />
              <span>LOCAL BY DESIGN</span>
            </div>
          </div>
          <div className="workspace">
            <section className="tool-card" aria-labelledby="tool-title">
              <div className="tool-heading">
                <span className="tool-icon">
                  <Icon name={current.icon} size={23} />
                </span>
                <span className="eyebrow">{current.label}</span>
                <span className="tool-number">
                  0{TOOLS.indexOf(current) + 1} / 04
                </span>
              </div>
              <h2 id="tool-title">{current.title}</h2>
              <p className="tool-description">{current.description}</p>
              {!supported ? (
                <p role="alert" className="notice error">
                  This browser cannot provide secure cryptography. Use an
                  up-to-date browser over HTTPS or localhost.
                </p>
              ) : (
                <div key={`${tool}-${session}`} aria-busy={busy}>
                  {tool === "encrypt" || tool === "decrypt" ? (
                    <FileTool mode={tool} busy={busy} setBusy={setBusy} />
                  ) : tool === "passwords" ? (
                    <PasswordTool />
                  ) : (
                    <HashTool busy={busy} setBusy={setBusy} />
                  )}
                </div>
              )}
              <div className="tool-footer">
                <span>
                  <Icon name="shield" size={15} />
                  {current.detail}
                </span>
                <button
                  disabled={busy}
                  className="text-button"
                  onClick={() => setSession((value) => value + 1)}
                >
                  Clear this tool
                </button>
              </div>
            </section>
            <aside className="context-column">
              <div className="local-card">
                <span className="eyebrow">THE SHORT VERSION</span>
                <h3>
                  Nothing leaves
                  <br />
                  this device.
                </h3>
                <div className="device-illustration" aria-hidden="true">
                  <div className="orbit one" />
                  <div className="orbit two" />
                  <div className="device">
                    <Icon name="shield" size={36} />
                  </div>
                  <span className="illustration-dot d1" />
                  <span className="illustration-dot d2" />
                </div>
                <p>
                  Your files are processed in your browser. We never receive,
                  store, or see their contents.
                </p>
                <span className="local-label">
                  <span className="status-dot" />
                  100% local processing
                </span>
              </div>
              <div className="how-card">
                <h3>A few good things to know</h3>
                <div>
                  <span>01</span>
                  <p>
                    <strong>No sign-up, ever.</strong>
                    <br />
                    Open a tool and get on with your day.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>
                    <strong>Goes offline with you.</strong>
                    <br />
                    Once ready, these tools work without a connection.
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <p>
                    <strong>You hold the keys.</strong>
                    <br />
                    Your password is yours to keep. We cannot recover it.
                  </p>
                </div>
              </div>
            </aside>
          </div>
          {showPrivacy && (
            <section className="privacy-panel" aria-labelledby="privacy-title">
              <h2 id="privacy-title">Privacy is the whole point.</h2>
              <p>
                No accounts, analytics, trackers, APIs, or cloud processing.
                Files, passwords, and results stay in memory until you clear the
                tool, switch tools, or close the page. Downloads and copied
                values remain where you save them. Clearing a tool cannot
                securely erase browser or operating-system memory.
              </p>
              <p>
                The offline cache stores only the app. The hosting provider can
                see ordinary page requests, including your IP address, but
                receives no file contents or passwords. A compromised browser,
                extension, device, or app update can defeat these protections.
                This MVP has not had an independent security audit.
              </p>
              <p>
                To install: use your browser’s install option, or Add to Home
                Screen where supported. Wait for “Ready for offline use” before
                disconnecting. Browser data eviction can remove offline access.
                Updates activate after all app tabs close.
              </p>
              <button
                className="text-button"
                onClick={() => setShowPrivacy(false)}
              >
                Close privacy details
              </button>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Icon name="shield" size={16} />
              Built for trust. Designed for everyday.
            </span>
            <button
              className="text-button"
              onClick={() => setShowPrivacy(!showPrivacy)}
            >
              {showPrivacy ? "Hide" : "Privacy & security"}
            </button>
            <span>Made to stay on your side.</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
