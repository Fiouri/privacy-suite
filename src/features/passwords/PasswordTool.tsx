import { useState } from "react";
import { CopyButton } from "../../components/CopyButton";
import { Icon } from "../../components/Icon";
import { generatePassword, type CharacterGroup } from "../../services/crypto";
const OPTIONS: { key: CharacterGroup; label: string; example: string }[] = [
  { key: "uppercase", label: "Uppercase", example: "A–Z" },
  { key: "lowercase", label: "Lowercase", example: "a–z" },
  { key: "numbers", label: "Numbers", example: "0–9" },
  { key: "symbols", label: "Symbols", example: "!@#$" },
];
export const PasswordTool = () => {
  const [length, setLength] = useState(24);
  const [groups, setGroups] = useState<CharacterGroup[]>([
    "uppercase",
    "lowercase",
    "numbers",
    "symbols",
  ]);
  const [exclude, setExclude] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const reset = () => {
    setPassword("");
    setError("");
  };
  return (
    <div className="password-tool">
      <div className="password-display">
        <span className="eyebrow">GENERATED ON YOUR DEVICE</span>
        <output aria-label="Generated password">
          {password || "Your next secret."}
        </output>
        <span className="field-hint">
          {password
            ? `${password.length} random characters. No history kept.`
            : "A fresh password, just for you."}
        </span>
      </div>
      {password && <CopyButton key={password} value={password} />}
      <div className="label-row">
        <label htmlFor="password-length">Password length</label>
        <strong className="length-value">{length}</strong>
      </div>
      <input
        id="password-length"
        type="range"
        min="12"
        max="128"
        value={length}
        onChange={(event) => {
          setLength(Number(event.target.value));
          reset();
        }}
      />
      <div className="range-labels">
        <span>12 characters</span>
        <span>128 characters</span>
      </div>
      <div className="option-grid">
        {OPTIONS.map((option) => (
          <label className="check-option" key={option.key}>
            <input
              type="checkbox"
              checked={groups.includes(option.key)}
              onChange={(event) => {
                setGroups(
                  event.target.checked
                    ? [...groups, option.key]
                    : groups.filter((group) => group !== option.key),
                );
                reset();
              }}
            />
            <span>
              {option.label}
              <small>{option.example}</small>
            </span>
          </label>
        ))}
      </div>
      <label className="check-option plain">
        <input
          type="checkbox"
          checked={exclude}
          onChange={(event) => {
            setExclude(event.target.checked);
            reset();
          }}
        />
        <span>
          Exclude look-alike characters <small>I, l, 1, O, 0, o</small>
        </span>
      </label>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <button
        className="button primary full"
        onClick={() => {
          try {
            setPassword(generatePassword(length, groups, exclude));
            setError("");
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Generation failed.",
            );
          }
        }}
      >
        <Icon name="refresh" />
        Generate password
        <Icon name="arrow" />
      </button>
      <p className="field-hint">
        Randomness comes from your browser’s cryptographic generator. Save the
        result in a trusted password manager.
      </p>
    </div>
  );
};
