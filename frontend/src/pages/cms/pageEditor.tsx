import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useBeforeUnload, useBlocker, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, ClockIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "../../components/confirmDialog";
import FieldEditor from "../../components/cms/fieldEditor";
import { fetchPage, fetchRevision, fetchRevisions, savePage } from "../../api/siteContent";
import { WEBSITE_URL } from "../../lib/media";
import type { ContentIssue, EditablePage, Revision } from "../../types/siteContent";
import { issuesByPath, setAt, type Path } from "../../utils/siteContent";
import { cardClass, smallSecondaryButtonClass, submitButtonClass } from "../../styles/form";

type Failure = "load" | "invalid" | "stale" | "save" | null;

/**
 * Edits one website page. The form is the page's schema: every section and
 * field the website shows, and nothing else. Saving sends the whole page, and
 * the API refuses it if someone saved since it was loaded.
 */
const PageEditor = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const key = useParams()["*"] ?? "";

	const [page, setPage] = useState<EditablePage | null>(null);
	const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
	const [dirty, setDirty] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failure, setFailure] = useState<Failure>(null);
	const [issues, setIssues] = useState<ContentIssue[]>([]);
	const [history, setHistory] = useState<Revision[] | null>(null);
	const [restoring, setRestoring] = useState<string | null>(null);

	const load = useCallback(async () => {
		setFailure(null);
		setIssues([]);
		setSaved(false);
		try {
			const loaded = await fetchPage(key);
			setPage(loaded);
			setDraft(loaded.content);
			setDirty(false);
		} catch {
			setFailure("load");
		}
	}, [key]);

	useEffect(() => {
		let cancelled = false;
		fetchPage(key)
			.then((loaded) => {
				if (cancelled) return;
				setPage(loaded);
				setDraft(loaded.content);
				setDirty(false);
				setHistory(null);
			})
			.catch(() => {
				if (!cancelled) setFailure("load");
			});
		return () => {
			cancelled = true;
		};
	}, [key]);

	// unsaved edits are not lost to a misclick: leaving the page asks first
	const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
	useBeforeUnload(
		useCallback(
			(e: BeforeUnloadEvent) => {
				if (dirty) e.preventDefault();
			},
			[dirty],
		),
	);

	const onChange = useCallback((path: Path, value: unknown) => {
		setDraft((prev) => setAt(prev, path, value) as Record<string, unknown>);
		setDirty(true);
		setSaved(false);
	}, []);

	const issueMap = useMemo(() => issuesByPath(issues), [issues]);

	const save = async () => {
		if (!page || !draft) return;
		setSaving(true);
		setFailure(null);
		setSaved(false);
		try {
			const result = await savePage(page.key, draft, page.version);
			// the server may have tidied the content (map links become embed links)
			setPage({ ...page, content: result.content, version: result.version });
			setDraft(result.content);
			setIssues([]);
			setDirty(false);
			setSaved(true);
			setHistory(null);
		} catch (error) {
			const data = axios.isAxiosError(error)
				? (error.response?.data as { code?: string; issues?: ContentIssue[] } | undefined)
				: undefined;
			if (data?.code === "INVALID_CONTENT") {
				setIssues(data.issues ?? []);
				setFailure("invalid");
			} else if (data?.code === "STALE_VERSION") {
				setFailure("stale");
			} else {
				setFailure("save");
			}
		} finally {
			setSaving(false);
		}
	};

	const openHistory = async () => {
		try {
			setHistory(await fetchRevisions(key));
		} catch {
			setFailure("load");
		}
	};

	// a past version comes back as an unsaved edit; saving it makes it current again
	const restore = async (id: string) => {
		setRestoring(id);
		try {
			const revision = await fetchRevision(id);
			setDraft(revision.content);
			setDirty(true);
			setSaved(false);
			setIssues([]);
		} catch {
			setFailure("load");
		} finally {
			setRestoring(null);
		}
	};

	const date = (iso: string) =>
		new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
			new Date(iso),
		);

	if (failure === "load" && !page) {
		return (
			<p role="alert" className="text-body-sm text-error">
				{t("common.loadFailed")}
			</p>
		);
	}
	if (!page) return <p role="status">{t("common.loading")}</p>;

	return (
		<div className="mx-auto max-w-5xl">
			<Link
				to="/dashboards/cms"
				className="mb-4 inline-flex items-center gap-2 text-body-sm font-medium text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
			>
				{/* back points toward where the list sits, so it mirrors with the layout */}
				<ArrowLeftIcon className="size-4 rtl:-scale-x-100" aria-hidden />
				{t("cmsEditor.back")}
			</Link>

			{/* the save bar stays in reach on a long page */}
			<div className={`sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-4 ${cardClass}`}>
				<div className="min-w-0 flex-1">
					<h1 className="break-words text-heading-4 text-accent-deep">{page.label[lang]}</h1>
					<p className="text-body-sm text-primary-hover" role="status">
						{dirty
							? t("cmsEditor.unsaved")
							: saved
								? t("cmsEditor.saved", { version: page.version })
								: page.version > 0
									? t("cmsEditor.version", { version: page.version })
									: t("cmsPages.notSeeded")}
					</p>
				</div>
				{WEBSITE_URL && page.path && (
					<a
						href={`${WEBSITE_URL}${page.path}`}
						target="_blank"
						rel="noreferrer"
						className={smallSecondaryButtonClass}
					>
						<ArrowTopRightOnSquareIcon className="size-4 rtl:-scale-x-100" aria-hidden />
						{t("cmsEditor.viewOnWebsite")}
					</a>
				)}
				{page.version > 0 && (
					<button type="button" onClick={() => void openHistory()} className={smallSecondaryButtonClass}>
						<ClockIcon className="size-4" aria-hidden />
						{t("cmsEditor.history")}
					</button>
				)}
				<button
					type="button"
					onClick={() => void save()}
					disabled={saving || !dirty || !draft}
					className={submitButtonClass}
				>
					{saving ? t("common.saving") : t("cmsEditor.save")}
				</button>
			</div>

			{failure && failure !== "load" && (
				<div role="alert" className="mb-6 flex flex-wrap items-center gap-4 rounded-sm border border-error bg-surface p-4">
					<p className="flex-1 text-body-sm text-error">{t(`cmsEditor.failures.${failure}`)}</p>
					{failure === "stale" && (
						<button type="button" onClick={() => void load()} className={smallSecondaryButtonClass}>
							{t("cmsEditor.reload")}
						</button>
					)}
				</div>
			)}

			{history && (
				<section aria-labelledby="historyTitle" className={`mb-6 ${cardClass}`}>
					<div className="mb-3 flex items-center justify-between gap-4">
						<h2 id="historyTitle" className="text-heading-5 text-accent-deep">
							{t("cmsEditor.history")}
						</h2>
						<button type="button" onClick={() => setHistory(null)} className={smallSecondaryButtonClass}>
							{t("cmsEditor.closeHistory")}
						</button>
					</div>
					<p className="mb-3 text-body-sm text-foreground">{t("cmsEditor.historyHint")}</p>
					<ul className="flex flex-col divide-y divide-border-subtle">
						{history.map((rev) => (
							<li key={rev.id} className="flex flex-wrap items-center gap-4 py-3">
								<span className="flex-1 text-body-sm text-foreground">
									{t("cmsEditor.version", { version: rev.version })} · {date(rev.createdAt)} ·{" "}
									{rev.createdBy ?? t("cmsPages.snapshot")}
								</span>
								{rev.version === page.version ? (
									<span className="text-body-sm font-semibold text-accent-deep">{t("cmsEditor.current")}</span>
								) : (
									<button
										type="button"
										onClick={() => void restore(rev.id)}
										disabled={restoring !== null}
										className={smallSecondaryButtonClass}
									>
										{restoring === rev.id ? t("common.loading") : t("cmsEditor.loadVersion")}
									</button>
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{draft ? (
				<div className="flex flex-col gap-6">
					{Object.entries(page.schema.fields).map(([sectionKey, field]) => (
						<section key={sectionKey} className={cardClass}>
							{/* a section's card frames it; its fields follow its heading */}
							{field.type === "group" && (
								<h2 className="mb-5 border-s-3 border-primary ps-3 text-heading-5 text-accent-deep">
									{field.label[lang] || field.label.en}
								</h2>
							)}
							<FieldEditor
								field={field}
								value={draft[sectionKey]}
								path={[sectionKey]}
								onChange={onChange}
								issues={issueMap}
								lang={lang}
								bare={field.type === "group"}
							/>
						</section>
					))}
				</div>
			) : (
				<p className={`text-body-md text-foreground ${cardClass}`}>{t("cmsEditor.notSeededHelp")}</p>
			)}

			<ConfirmDialog
				open={blocker.state === "blocked"}
				title={t("cmsEditor.leaveTitle")}
				message={t("cmsEditor.leaveMessage")}
				confirmLabel={t("cmsEditor.leave")}
				cancelLabel={t("cmsEditor.stay")}
				onConfirm={() => blocker.proceed?.()}
				onCancel={() => blocker.reset?.()}
			/>
		</div>
	);
};

export default PageEditor;
