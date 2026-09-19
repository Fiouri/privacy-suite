import { useState } from "react";
import { FilePicker } from "../../components/FilePicker";
import { CopyButton } from "../../components/CopyButton";
import { Icon } from "../../components/Icon";
import { hashFile } from "../../services/crypto";
export const HashTool = ({
  busy,
  setBusy,
}: {
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");
  const normalized = expected.trim().toLowerCase();
  const run = async () => {
    if (!file) return;
    setBusy(true);
    setHash("");
    setError("");
    try {
      setHash(await hashFile(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Hashing failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <FilePicker
        file={file}
        disabled={busy}
        onChange={(next) => {
          setFile(next);
          setHash("");
          setError("");
        }}
      />
      <button
        className="button primary full"
        disabled={!file || busy}
        onClick={() => {
          void run();
        }}
      >
        <Icon name="hash" />
        {busy ? "Calculating on your device…" : "Calculate SHA-256"}
        <Icon name="arrow" />
      </button>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {hash && (
        <div className="hash-result">
          <span className="eyebrow">SHA-256 FINGERPRINT</span>
          <output aria-label="SHA-256 fingerprint" className="hash-output">
            {hash}
          </output>
          <CopyButton key={hash} value={hash} />
        </div>
      )}
      <label className="field-label" htmlFor="expected-hash">
        Compare with an expected hash <span className="muted">(optional)</span>
      </label>
      <input
        id="expected-hash"
        value={expected}
        onChange={(event) => setExpected(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        maxLength={128}
        placeholder="Paste a 64-character SHA-256 hash"
      />
      <div role="status">
        {hash && normalized && (
          <p
            className={`notice ${/^[a-f0-9]{64}$/.test(normalized) ? (normalized === hash ? "success" : "error") : "error"}`}
          >
            {!/^[a-f0-9]{64}$/.test(normalized)
              ? "Enter exactly 64 hexadecimal characters (0–9, a–f)."
              : normalized === hash
                ? "Hashes match. The file matches this fingerprint."
                : "Hashes do not match. This is a different file."}
          </p>
        )}
      </div>
      <p className="field-hint">
        A hash checks file integrity. It does not encrypt your file or prove who
        created it. Get the expected hash from a trusted source.
      </p>
    </>
  );
};
