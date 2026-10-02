import { f, type ChoiceField } from '../schema/fields';

/**
 * Icons a content manager may pick for a card. The website draws each one; a
 * name it doesn't know can't be stored, so a new icon is a website change first.
 */
export const ICONS = [
  ['activity', 'نبض', 'Activity'],
  ['arrow-left-right', 'سهمان متعاكسان', 'Two-way arrows'],
  ['award', 'وسام', 'Award'],
  ['badge-check', 'شارة تحقق', 'Verified badge'],
  ['bolt', 'برق', 'Lightning bolt'],
  ['book', 'كتاب', 'Book'],
  ['book-open', 'كتاب مفتوح', 'Open book'],
  ['briefcase', 'حقيبة عمل', 'Briefcase'],
  ['briefcase-business', 'حقيبة أعمال', 'Business briefcase'],
  ['building', 'مبنى', 'Building'],
  ['building-2', 'مبنى مكاتب', 'Office building'],
  ['calendar', 'تقويم', 'Calendar'],
  ['calendar-days', 'تقويم الأيام', 'Calendar days'],
  ['check-circle', 'علامة صح', 'Check mark'],
  ['clipboard', 'حافظة أوراق', 'Clipboard'],
  ['cog', 'ترس', 'Cog'],
  ['cpu', 'معالج', 'Processor'],
  ['cpu-chip', 'شريحة', 'Chip'],
  ['database', 'قاعدة بيانات', 'Database'],
  ['eye', 'عين', 'Eye'],
  ['file-signature', 'مستند موقّع', 'Signed document'],
  ['file-text', 'مستند', 'Document'],
  ['flag', 'علم', 'Flag'],
  ['flask-conical', 'دورق', 'Flask'],
  ['gavel', 'مطرقة القاضي', 'Gavel'],
  ['globe', 'كرة أرضية', 'Globe'],
  ['graduation-cap', 'قبعة تخرج', 'Graduation cap'],
  ['handshake', 'مصافحة', 'Handshake'],
  ['heart', 'قلب', 'Heart'],
  ['info', 'معلومة', 'Info'],
  ['layers', 'طبقات', 'Layers'],
  ['leaf', 'ورقة نبات', 'Leaf'],
  ['library', 'مكتبة', 'Library'],
  ['lightbulb', 'مصباح', 'Light bulb'],
  ['megaphone', 'مكبر صوت', 'Megaphone'],
  ['monitor', 'شاشة', 'Monitor'],
  ['monitor-cog', 'شاشة وترس', 'Monitor with cog'],
  ['monitor-play', 'شاشة عرض', 'Presentation screen'],
  ['network', 'شبكة', 'Network'],
  ['pen-tool', 'قلم تصميم', 'Pen tool'],
  ['rocket', 'صاروخ', 'Rocket'],
  ['scale', 'ميزان', 'Scales'],
  ['search-check', 'بحث وتحقق', 'Search with check'],
  ['server', 'خادم', 'Server'],
  ['settings', 'إعدادات', 'Settings'],
  ['shield-alert', 'درع تنبيه', 'Shield alert'],
  ['shield-check', 'درع', 'Shield'],
  ['sparkles', 'بريق', 'Sparkles'],
  ['target', 'هدف', 'Target'],
  ['users', 'أشخاص', 'People'],
  ['wifi', 'شبكة لاسلكية', 'Wireless'],
] as const satisfies readonly (readonly [string, string, string])[];

export type IconName = (typeof ICONS)[number][0];

/** An icon picker over the whole set. */
export const icon = (): ChoiceField => f.choice(['الأيقونة', 'Icon'], ICONS);
