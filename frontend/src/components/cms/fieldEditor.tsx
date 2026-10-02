import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	DocumentArrowUpIcon,
	PhotoIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { uploadMedia } from "../../api/siteContent";
import { mediaUrl } from "../../lib/media";
import type { Field, Localized } from "../../types/siteContent";
import { blankValue, listBounds, pathKey, type Path } from "../../utils/siteContent";
import { inputClass, smallSecondaryButtonClass } from "../../styles/form";

type Lang = "ar" | "en";

type EditorProps = {
	field: Field;
	value: unknown;
	path: Path;
	onChange: (path: Path, value: unknown) => void;
	/** The server's issue codes by path. */
	issues: Map<string, string>;
	lang: Lang;
};

const idOf = (path: Path) => `field-${path.join("-")}`;

const labelOf = (label: Localized, lang: Lang) => label[lang] || label.en || label.ar;

const iconButtonClass =
	"inline-flex size-9 items-center justify-center rounded-sm text-accent-deep transition-colors duration-150 ease-out hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";

/** The label, help and server issue around one value input. */
const FieldShell = ({
	id,
	label,
	help,
	issue,
	children,
	as = "div",
}: {
	id: string;
	label: string;
	help?: string;
	issue?: string;
	children: ReactNode;
	as?: "div" | "fieldset";
}) => {
	const { t } = useTranslation();
	const Wrapper = as;
	const Label = as === "fieldset" ? "legend" : "label";

	return (
		<Wrapper className="flex min-w-0 flex-col gap-2">
			<Label
				{...(as === "div" ? { htmlFor: id } : {})}
				className="text-body-sm font-medium text-accent-deep"
			>
				{label}
			</Label>
			{children}
			{help && <p className="text-caption text-primary-hover">{help}</p>}
			{/* §39 — the message carries the meaning, not the colour alone */}
			{issue && (
				<p role="alert" className="text-body-sm text-error">
					{t(`cmsEditor.issues.${issue}`, { defaultValue: t("cmsEditor.issues.default") })}
				</p>
			)}
		</Wrapper>
	);
};

/** Text in both website languages, side by side where there is room. */
const LocalizedInput = ({ field, value, path, onChange, issues, lang }: EditorProps) => {
	const { t } = useTranslation();
	if (field.type !== "text") return null;
	const text = (value ?? { ar: "", en: "" }) as Localized;
	const issue = issues.get(pathKey(path));
	const id = idOf(path);

	const input = (half: Lang) => {
		const halfId = `${id}-${half}`;
		const common = {
			id: halfId,
			dir: half === "ar" ? "rtl" : "ltr",
			lang: half,
			value: text[half],
			"aria-invalid": !!issue,
			onChange: (e: { target: { value: string } }) => onChange(path, { ...text, [half]: e.target.value }),
		} as const;
		return (
			<div className="flex min-w-0 flex-col gap-1">
				<label htmlFor={halfId} className="text-caption text-primary-hover">
					{t(half === "ar" ? "cmsEditor.arabic" : "cmsEditor.english")}
				</label>
				{field.multiline ? (
					<textarea
						{...common}
						rows={Math.min(10, Math.max(3, Math.ceil(text[half].length / 90)))}
						className={`${inputClass(!!issue)} h-auto py-3 leading-relaxed`}
					/>
				) : (
					<input type="text" {...common} className={inputClass(!!issue)} />
				)}
			</div>
		);
	};

	return (
		<FieldShell
			as="fieldset"
			id={id}
			label={`${labelOf(field.label, lang)}${field.optional ? ` (${t("cmsEditor.optional")})` : ""}`}
			help={field.help && labelOf(field.help, lang)}
			issue={issue}
		>
			<div className="grid gap-3 lg:grid-cols-2">
				{input("ar")}
				{input("en")}
			</div>
		</FieldShell>
	);
};

/** An image or PDF: what is stored now, and a button to replace it. */
const MediaInput = ({ field, value, path, onChange, issues, lang }: EditorProps) => {
	const { t } = useTranslation();
	const [uploading, setUploading] = useState(false);
	const [failed, setFailed] = useState(false);
	if (field.type !== "image" && field.type !== "file") return null;

	const url = (value as string) ?? "";
	const isImage = field.type === "image";
	const id = idOf(path);

	const upload = async (file: File | undefined) => {
		if (!file) return;
		setUploading(true);
		setFailed(false);
		try {
			onChange(path, await uploadMedia(file));
		} catch {
			setFailed(true);
		} finally {
			setUploading(false);
		}
	};

	return (
		<FieldShell
			id={id}
			label={`${labelOf(field.label, lang)}${field.optional ? ` (${t("cmsEditor.optional")})` : ""}`}
			help={field.help && labelOf(field.help, lang)}
			issue={issues.get(pathKey(path))}
		>
			<div className="flex flex-wrap items-center gap-4">
				{isImage ? (
					url ? (
						<img
							src={mediaUrl(url)}
							alt=""
							className="h-20 w-32 shrink-0 rounded-sm border border-border object-cover"
						/>
					) : (
						<span className="inline-flex h-20 w-32 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-primary-hover">
							<PhotoIcon className="size-6" aria-hidden />
							<span className="sr-only">{t("cmsEditor.noImage")}</span>
						</span>
					)
				) : url ? (
					<a
						href={mediaUrl(url)}
						target="_blank"
						rel="noreferrer"
						dir="ltr"
						className="max-w-full truncate text-body-sm font-medium text-primary-hover underline-offset-4 hover:text-accent-deep hover:underline"
					>
						{url.split("/").pop()}
					</a>
				) : (
					<span className="text-body-sm text-primary-hover">{t("cmsEditor.noFile")}</span>
				)}

				<label className={`cursor-pointer ${smallSecondaryButtonClass}`}>
					{isImage ? <PhotoIcon className="size-4" aria-hidden /> : <DocumentArrowUpIcon className="size-4" aria-hidden />}
					{uploading ? t("cmsEditor.uploading") : t(isImage ? "cmsEditor.uploadImage" : "cmsEditor.uploadFile")}
					<input
						id={id}
						type="file"
						className="sr-only"
						disabled={uploading}
						accept={isImage ? "image/png,image/jpeg,image/webp,image/gif" : "application/pdf"}
						onChange={(e) => {
							void upload(e.target.files?.[0]);
							e.target.value = "";
						}}
					/>
				</label>

				{field.optional && url && (
					<button type="button" onClick={() => onChange(path, "")} className={smallSecondaryButtonClass}>
						{t("cmsEditor.remove")}
					</button>
				)}
			</div>
			{failed && (
				<p role="alert" className="text-body-sm text-error">
					{t("cmsEditor.uploadFailed")}
				</p>
			)}
		</FieldShell>
	);
};

/** A list of like items; a fixed one can't gain or lose items, a repeatable one can within its bounds. */
const ListEditor = ({ field, value, path, onChange, issues, lang }: EditorProps) => {
	const { t } = useTranslation();
	if (field.type !== "list") return null;
	const items = (value as unknown[]) ?? [];
	const { fixed, min, max } = listBounds(field);
	const itemName = labelOf(field.itemLabel, lang);
	const issue = issues.get(pathKey(path));

	const move = (from: number, to: number) => {
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		onChange(path, next);
	};

	return (
		<FieldShell
			as="fieldset"
			id={idOf(path)}
			label={labelOf(field.label, lang)}
			help={field.help && labelOf(field.help, lang)}
			issue={issue}
		>
			{!fixed && (
				<p className="text-caption text-primary-hover">
					{max === Infinity
						? t("cmsEditor.listMin", { count: min })
						: t("cmsEditor.listRange", { min, max })}
				</p>
			)}
			<ol className="flex flex-col gap-3">
				{items.map((item, index) => (
					<li key={index} className="rounded-sm border border-border bg-surface p-4">
						<div className="mb-3 flex items-center justify-between gap-2">
							<span className="text-body-sm font-semibold text-foreground">
								{itemName} {index + 1}
							</span>
							{!fixed && (
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => move(index, index - 1)}
										disabled={index === 0}
										aria-label={t("cmsEditor.moveUp", { item: `${itemName} ${index + 1}` })}
										className={iconButtonClass}
									>
										<ArrowUpIcon className="size-4" aria-hidden />
									</button>
									<button
										type="button"
										onClick={() => move(index, index + 1)}
										disabled={index === items.length - 1}
										aria-label={t("cmsEditor.moveDown", { item: `${itemName} ${index + 1}` })}
										className={iconButtonClass}
									>
										<ArrowDownIcon className="size-4" aria-hidden />
									</button>
									<button
										type="button"
										onClick={() => onChange(path, items.filter((_, i) => i !== index))}
										disabled={items.length <= min}
										aria-label={t("cmsEditor.removeItem", { item: `${itemName} ${index + 1}` })}
										className={iconButtonClass}
									>
										<TrashIcon className="size-4" aria-hidden />
									</button>
								</div>
							)}
						</div>
						<FieldEditor
							field={field.item}
							value={item}
							path={[...path, index]}
							onChange={onChange}
							issues={issues}
							lang={lang}
							bare
						/>
					</li>
				))}
			</ol>
			{!fixed && items.length < max && (
				<button
					type="button"
					onClick={() => onChange(path, [...items, blankValue(field.item)])}
					className={`self-start ${smallSecondaryButtonClass}`}
				>
					<PlusIcon className="size-4" aria-hidden />
					{t("cmsEditor.addItem", { item: itemName })}
				</button>
			)}
		</FieldShell>
	);
};

/**
 * Renders one field of a page's schema and everything under it. `bare` drops a
 * group's frame and label, for a list item whose card already frames it.
 */
const FieldEditor = (props: EditorProps & { bare?: boolean }) => {
	const { t } = useTranslation();
	const { field, value, path, onChange, issues, lang, bare } = props;
	const id = idOf(path);
	const issue = issues.get(pathKey(path));
	const label = `${labelOf(field.label, lang)}${"optional" in field && field.optional ? ` (${t("cmsEditor.optional")})` : ""}`;
	const help = field.help && labelOf(field.help, lang);

	switch (field.type) {
		case "group": {
			const body = (
				<div className="flex flex-col gap-5">
					{Object.entries(field.fields).map(([key, child]) => (
						<FieldEditor
							key={key}
							field={child}
							value={(value as Record<string, unknown> | null)?.[key]}
							path={[...path, key]}
							onChange={onChange}
							issues={issues}
							lang={lang}
						/>
					))}
				</div>
			);
			if (bare) return body;
			return (
				<fieldset className="flex min-w-0 flex-col gap-4 rounded-sm border border-border p-4">
					<legend className="px-1 text-body-md font-semibold text-accent-deep">{label}</legend>
					{help && <p className="text-caption text-primary-hover">{help}</p>}
					{body}
				</fieldset>
			);
		}

		case "list":
			return <ListEditor {...props} />;

		case "text":
			return <LocalizedInput {...props} />;

		case "image":
		case "file":
			return <MediaInput {...props} />;

		case "string":
			return (
				<FieldShell id={id} label={label} help={help} issue={issue}>
					<input
						id={id}
						type={field.format === "date" ? "date" : "text"}
						dir="ltr"
						value={(value as string) ?? ""}
						onChange={(e) => onChange(path, e.target.value)}
						aria-invalid={!!issue}
						className={`${inputClass(!!issue)} text-start`}
					/>
				</FieldShell>
			);

		case "number":
			return (
				<FieldShell id={id} label={label} help={help} issue={issue}>
					<input
						id={id}
						type="number"
						dir="ltr"
						step={field.integer ? 1 : "any"}
						value={value === null || value === undefined ? "" : String(value)}
						onChange={(e) => onChange(path, e.target.value === "" ? null : Number(e.target.value))}
						aria-invalid={!!issue}
						className={`${inputClass(!!issue)} max-w-48`}
					/>
				</FieldShell>
			);

		case "boolean":
			return (
				<div className="flex flex-col gap-2">
					<label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-body-md text-foreground">
						<input
							id={id}
							type="checkbox"
							checked={value === true}
							onChange={(e) => onChange(path, e.target.checked)}
							className="size-4 accent-primary"
						/>
						{label}
					</label>
					{help && <p className="text-caption text-primary-hover">{help}</p>}
				</div>
			);

		case "choice":
			return (
				<FieldShell id={id} label={label} help={help} issue={issue}>
					<select
						id={id}
						value={(value as string) ?? ""}
						onChange={(e) => onChange(path, e.target.value)}
						aria-invalid={!!issue}
						className={`${inputClass(!!issue)} max-w-md`}
					>
						{field.options.map((option) => (
							<option key={option.value} value={option.value}>
								{labelOf(option.label, lang)}
							</option>
						))}
					</select>
				</FieldShell>
			);
	}
};

export default FieldEditor;
