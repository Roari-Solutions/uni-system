import React, { useRef, useState } from "react";
import {
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

/**
 * ============================================================
 * CONFIGURE HERE — colors & font.
 * Everything else in this component is layout/spacing only.
 * Override any of these by passing a `theme` prop, e.g.:
 *   <NavBar theme={{ navBg: "#0f172a", navText: "#f8fafc" }} />
 * ============================================================
 */
const DEFAULT_THEME = {
  navBg: "#ffffff", // navbar background
  navText: "#1f2937", // navbar text color
  navBorder: "#e5e7eb", // divider / bottom border color
  navHoverBg: "#1f2937", // submenu item hover bg (inverted)
  navHoverText: "#ffffff", // submenu item hover text (inverted)
  navFont: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

const HOVER_DELAY = 300; // ms — submenu show/hide delay

type Theme = {
  navBg?: string;
  navText?: string;
  navBorder?: string;
  navHoverBg?: string;
  navHoverText?: string;
  navFont?: string;
};

type NavItem = {
  id: string;
  label: string;
  columns: 2 | 3;
  width: string;
  links: string[];
};

type Language = {
  code: string;
  label: string;
  dir: "ltr" | "rtl";
};

type NavBarProps = {
  theme?: Theme;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "products",
    label: "Products",
    columns: 3,
    width: "w-[520px]",
    links: [
      "Analytics",
      "Automation",
      "Dashboards",
      "Integrations",
      "API Access",
      "Security",
      "Reporting",
      "Workflows",
      "Notifications",
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    columns: 2,
    width: "w-[380px]",
    links: ["Enterprise", "Startups", "Agencies", "Nonprofits", "Education", "Healthcare"],
  },
  {
    id: "resources",
    label: "Resources",
    columns: 2,
    width: "w-[320px]",
    links: ["Blog", "Guides", "Webinars", "Help Center"],
  },
  {
    id: "company",
    label: "Company",
    columns: 2,
    width: "w-[320px]",
    links: ["About Us", "Careers", "Press", "Contact"],
  },
];

const LANGUAGES: Language[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export default function NavBar({ theme = {} }: NavBarProps) {
  const t = { ...DEFAULT_THEME, ...theme };

  // id of open desktop submenu ("lang" or a NAV_ITEMS id)
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // id of expanded mobile item
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openWithDelay = (id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenMenu(id), HOVER_DELAY);
  };

  const closeWithDelay = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenMenu(null), HOVER_DELAY);
  };

  const toggleMobileAccordion = (id: string) => {
    setMobileAccordion((prev) => (prev === id ? null : id));
  };

  const cssVars = {
    "--nav-bg": t.navBg,
    "--nav-text": t.navText,
    "--nav-border": t.navBorder,
    "--nav-hover-bg": t.navHoverBg,
    "--nav-hover-text": t.navHoverText,
    fontFamily: t.navFont,
  } as React.CSSProperties;

  return (
    <nav
      style={cssVars}
      className="relative z-50 bg-[var(--nav-bg)] text-[var(--nav-text)] border-b border-[var(--nav-border)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="#" className="text-xl font-semibold tracking-tight">
              LogoName
            </a>
          </div>

          {/* Center nav (desktop only) */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center h-full">
            {NAV_ITEMS.map((item, idx) => (
              <div key={item.id} className="flex items-center h-full">
                <div
                  className="relative h-full flex items-center"
                  onMouseEnter={() => openWithDelay(item.id)}
                  onMouseLeave={closeWithDelay}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 px-5 h-full text-sm font-medium"
                    aria-expanded={openMenu === item.id}
                  >
                    {item.label}
                    <ChevronDownIcon
                      className={`w-4 h-4 transition-transform duration-300 ${
                        openMenu === item.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 ${item.width} bg-[var(--nav-bg)] border border-[var(--nav-border)] shadow-lg p-4 transition-all duration-300 ${
                      openMenu === item.id
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className={`grid gap-2 ${item.columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                      {item.links.map((link) => (
                        <a
                          key={link}
                          href="#"
                          className="px-3 py-2 text-sm rounded bg-[var(--nav-bg)] text-[var(--nav-text)] transition-colors duration-300 hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-text)]"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {idx < NAV_ITEMS.length - 1 && (
                  <div className="w-px h-1/2 my-auto border-l border-[var(--nav-border)]" />
                )}
              </div>
            ))}
          </div>

          {/* Right side: language dropdown (desktop) + hamburger (mobile) */}
          <div className="flex items-center">
            {/* Language dropdown (desktop only) */}
            <div
              className="hidden md:block relative"
              onMouseEnter={() => openWithDelay("lang")}
              onMouseLeave={closeWithDelay}
            >
              <button type="button" className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                <GlobeAltIcon className="w-5 h-5" />
                <span>Language</span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-300 ${
                    openMenu === "lang" ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`absolute top-full right-0 w-40 bg-[var(--nav-bg)] border border-[var(--nav-border)] shadow-lg p-2 transition-all duration-300 ${
                  openMenu === "lang"
                    ? "opacity-100 visible translate-y-0"
                    : "opacity-0 invisible translate-y-1 pointer-events-none"
                }`}
              >
                {LANGUAGES.map((lang) => (
                  <a
                    key={lang.code}
                    href="#"
                    lang={lang.code}
                    dir={lang.dir}
                    className={`block px-3 py-2 text-sm rounded bg-[var(--nav-bg)] text-[var(--nav-text)] transition-colors duration-300 hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-text)] ${
                      lang.dir === "rtl" ? "text-right" : ""
                    }`}
                  >
                    {lang.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Hamburger (mobile only) */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--nav-border)] bg-[var(--nav-bg)]">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.id} className="border-b border-[var(--nav-border)]">
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-3 text-sm font-medium"
                  onClick={() => toggleMobileAccordion(item.id)}
                  aria-expanded={mobileAccordion === item.id}
                >
                  {item.label}
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-300 ${
                      mobileAccordion === item.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    mobileAccordion === item.id ? "max-h-[500px]" : "max-h-0"
                  }`}
                >
                  <div className="grid grid-cols-2 gap-2 pb-3">
                    {item.links.map((link) => (
                      <a
                        key={link}
                        href="#"
                        className="px-3 py-2 text-sm rounded bg-[var(--nav-bg)] text-[var(--nav-text)] transition-colors duration-300 hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-text)]"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile language options */}
            <div className="pt-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <GlobeAltIcon className="w-5 h-5" />
                <span>Language</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <a
                    key={lang.code}
                    href="#"
                    lang={lang.code}
                    dir={lang.dir}
                    className="px-3 py-2 text-sm rounded text-center bg-[var(--nav-bg)] text-[var(--nav-text)] transition-colors duration-300 hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-text)]"
                  >
                    {lang.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
