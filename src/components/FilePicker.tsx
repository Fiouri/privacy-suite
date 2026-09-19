import { useId, useState } from "react";
import { Icon } from "./Icon";

export const FilePicker = ({
  file,
  onChange,
  disabled = false,
  encrypted = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  encrypted?: boolean;
}) => {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onChange(event.dataTransfer.files.item(0));
      }}
    >
      <span className="file-emblem">
        <Icon name={file ? "check" : "file"} size={27} />
      </span>
      <strong>{file ? file.name : "A little privacy starts here."}</strong>
      <p>
        {file
          ? `${(file.size / 1024 / 1024).toFixed(2)} MiB · stays on this device`
          : "Drag a file here, or choose one from your device."}
      </p>
      <label
        className={`button secondary file-button ${disabled ? "disabled" : ""}`}
        htmlFor={id}
      >
        {file ? "Choose another file" : "Choose file"}
      </label>
      <input
        id={id}
        type="file"
        aria-label="Choose file"
        disabled={disabled}
        accept={encrypted ? ".psuite" : undefined}
        onChange={(event) => {
          onChange(event.currentTarget.files?.item(0) ?? null);
          event.currentTarget.value = "";
        }}
      />
      <small>
        {encrypted
          ? "Privacy Suite .psuite files · up to 50 MiB original size"
          : "Any file type · up to 50 MiB"}
      </small>
    </div>
  );
};
