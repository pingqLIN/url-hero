import { Check, Pencil, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import AppBackdrop from './components/AppBackdrop';
import AppFooter from './components/AppFooter';
import AppHeader from './components/AppHeader';
import ErrorBanner from './components/ErrorBanner';
import FloatingSettingsButton from './components/FloatingSettingsButton';
import KeyConfigPanel from './components/KeyConfigPanel';
import LogViewer from './components/LogViewer';
import SettingsPanel from './components/SettingsPanel';
import UrlInputBar from './components/UrlInputBar';
import WorkflowStepper from './components/WorkflowStepper';
import BriefSection from './sections/BriefSection';
import ConceptSection from './sections/ConceptSection';
import FinalPreviewStage from './sections/FinalPreviewStage';
import HeroSection from './sections/HeroSection';
import PreviewSection from './sections/PreviewSection';
import WorkspaceStage from './sections/WorkspaceStage';
import { STANDARD_EASE } from './constants';
import { useBgFlash } from './hooks/useBgFlash';
import { useApiKeyConfig } from './hooks/useApiKeyConfig';
import { useKeyDetection } from './hooks/useKeyDetection';
import { useMascotWorkflow } from './hooks/useMascotWorkflow';
import { useWorkflow } from './hooks/useWorkflow';
import { useWorkspaceSettings } from './hooks/useWorkspaceSettings';
import { useI18n } from './i18n/useI18n';
import type { ProviderApiKeyMap } from './types';
import heroActive from '../HERO/AB.png';
import heroIdle from '../HERO/AA2.png';
import heroWorkspace from '../HERO/A.png';
import bgDepthMap from '../HERO/BG_00_Z.png';
import tb00 from '../HERO/TB_00.jpg';
import tb01 from '../HERO/TB_01.jpg';
import tb02 from '../HERO/TB_02.jpg';
import tb03 from '../HERO/TB_03.jpg';
import tb04 from '../HERO/TB_04.jpg';
import tb05 from '../HERO/TB_05.jpg';

const builtInApiKeys: ProviderApiKeyMap = {
  google:
    (process.env as Record<string, string | undefined>).API_KEY ||
    (process.env as Record<string, string | undefined>).GEMINI_API_KEY ||
    '',
  openai: (process.env as Record<string, string | undefined>).OPENAI_API_KEY || '',
  anthropic: (process.env as Record<string, string | undefined>).ANTHROPIC_API_KEY || '',
};

const hasBuiltInKey = Object.values(builtInApiKeys).some(Boolean);
const APP_BG_SEQUENCE = [tb00, tb01, tb02, tb03, tb04, tb05];
const DEMO_IMAGES = {
  animal: heroActive,
  human: heroWorkspace,
  object: heroIdle,
  auto: heroWorkspace,
} as const;

export default function App() {
  const { locale, setLocale, t } = useI18n();
  const { demoMode, setDemoMode, hasPaidKey, isAiStudioEnvironment, handleSelectKey } = useKeyDetection(hasBuiltInKey);
  const textConfig = useApiKeyConfig('text', builtInApiKeys, hasPaidKey, isAiStudioEnvironment);
  const imageConfig = useApiKeyConfig('image', builtInApiKeys, hasPaidKey, isAiStudioEnvironment);
  const { bgOverride, flashBackground, clearBgTimers } = useBgFlash();
  const {
    stage: workflowStage,
    setStage: setWorkflowStage,
    stageIndex: workflowStageIndex,
    steps: workflowSteps,
    jumpToStage,
  } = useWorkflow(t);
  const { groups, showSettings, setShowSettings, showLogViewer, setShowLogViewer } = useWorkspaceSettings({
    demoMode,
    setDemoMode,
    t,
  });
  const {
    aspectRatio,
    copied,
    entryMorphProgress,
    effectivePromptText,
    error,
    statusMessage,
    generatedImage,
    previewCharacterImage,
    generatingImage,
    imageLoaded,
    handleContentChange,
    handleCopy,
    handleEnterBriefStage,
    handleGenerateConcept,
    handleGeneratePreviewImage,
    handleRegeneratePrompt,
    handleRegenerateSection,
    resetApplication,
    imageText,
    includeText,
    loading,
    mascotType,
    promptText,
    regeneratingPrompt,
    result,
    setAspectRatio,
    setError,
    setImageLoaded,
    setImageText,
    setIncludeText,
    setManualPrompt,
    setMascotType,
    setUrl,
    url,
    urlValidationError,
  } = useMascotWorkflow({
    bgResultFlash: null,
    builtInApiKeys,
    clearBgTimers,
    demoMode,
    demoImages: DEMO_IMAGES,
    flashBackground,
    imageConfig,
    locale,
    setWorkflowStage,
    t,
    textConfig,
  });
  const [entryTransitionActive, setEntryTransitionActive] = useState(false);
  const [isWorkspaceUrlEditing, setIsWorkspaceUrlEditing] = useState(false);
  const [isEditingConcept, setIsEditingConcept] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [workspaceUrlDraft, setWorkspaceUrlDraft] = useState('');
  const transitionTimerRef = useRef<number[]>([]);

  const contentStageActive = workflowStage !== 'entry';
  const briefStageActive = workflowStage === 'brief';
  const entryInlineError = error === t('errorNoUrl') || error === t('errorInvalidUrlFormat') ? error : '';
  const isBusy = loading || regeneratingPrompt || generatingImage || entryTransitionActive || (generatedImage !== '' && !imageLoaded);

  useEffect(() => {
    return () => {
      for (const timerId of transitionTimerRef.current) {
        window.clearTimeout(timerId);
      }
      transitionTimerRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isWorkspaceUrlEditing) {
      setWorkspaceUrlDraft(url);
    }
  }, [isWorkspaceUrlEditing, url]);

  useEffect(() => {
    if (workflowStage === 'preview') {
      setShowSettings(false);
    }
  }, [setShowSettings, workflowStage]);

  const handleEnterBriefStageWithTransition = () => {
    if (!handleEnterBriefStage()) {
      return;
    }

    for (const timerId of transitionTimerRef.current) {
      window.clearTimeout(timerId);
    }
    transitionTimerRef.current = [];
    setEntryTransitionActive(true);
    setUiVisible(false);

    const finishTransitionTimer = window.setTimeout(() => {
      setEntryTransitionActive(false);
      setUiVisible(true);
    }, 2000);

    transitionTimerRef.current = [finishTransitionTimer];
  };

  const handleSaveWorkspaceUrl = () => {
    setUrl(workspaceUrlDraft.replace(/^https?:\/\//, '').trim());
    setIsWorkspaceUrlEditing(false);
  };

  const handleJumpToStage = (nextStage: typeof workflowStage) => {
    if (nextStage === 'preview' && !generatedImage && !generatingImage) {
      return;
    }

    jumpToStage(nextStage);
  };

  return (
    <div className="app-viewport relative overflow-hidden bg-slate-950 text-white selection:bg-amber-500/30">
      <style>{`[data-temp-top="true"] { position: relative !important; z-index: 9999 !important; }`}</style>
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <defs>
          <filter id="header-liquid-glass-surface" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blurred_source" />
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
            <feDisplacementMap in="blurred_source" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="liquid-glass-surface" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="hero-liquid-distort" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.032" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="11" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.35" />
          </filter>
        </defs>
      </svg>

      <AppBackdrop
        bgDepthMap={bgDepthMap}
        bgOverride={bgOverride}
        bgSequence={APP_BG_SEQUENCE}
        previewMode={workflowStage === 'preview'}
        isBusy={isBusy}
        isEditingConcept={isEditingConcept}
      />
      <AnimatePresence>
        {isBusy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: STANDARD_EASE }}
            className="pointer-events-none absolute inset-0 z-[5] bg-black/40"
          />
        )}
      </AnimatePresence>
      <motion.div
        animate={{ opacity: uiVisible ? 1 : 0 }}
        transition={{ duration: 0.6, ease: STANDARD_EASE }}
        className={uiVisible ? '' : 'pointer-events-none'}
      >
        {workflowStage !== 'preview' ? <FloatingSettingsButton onClick={() => setShowSettings(true)} t={t} /> : null}

        <AnimatePresence>
          <SettingsPanel
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            demoMode={demoMode}
            groups={groups}
            workflowStage={workflowStage}
            setWorkflowStage={setWorkflowStage}
            t={t}
          />
        </AnimatePresence>

        <main className="app-viewport relative z-10 overflow-hidden">
          <div className="mx-auto flex h-full max-w-7xl flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <AppHeader
              locale={locale}
              onToggleLocale={() => setLocale(locale === 'en' ? 'zh-TW' : 'en')}
              onReset={resetApplication}
              t={t}
              workflowStepper={
                workflowStage === 'entry' ? null : (
                  <WorkflowStepper
                    leadItem={
                      <div className="rounded-[1.35rem] border border-white/28 bg-white/[0.08] p-3 text-left shadow-[0_12px_32px_rgba(15,23,42,0.2)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/36">01</div>
                            {isWorkspaceUrlEditing ? (
                              <div className="mt-1 flex items-start gap-2">
                                <div className="relative grid min-w-0 max-w-full">
                                  <div 
                                    className="invisible col-start-1 row-start-1 whitespace-pre-wrap break-all line-clamp-2 text-sm font-semibold"
                                    aria-hidden="true"
                                  >
                                    {workspaceUrlDraft + '\u200B'}
                                  </div>
                                  <textarea
                                    value={workspaceUrlDraft}
                                    onChange={(event) => setWorkspaceUrlDraft(event.target.value.replace(/\n/g, ''))}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleSaveWorkspaceUrl();
                                      }
                                      if (event.key === 'Escape') {
                                        setWorkspaceUrlDraft(url);
                                        setIsWorkspaceUrlEditing(false);
                                      }
                                    }}
                                    className="col-start-1 row-start-1 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none"
                                    aria-label={t('targetWebsite')}
                                    rows={1}
                                    autoFocus
                                    onFocus={(e) => {
                                      const val = e.target.value;
                                      e.target.value = '';
                                      e.target.value = val;
                                    }}
                                  />
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleSaveWorkspaceUrl}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/78 transition-colors hover:bg-white/[0.1] hover:text-white"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWorkspaceUrlDraft(url);
                                      setIsWorkspaceUrlEditing(false);
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/48 transition-colors hover:bg-white/[0.08] hover:text-white/76"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 flex items-start justify-between gap-3">
                                <div className="line-clamp-2 break-all text-sm font-semibold text-white">{url}</div>
                                <button
                                  type="button"
                                  onClick={() => setIsWorkspaceUrlEditing(true)}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/48 transition-colors hover:bg-white/[0.08] hover:text-white/78"
                                  aria-label={t('targetWebsite')}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
                        </div>
                      </div>
                    }
                    steps={workflowSteps.slice(1)}
                    currentStage={workflowStage}
                    stageIndex={workflowStageIndex}
                    hasResult={Boolean(result)}
                    indexOffset={1}
                    columns={5}
                    onJumpToStage={handleJumpToStage}
                  />
                )
              }
            />

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                <AnimatePresence mode="wait">
                  {workflowStage === 'entry' ? (
                    <motion.div
                      key="entry"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: STANDARD_EASE }}
                      className="h-full"
                    >
                      <HeroSection
                        url={url}
                        entryMorphProgress={entryMorphProgress}
                        heroIdle={heroIdle}
                        heroActive={heroActive}
                        renderUrlInputBar={() => (
                          <UrlInputBar
                            variant="hero"
                            url={url}
                            setUrl={setUrl}
                            loading={loading}
                            error={error}
                            inlineError={entryInlineError}
                            urlValidationError={urlValidationError}
                            onSubmit={handleEnterBriefStageWithTransition}
                            onClearError={() => setError('')}
                            t={t}
                          />
                        )}
                        t={t}
                      />
                    </motion.div>
                  ) : workflowStage === 'preview' ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: STANDARD_EASE }}
                      className="h-full"
                    >
                      <FinalPreviewStage
                        generatedImage={generatedImage}
                        previewCharacterImage={previewCharacterImage}
                        generatingImage={generatingImage}
                        imageLoaded={imageLoaded}
                        setImageLoaded={setImageLoaded}
                        promptText={effectivePromptText}
                        mascotType={mascotType}
                        t={t}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="workspace"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: STANDARD_EASE }}
                      className="h-full"
                    >
                      <WorkspaceStage
                      briefSection={
                        workflowStage === 'brief' ? (
                          <BriefSection
                            briefStageActive={briefStageActive}
                            workflowStageIndex={workflowStageIndex}
                            url={url}
                            provider={textConfig.provider}
                            setProvider={textConfig.setProvider}
                            model={textConfig.model}
                            setModel={textConfig.setModel}
                            mascotType={mascotType}
                            setMascotType={setMascotType}
                            loading={loading}
                            demoMode={demoMode}
                            renderKeyConfig={() => (
                              <KeyConfigPanel
                                isAiStudioEnvironment={isAiStudioEnvironment}
                                provider={textConfig.provider}
                                keySource={textConfig.keySource}
                                setKeySource={textConfig.setKeySource}
                                keyValue={textConfig.apiKey}
                                setKeyValue={textConfig.setApiKey}
                                builtInApiKeys={builtInApiKeys}
                                hasPaidKey={hasPaidKey}
                                onSelectKey={handleSelectKey}
                                t={t}
                              />
                            )}
                            onGenerate={handleGenerateConcept}
                            t={t}
                          />
                        ) : null
                      }
                      conceptSection={
                        workflowStage === 'brief' ? null : (
                          <ConceptSection
                            contentStageActive={contentStageActive}
                            mascotType={mascotType}
                            setMascotType={setMascotType}
                            loading={loading}
                            result={result}
                            url={url}
                            effectivePromptText={effectivePromptText}
                            promptText={promptText}
                            copied={copied}
                            regeneratingPrompt={regeneratingPrompt}
                            onContentChange={handleContentChange}
                            onManualPromptChange={setManualPrompt}
                            onCopy={handleCopy}
                            onRegeneratePrompt={handleRegeneratePrompt}
                            onRegenerateSection={handleRegenerateSection}
                            onEditingChange={setIsEditingConcept}
                            renderWorkflowStepper={() => (
                              <WorkflowStepper
                              steps={workflowSteps}
                              currentStage={workflowStage}
                              stageIndex={workflowStageIndex}
                              hasResult={Boolean(result)}
                              onJumpToStage={handleJumpToStage}
                            />
                          )}
                          t={t}
                          />
                        )
                      }
                      previewSection={
                        workflowStage === 'brief' ? null : (
                          <PreviewSection
                            previewStageActive={workflowStage === 'prompt'}
                            imageProvider={imageConfig.provider}
                            setImageProvider={imageConfig.setProvider}
                            imageModel={imageConfig.model}
                            setImageModel={imageConfig.setModel}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            includeText={includeText}
                            setIncludeText={setIncludeText}
                            imageText={imageText}
                            setImageText={setImageText}
                            generatingImage={generatingImage}
                            promptText={effectivePromptText}
                            demoMode={demoMode}
                            renderKeyConfig={() => (
                              <KeyConfigPanel
                                isAiStudioEnvironment={isAiStudioEnvironment}
                                provider={imageConfig.provider}
                                keySource={imageConfig.keySource}
                                setKeySource={imageConfig.setKeySource}
                                keyValue={imageConfig.apiKey}
                                setKeyValue={imageConfig.setApiKey}
                                builtInApiKeys={builtInApiKeys}
                                hasPaidKey={hasPaidKey}
                                onSelectKey={handleSelectKey}
                                t={t}
                              />
                            )}
                            onGenerate={handleGeneratePreviewImage}
                            t={t}
                          />
                        )
                      }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <ErrorBanner
                message={statusMessage}
                tone="info"
                visible={Boolean(statusMessage) && workflowStage !== 'entry' && workflowStage !== 'preview'}
              />
              <ErrorBanner message={error} visible={Boolean(error) && workflowStage !== 'entry' && workflowStage !== 'preview'} />
              {workflowStage !== 'preview' ? <AppFooter locale={locale} t={t} /> : null}
            </div>
          </div>
        </main>
      </motion.div>
      <AnimatePresence>
        {entryTransitionActive ? (
          <motion.div
            key="entry-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: STANDARD_EASE }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/16 px-5 py-3 backdrop-blur-sm">
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  className="h-2.5 w-2.5 rounded-full bg-white/70"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.92, 1.08, 0.92] }}
                  transition={{
                    duration: 0.9,
                    ease: 'easeInOut',
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 0.18,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {showLogViewer && <LogViewer onClose={() => setShowLogViewer(false)} />}
      </AnimatePresence>
    </div>
  );
}
