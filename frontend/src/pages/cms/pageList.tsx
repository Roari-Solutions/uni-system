import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { fetchPages } from "../../api/siteContent";
import type { PageGroup, PageSummary } from "../../types/siteContent";
import { cardClass } from "../../styles/form";

const GROUPS: PageGroup[] = ["site", "about", "leaders", "units", "colleges"];

/** Every page of the website, grouped as the site's menu groups them. */
const PageList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const [pages, setPages] = useState<PageSummary[] | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetchPages()
			.then((rows) => {
				if (!cancelled) setPages(rows);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const date = (iso: string) =>
		new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
			new Date(iso),
		);

	return (
		<div className="mx-auto max-w-4xl">
			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("cmsPages.title")}
			</h1>
			<p className="mb-8 text-body-md text-foreground">{t("cmsPages.subtitle")}</p>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}
			{!pages && !failed && <p role="status">{t("common.loading")}</p>}

			<div className="flex flex-col gap-8">
				{pages &&
					GROUPS.map((group) => {
						const rows = pages.filter((p) => p.group === group);
						if (!rows.length) return null;
						return (
							<section key={group} aria-labelledby={`group-${group}`}>
								<h2 id={`group-${group}`} className="mb-3 text-heading-5 text-accent-deep">
									{t(`cmsPages.groups.${group}`)}
								</h2>
								<ul className={`flex flex-col divide-y divide-border-subtle p-0 ${cardClass}`}>
									{rows.map((page) => (
										<li key={page.key}>
											<Link
												to={`pages/${page.key}`}
												className="flex min-h-16 items-center gap-4 px-6 py-3 transition-colors duration-200 ease-out hover:bg-background"
											>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-body-md font-semibold text-foreground">
														{page.label[lang]}
													</span>
													<span className="block text-body-sm text-primary-hover">
														{page.version === 0
															? t("cmsPages.notSeeded")
															: page.updatedBy
																? t("cmsPages.savedBy", { date: date(page.updatedAt!), name: page.updatedBy })
																: t("cmsPages.fromSnapshot")}
													</span>
												</span>
												<span dir={page.path ? "ltr" : undefined} className="hidden text-caption text-primary-hover sm:block">
													{page.path ?? t("cmsPages.everyPage")}
												</span>
												<ChevronRightIcon className="size-5 shrink-0 text-accent-deep rtl:-scale-x-100" aria-hidden />
											</Link>
										</li>
									))}
								</ul>
							</section>
						);
					})}
			</div>
		</div>
	);
};

export default PageList;
