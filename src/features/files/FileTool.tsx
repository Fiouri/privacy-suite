import { useEffect, useState } from "react";
import { FilePicker } from "../../components/FilePicker";
import { Icon } from "../../components/Icon";
import { decryptFile, encryptFile } from "../../services/crypto";

type Result = { url: string; name: string };
export const FileTool = ({
  mode,
  busy,
  setBusy,
}: {
  mode: "encrypt" | "decrypt";
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const encrypting = mode === "encrypt";
  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);
  const run = async () => {
    setError("");
    setResult(null);
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (encrypting && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const output = encrypting
        ? { blob: await encryptFile(file, password), name: "protected.psuite" }
        : await decryptFile(file, password);
      setResult({ url: URL.createObjectURL(output.blob), name: output.name });
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The operation failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <FilePicker
        file={file}
        disabled={busy}
        encrypted={!encrypting}
        onChange={(next) => {
          setFile(next);
          setResult(null);
          setError("");
        }}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <div className="label-row">
          <label htmlFor="file-password">
            {encrypting ? "Create a strong password" : "Enter your password"}
          </label>
          <button
            type="button"
            className="text-button"
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? "Hide" : "Show"} password
          </button>
        </div>
        <input
          id="file-password"
          type={visible ? "text" : "password"}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          maxLength={1024}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          placeholder={
            encrypting
              ? "At least 12 characters"
              : "The password used to encrypt this file"
          }
          required
          minLength={encrypting ? 12 : 1}
        />
        {encrypting && (
          <>
            <label className="field-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type={visible ? "text" : "password"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              maxLength={1024}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              placeholder="Enter it once more"
              required
            />
          </>
        )}
        <p className="field-hint">
          {encrypting
            ? "Keep this password somewhere safe. There is no password recovery."
            : "Your file is checked for tampering before anything is returned."}
        </p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button
          className="button primary full"
          disabled={busy || !file}
          type="submit"
        >
          <Icon name={encrypting ? "lock" : "unlock"} />
          {busy
            ? "Working on your device…"
            : encrypting
              ? "Encrypt file"
              : "Decrypt file"}
          {!busy && <Icon name="arrow" />}
        </button>
        <div role="status">
          {result && (
            <div className="notice success">
              <strong>
                {encrypting
                  ? "Your encrypted file is ready."
                  : "Your file has been decrypted."}
              </strong>
              <a
                className="button secondary"
                href={result.url}
                download={result.name}
              >
                Download {encrypting ? ".psuite file" : "recovered file"}
                <Icon name="arrow" />
              </a>
              <small>
                {encrypting
                  ? "Your original file is unchanged. Keep a backup until you verify decryption."
                  : "The downloaded file is no longer encrypted. Store it with care."}
              </small>
            </div>
          )}
        </div>
      </form>
    </>
  );
};
