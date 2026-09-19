export type IconName =
  | "shield"
  | "lock"
  | "unlock"
  | "key"
  | "hash"
  | "arrow"
  | "file"
  | "check"
  | "copy"
  | "refresh";
const paths: Record<IconName, string> = {
  shield: "M12 3 20 6v6c0 5-5 8-8 9-3-1-8-4-8-9V6Z M8 12l3 3 5-6",
  lock: "M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5Z M12 14v3",
  unlock: "M7 10V7a5 5 0 0 1 9-3 M5 10h14v11H5Z M12 14v3",
  key: "M14 4a6 6 0 1 1-4 10l-6 6H2v-4l6-6a6 6 0 0 1 6-6Z M16 8h.01",
  hash: "M9 3 7 21 M17 3l-2 18 M3 8h18 M2 16h18",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  file: "M14 2H5v20h14V7Z M14 2v5h5 M8 12h8 M8 16h5",
  check: "m5 12 4 4L19 6",
  copy: "M8 8h12v13H8Z M16 8V3H3v13h5",
  refresh: "M20 8a8 8 0 1 0 0 8 M20 3v5h-5",
};
export const Icon = ({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
);
