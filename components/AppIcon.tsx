import type { ReactNode } from "react";

export type AppIconName =
  | "activity"
  | "addressBook"
  | "bell"
  | "briefcase"
  | "building"
  | "calendar"
  | "checkSquare"
  | "chevronDown"
  | "clock"
  | "externalLink"
  | "fileText"
  | "flag"
  | "home"
  | "lightbulb"
  | "listTodo"
  | "logOut"
  | "map"
  | "mail"
  | "maximize"
  | "menu"
  | "message"
  | "minimize"
  | "plus"
  | "refresh"
  | "search"
  | "settings"
  | "user"
  | "userAdmin"
  | "userDeveloper"
  | "users"
  | "x";

const paths: Record<AppIconName, ReactNode> = {
  activity: <path d="M3 12h4l2.2-6 4.2 12 2.1-6H21" />,
  addressBook: (
    <>
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" />
      <path d="M6 7H3M6 12H3M6 17H3" />
      <circle cx="13" cy="9" r="2" />
      <path d="M9.5 17c.5-2 1.7-3 3.5-3s3 1 3.5 3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  checkSquare: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  chevronDown: <path d="m7 10 5 5 5-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  externalLink: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </>
  ),
  fileText: (
    <>
      <path d="M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h6M9 9h2" />
    </>
  ),
  flag: <path d="M5 22V4m0 0h11l-1 4 3 4H5" />,
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M8.2 14.5A7 7 0 1 1 15.8 14.5C14.7 15.3 14 16.4 14 18h-4c0-1.6-.7-2.7-1.8-3.5z" />
    </>
  ),
  listTodo: (
    <>
      <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M10 7h11M10 13h11M10 19h11" />
    </>
  ),
  logOut: (
    <>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  maximize: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  minimize: <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M18.5 16a8 8 0 1 1 .8-8.8L20 12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  userAdmin: (
    <>
      <circle cx="12" cy="11" r="3" />
      <path d="M5 22a7 7 0 0 1 14 0" />
      <path d="m8 4 2 2 2-3 2 3 2-2 1 5H7z" />
    </>
  ),
  userDeveloper: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M2 20a6 6 0 0 1 10.5-4" />
      <path d="M19.5 7.5a4 4 0 0 0-5 5L9 18l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.4 2.4-3-3z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a6 6 0 0 1 4 6" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

export default function AppIcon({
  name,
  size = 20,
  className = "",
  strokeWidth = 2,
}: {
  name: AppIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
