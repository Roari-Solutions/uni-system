import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

const BACKGROUND_IMAGES: string[] = [
  "/president-office.jpeg",
  "/president-interview.jpeg",
  "/uni-building.jpeg",
  "/uni-lab.jpeg",
];
const FADE_INTERVAL_MS = 5000;

const HeroSection = () => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const { t } = useTranslation();

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, FADE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="h-[90svh] w-full relative overflow-hidden">
      {/* Crossfading background layers */}
      {BACKGROUND_IMAGES.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Darkening overlay for text legibility */}
      <div className="absolute inset-0 bg-slate-950/60" />

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid md:grid-cols-2 md:grid-rows-2 md:px-16 md:py-14">
        <div className="flex items-center gap-3 sm:gap-5 text-white md:col-start-1 md:row-span-2">
          <img
            src="/logo.png"
            alt="logo"
            width={256}
            height={256}
            className="h-14 w-14 shrink-0 object-contain sm:h-20 sm:w-20 md:h-64 md:w-64"
          />
          <div className="flex flex-col items-start gap-2 sm:gap-4 md:gap-5">
            <h1 className="text-2xl font-semibold leading-snug sm:text-4xl md:text-6xl">
              {t("uni_name")}
            </h1>
            <span className="text-xs font-light sm:text-sm">
              {t("uni_motto")}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end sm:gap-4 md:col-start-2 md:row-start-2">
          <Link
            to={{ pathname: "" }}
            className="bg-white/10 px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            {t("more_faculties")}
          </Link>
          <Link
            to={{ pathname: "" }}
            className="bg-white/10 px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            {t("more_admission")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
