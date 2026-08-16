/**
 * Inline icon set — 24px grid, 1.7px stroke, currentColor.
 * Local rather than a dependency: the app needs ~20 glyphs, all one shape family.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7.5" height="8.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.5" />
  </Icon>
);

export const IconFiles = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
);

export const IconUsers = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
    <circle cx="9" cy="7.5" r="3.5" />
    <path d="M22 20v-1.5a4 4 0 0 0-3-3.87" />
    <path d="M16.5 4.13a3.5 3.5 0 0 1 0 6.74" />
  </Icon>
);

export const IconSettings = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6h.08a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.08a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Icon>
);

export const IconUpload = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Icon>
);

export const IconSearch = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const IconClose = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const IconCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const IconAlert = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4.5M12 17.5h.01" />
  </Icon>
);

export const IconClock = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 1.9" />
  </Icon>
);

export const IconSpinner = ({ size = 18, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className="spin"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export const IconChevronLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const IconChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const IconTrash = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
    <path d="M18.5 6 18 19.2A2 2 0 0 1 16 21H8a2 2 0 0 1-2-1.8L5.5 6" />
    <path d="M10 11v5M14 11v5" />
  </Icon>
);

export const IconDownload = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
);

export const IconMenu = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Icon>
);

export const IconSun = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const IconMoon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 13.2A9 9 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2z" />
  </Icon>
);

export const IconMonitor = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
    <path d="M8.5 21h7M12 16.5V21" />
  </Icon>
);

export const IconLogout = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);

export const IconImage = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.8" cy="8.8" r="1.8" />
    <path d="m21 15.5-4.5-4.5L5 21" />
  </Icon>
);

export const IconFile = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
);

export const IconShieldOff = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19.7 14A11 11 0 0 0 20 11V5.6l-8-3-4.6 1.7" />
    <path d="M4 6.3v4.7c0 5 3.4 8.4 8 10 1.6-.6 3-1.4 4.2-2.5" />
    <path d="m2.5 2.5 19 19" />
  </Icon>
);

export const IconArrowLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);

export const IconDatabase = (props: IconProps) => (
  <Icon {...props}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
    <path d="M20 12c0 1.7-3.6 3-8 3s-8-1.3-8-3" />
  </Icon>
);

export const IconLayers = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 2.5 9 4.7-9 4.7-9-4.7 9-4.7z" />
    <path d="m3 16.8 9 4.7 9-4.7" />
    <path d="m3 12 9 4.7L21 12" />
  </Icon>
);

export const IconMail = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="m3 6.5 9 6 9-6" />
  </Icon>
);
