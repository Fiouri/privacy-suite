import { useState } from "react";
import { Icon } from "./Icon";
export const CopyButton = ({ value }: { value: string }) => {
  const [notice, setNotice] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(
        "Copied. Your clipboard may be shared with other apps or devices.",
      );
    } catch {
      setNotice("Clipboard unavailable. Select and copy the value manually.");
    }
  };
  return (
    <div className="copy-control">
      <button
        className="button secondary"
        onClick={() => {
          void copy();
        }}
      >
        <Icon name="copy" />
        Copy
      </button>
      <small role="status">{notice}</small>
    </div>
  );
};
