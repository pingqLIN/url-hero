import {
  Check,
  Copy,
  Dices,
  Edit2,
  Lightbulb,
  Map,
  Paintbrush,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CustomSelect } from '../components/CustomSelect';
import { GLASS_PANEL_CLS, IMAGE_MODEL_NAMES, LABEL_CLS, SELECT_CLS, STANDARD_EASE } from '../constants';
import type { ConceptResult, MascotType, SectionKey } from '../types';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

type ConceptSectionProps = {
  contentStageActive: boolean;
  mascotType: MascotType;
  setMascotType: (value: MascotType) => void;
  loading: boolean;
  result: ConceptResult | null;
  url: string;
  effectivePromptText: string;
  promptText: string;
  copied: boolean;
  regeneratingPrompt: boolean;
  onContentChange: (section: SectionKey, content: string) => void;
  onManualPromptChange: (value: string) => void;
  onCopy: (text: string) => void;
  onRegeneratePrompt: (overrideMascotType?: MascotType) => Promise<void> | void;
  onRegenerateSection: (section: SectionKey) => Promise<void> | void;
  onEditingChange?: (isEditing: boolean) => void;
  renderWorkflowStepper: () => ReactNode;
  t: TranslateFn;
};

const sectionCards = [
  {
    key: 'section1' as const,
    titleKey: 'coreConcept' as const,
    icon: Lightbulb,
    frameClass: 'border-amber-400/25',
    iconClass: 'text-amber-400',
    colSpanClass: 'md:col-span-2',
  },
  {
    key: 'section2' as const,
    titleKey: 'characterSubject' as const,
    icon: Wand2,
    frameClass: 'border-amber-300/25',
    iconClass: 'text-amber-300',
    colSpanClass: '',
  },
  {
    key: 'section3' as const,
    titleKey: 'equipment' as const,
    icon: Paintbrush,
    frameClass: 'border-emerald-400/25',
    iconClass: 'text-emerald-400',
    colSpanClass: '',
  },
  {
    key: 'section4' as const,
    titleKey: 'environment' as const,
    icon: Map,
    frameClass: 'border-yellow-300/25',
    iconClass: 'text-yellow-300',
    colSpanClass: '',
  },
  {
    key: 'section5' as const,
    titleKey: 'lighting' as const,
    icon: Sparkles,
    frameClass: 'border-sky-400/25',
    iconClass: 'text-sky-400',
    colSpanClass: '',
  },
];

function buildConceptSignature(result: ConceptResult, mascotType: string) {
  return [
    result.section1.content,
    result.section2.content,
    result.section3.content,
    result.section4.content,
    result.section5.content,
    mascotType,
  ].join('\u241f');
}

function ConceptSection({
  contentStageActive,
  mascotType,
  setMascotType,
  loading,
  result,
  url,
  effectivePromptText,
  promptText,
  copied,
  regeneratingPrompt,
  onContentChange,
  onManualPromptChange,
  onCopy,
  onRegeneratePrompt,
  onRegenerateSection,
  onEditingChange,
  renderWorkflowStepper,
  t,
}: ConceptSectionProps) {
  const [editingSections, setEditingSections] = useState<Partial<Record<SectionKey, boolean>>>({});
  const [activeTab, setActiveTab] = useState<'concept' | 'prompt'>('concept');
  const [conceptPromptSyncSignature, setConceptPromptSyncSignature] = useState('');
  const previousMascotTypeRef = useRef<MascotType>(mascotType);
  const hasResult = Boolean(result);
  const conceptDirty = Boolean(result) && buildConceptSignature(result, mascotType) !== conceptPromptSyncSignature;

  const isEditingAny = Object.values(editingSections).some(Boolean);

  useEffect(() => {
    onEditingChange?.(isEditingAny);
  }, [isEditingAny, onEditingChange]);

  useEffect(() => {
    setEditingSections({});
  }, [loading, url, hasResult]);

  useEffect(() => {
    setActiveTab(hasResult ? 'concept' : 'prompt');
  }, [hasResult, url]);

  useEffect(() => {
    if (!result) {
      setConceptPromptSyncSignature('');
      return;
    }

    setConceptPromptSyncSignature(buildConceptSignature(result, mascotType));
  }, [hasResult, result?.section6.content, url, mascotType]);

  const toggleSectionEditing = (section: SectionKey) => {
    setEditingSections((previous) => ({ ...previous, [section]: !previous[section] }));
  };

  const handleSaveConceptEdits = async () => {
    if (!result || !conceptDirty) {
      return;
    }

    setEditingSections((previous) => ({
      ...previous,
      section1: false,
      section2: false,
      section3: false,
      section4: false,
      section5: false,
    }));

    await onRegeneratePrompt();
    setActiveTab('prompt');
  };

  useEffect(() => {
    if (previousMascotTypeRef.current !== mascotType) {
      previousMascotTypeRef.current = mascotType;
      if (hasResult) {
        // Use a small timeout to ensure state has updated in the parent
        setTimeout(() => {
          void onRegeneratePrompt();
          setActiveTab('prompt');
        }, 0);
      }
    }
  }, [mascotType, hasResult, onRegeneratePrompt]);

  const renderSectionControls = (section: SectionKey, sectionLabel: string) => {
    const isEditing = Boolean(editingSections[section]);
    const editButtonLabel = isEditing
      ? t('saveSection', { section: sectionLabel })
      : t('editSection', { section: sectionLabel });

    return (
      <div className="flex items-center gap-2">
        {section !== 'section6' && (
          <button
            type="button"
            onClick={() => onRegenerateSection(section)}
            aria-label={t('regenSectionInstruction')}
            title={t('regenSectionInstruction')}
            disabled={regeneratingPrompt || isEditing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/56 transition-colors hover:border-white/18 hover:text-white/84 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Dices className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => toggleSectionEditing(section)}
          aria-label={editButtonLabel}
          title={editButtonLabel}
          disabled={regeneratingPrompt}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/56 transition-colors hover:border-white/18 hover:text-white/84 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEditing ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
        </button>
      </div>
    );
  };

  return (
    <motion.section
      initial={false}
      animate={{ opacity: contentStageActive ? 1 : 0.92, y: contentStageActive ? 0 : 2 }}
      transition={{ duration: 0.5, ease: STANDARD_EASE }}
      className={`group ${GLASS_PANEL_CLS} p-4 sm:p-5 ${
        contentStageActive ? 'border-white/24 shadow-[0_22px_64px_rgba(15,23,42,0.24)]' : 'border-white/10'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/75">
            {result ? t('workflowStepAnalysis') : t('workflowStepPrompt')}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white/92">
            {result ? t('resultStudioTitle') : t('readyToCreate')}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/42">
            {result ? t('resultStudioDesc') : t('readyHint')}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
          {result ? url : '—'}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="relative flex min-h-[290px] flex-col items-center justify-center rounded-[1.6rem] border border-white/8 bg-white/[0.03]">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border border-white/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-t border-amber-400" />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-amber-300" />
            </div>
            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
              {t('analyzing')}
            </p>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab('concept')}
                className={`rounded-[1.2rem] border px-4 py-3 text-left transition-all duration-200 ${
                  activeTab === 'concept'
                    ? 'border-white/26 bg-white/[0.08] shadow-[0_12px_28px_rgba(15,23,42,0.16)]'
                    : 'border-white/10 bg-white/[0.03] text-white/64 hover:border-white/16 hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">Tab 01</div>
                <div className="mt-1 text-sm font-semibold text-white/86">{t('workflowStepAnalysis')}</div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`rounded-[1.2rem] border px-4 py-3 text-left transition-all duration-200 ${
                  activeTab === 'prompt'
                    ? 'border-white/26 bg-white/[0.08] shadow-[0_12px_28px_rgba(15,23,42,0.16)]'
                    : 'border-white/10 bg-white/[0.03] text-white/64 hover:border-white/16 hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">Tab 02</div>
                <div className="mt-1 text-sm font-semibold text-white/86">{t('aiVisualPrompt')}</div>
              </button>
            </div>

            {activeTab === 'concept' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="space-y-0.5">
                    <span className={LABEL_CLS}>{t('mascotType')}</span>
                    <p className="text-[10px] text-white/34">{t('mascotTypeHint')}</p>
                  </div>
                  <CustomSelect
                    value={mascotType}
                    onChange={(val) => setMascotType(val as MascotType)}
                    className={`${SELECT_CLS} !w-auto !border-0 !py-0 text-right font-semibold text-amber-300`}
                    title={t('mascotType')}
                    aria-label={t('mascotType')}
                    options={[
                      { value: 'auto', label: t('mascotAuto') },
                      { value: 'animal', label: t('mascotAnimal') },
                      { value: 'human', label: t('mascotHuman') },
                      { value: 'object', label: t('mascotObject') },
                    ]}
                  />
                </div>

                {conceptDirty ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveConceptEdits}
                      disabled={regeneratingPrompt}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/[0.14] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-400/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('saveAndRegeneratePrompt')}
                    </button>
                  </div>
                ) : null}

                {sectionCards
                  .filter((section) => section.key === 'section1')
                  .map((section) => {
                    const Icon = section.icon;
                    const isEditing = Boolean(editingSections[section.key]);
                    const title = t(section.titleKey);
                    const content = result[section.key].content;

                    return (
                      <article
                        key={section.key}
                        className={`rounded-[1.5rem] border bg-slate-950/38 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.2)] backdrop-blur-md ${section.frameClass}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Icon className={`h-4 w-4 ${section.iconClass}`} />
                            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/74">
                              {title}
                            </h3>
                          </div>
                          {renderSectionControls(section.key, title)}
                        </div>

                        {isEditing ? (
                          <textarea
                            value={content}
                            onChange={(event) => onContentChange(section.key, event.target.value)}
                            aria-label={title}
                            className="min-h-[138px] w-full rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/72 outline-none transition-colors focus:border-amber-500/35"
                          />
                        ) : (
                          <p className="text-sm leading-relaxed text-white/62">{content}</p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {(result.section1.keywords || []).map((keyword, index) => (
                            <span
                              key={`${keyword}-${index}`}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/52"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </article>
                    );
                  })}

                <div className="grid gap-4 md:grid-cols-2">
                  {sectionCards
                    .filter((section) => section.key !== 'section1')
                    .map((section) => {
                      const Icon = section.icon;
                      const isEditing = Boolean(editingSections[section.key]);
                      const title = t(section.titleKey);
                      const content = result[section.key].content;

                      return (
                        <article
                          key={section.key}
                          className={`rounded-[1.5rem] border bg-slate-950/38 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.2)] backdrop-blur-md ${section.frameClass} ${section.colSpanClass}`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <Icon className={`h-4 w-4 ${section.iconClass}`} />
                              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/74">
                                {title}
                              </h3>
                            </div>
                            {renderSectionControls(section.key, title)}
                          </div>

                          {isEditing ? (
                            <textarea
                              value={content}
                              onChange={(event) => onContentChange(section.key, event.target.value)}
                              aria-label={title}
                              className="min-h-[160px] w-full rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/72 outline-none transition-colors focus:border-amber-500/35"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed text-white/62">{content}</p>
                          )}
                        </article>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className={LABEL_CLS}>{t('aiVisualPrompt')}</span>
                    <p className="text-xs leading-relaxed text-white/42">{t('workflowStepPromptDesc')}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onRegeneratePrompt}
                      disabled={regeneratingPrompt}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/55 transition-colors hover:text-white/84 disabled:opacity-40"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${regeneratingPrompt ? 'animate-spin' : ''}`} />
                      {t('regenerate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopy(effectivePromptText)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/55 transition-colors hover:text-white/84"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? t('copied') : t('copyPrompt')}
                    </button>
                    {renderSectionControls('section6', t('aiVisualPrompt'))}
                  </div>
                </div>

                {editingSections.section6 ? (
                  <textarea
                    value={promptText}
                    onChange={(event) => {
                      if (result) {
                        onContentChange('section6', event.target.value);
                        return;
                      }

                      onManualPromptChange(event.target.value);
                    }}
                    placeholder={!result ? t('enterPromptHere') : ''}
                    title={t('aiVisualPrompt')}
                    aria-label={t('aiVisualPrompt')}
                    className="min-h-[320px] w-full rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[11px] leading-relaxed text-white/70 outline-none transition-colors focus:border-amber-500/35"
                  />
                ) : (
                  <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/48 px-4 py-3 font-mono text-[11px] leading-relaxed text-white/66 whitespace-pre-wrap">
                    {effectivePromptText}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[290px] flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-transparent px-6 py-10 text-center">
            <Paintbrush className="h-9 w-9 text-amber-300/75" />
            <p className="mt-4 text-sm font-semibold text-white/82">{t('readyToCreate')}</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/42">{t('readyHint')}</p>
            <div className="mt-6 w-full max-w-[24rem]">{renderWorkflowStepper()}</div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

export default ConceptSection;
