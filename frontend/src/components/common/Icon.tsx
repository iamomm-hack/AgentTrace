import type { ReactNode, SVGProps } from "react";

const paths = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  runs: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth="3" /></>,
  replay: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /><path d="m10 8 6 4-6 4Z" /></>,
  failures: <><path d="m12 3 10 18H2Z" /><path d="M12 9v5m0 3h.01" /></>,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />,
  trace: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10m2-12h3a7 7 0 0 1 7 5M8 19h3a7 7 0 0 0 7-5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  refresh: <path d="M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
  compare: <path d="M12 3v18M8 7H3v10h5m8-10h5v10h-5" />,
  check: <path d="m5 12 4 4L19 6" />,
  file: <path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8M8 16h5" />,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
