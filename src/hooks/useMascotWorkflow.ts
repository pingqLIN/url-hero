import { useMemo, useState } from 'react';
import { buildDemoConceptResult, buildSystemPrompt, fetchConcept, fetchRegeneratedPrompt, fetchRegeneratedSection } from '../services/conceptService';
import { getReadableApiError } from '../services/errorService';
import { generateImage } from '../services/imageService';
import type { Locale } from '../i18n/messages';
import type { ConceptResult, MascotType, SectionKey, TFunction, WorkflowStage } from '../types';
import { buildConceptCacheKey, canonicalizeTargetUrl, isValidTargetUrl } from '../utils/workflow';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

type ApiConfig = {
  apiKey: string;
  keySource: 'builtin' | 'custom' | 'selected';
  model: string;
  provider: string;
};

type UseMascotWorkflowParams = {
  bgResultFlash: string | null;
  builtInGeminiKey: string;
  clearBgTimers: () => void;
  demoMode: boolean;
  demoImages: {
    animal: string;
    human: string;
    object: string;
    auto: string;
  };
  flashBackground: (flashImage: string, durationMs?: number) => Promise<void>;
  imageConfig: ApiConfig;
  locale: Locale;
  setWorkflowStage: (stage: WorkflowStage) => void;
  t: TFunction;
  textConfig: ApiConfig;
};

function buildMascotInstruction(mascotType: MascotType) {
  switch (mascotType) {
    case 'animal':
      return 'The mascot must be an animal character. Do not choose a human or an anthropomorphic object.';
    case 'human':
      return 'The mascot must be a human or humanoid character. Do not choose an animal or an anthropomorphic object.';
    case 'object':
      return 'The mascot must be an anthropomorphized object. Do not choose an animal or a human character.';
    default:
      return 'Choose the mascot archetype that best fits the website meaning and brand signal.';
  }
}

function buildAspectRatioInstruction(aspectRatio: string) {
  switch (aspectRatio) {
    case '16:9':
      return 'Composition Instruction: Compose the scene as a cinematic wide landscape frame (16:9), with broad horizontal staging, generous side-to-side environment coverage, and balanced negative space for a widescreen hero shot.';
    case '9:16':
      return 'Composition Instruction: Compose the scene as a tall vertical poster frame (9:16), with stacked focal hierarchy, strong upward flow, and clear top-to-bottom composition.';
    case '4:3':
      return 'Composition Instruction: Compose the scene in a classic 4:3 frame, with a balanced mid-distance composition and compact environmental storytelling.';
    case '3:4':
      return 'Composition Instruction: Compose the scene in a vertical 3:4 frame, with a portrait-oriented layout, clear vertical staging, and compact supporting details.';
    default:
      return 'Composition Instruction: Compose the scene for a square 1:1 frame, with centered balance, strong focal clarity, and even visual weight around the mascot.';
  }
}

function addPromptConstraints(
  prompt: string,
  aspectRatio: string,
  mascotType: MascotType,
  includeText: boolean,
  url: string,
) {
  let nextPrompt = prompt;

  nextPrompt += `\n\n${buildAspectRatioInstruction(aspectRatio)}`;

  if (includeText && url) {
    nextPrompt += `\n\nDesign Instruction: The URL "${url}" must be prominently displayed as a glowing neon hologram, shimmering and floating dynamically in the scene.`;
  } else {
    nextPrompt +=
      '\n\nDesign Constraint: Do not include any readable words, letters, logos, UI copy, signage, or typographic elements in the image.';
  }

  if (mascotType === 'animal') {
    nextPrompt += '\n\nCharacter Constraint: The mascot must clearly read as an animal character.';
  } else if (mascotType === 'human') {
    nextPrompt += '\n\nCharacter Constraint: The mascot must clearly read as a human or humanoid character.';
  } else if (mascotType === 'object') {
    nextPrompt += '\n\nCharacter Constraint: The mascot must clearly read as an anthropomorphized object.';
  }

  return nextPrompt;
}

import { removeWhiteBackground, compositeImages } from '../utils/imageUtils';

export function useMascotWorkflow({
  bgResultFlash,
  builtInGeminiKey,
  clearBgTimers,
  demoMode,
  demoImages,
  flashBackground,
  imageConfig,
  locale,
  setWorkflowStage,
  t,
  textConfig,
}: UseMascotWorkflowParams) {
  const [url, setUrl] = useState('');
  const [mascotType, setMascotType] = useState<MascotType>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConceptResult | null>(null);
  const [manualPrompt, setManualPrompt] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');
  const [previewCharacterImage, setPreviewCharacterImage] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [includeText, setIncludeText] = useState(true);
  const [imageText, setImageText] = useState('');

  const analysisLanguage = locale === 'zh-TW' ? 'Traditional Chinese used in Taiwan' : 'English';
  const mascotInstruction = useMemo(() => buildMascotInstruction(mascotType), [mascotType]);
  const promptText = result ? result.section6.content : manualPrompt;
  const effectivePromptText = useMemo(
    () => (promptText ? addPromptConstraints(promptText, aspectRatio, mascotType, includeText, url) : ''),
    [aspectRatio, includeText, mascotType, promptText, url],
  );
  const entryMorphProgress = Math.max(0, Math.min(1, (url.trim().length - 2) / 6));
  const normalizedUrl = useMemo(() => canonicalizeTargetUrl(url), [url]);
  const urlValidationError = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!isValidTargetUrl(trimmed)) return t('errorInvalidUrlFormat');
    return '';
  }, [t, url]);

  const getSessionCache = () => (typeof window === 'undefined' ? null : window.sessionStorage);

  const resolveGoogleTextKey = () =>
    textConfig.keySource === 'custom' ? textConfig.apiKey.trim() : builtInGeminiKey;
  const resolveGoogleImageKey = () =>
    imageConfig.keySource === 'custom' ? imageConfig.apiKey.trim() : builtInGeminiKey;
  const flashResultBackground = async () => {
    if (!bgResultFlash) {
      return;
    }

    await flashBackground(bgResultFlash);
    await delay(1000);
  };

  const resetConceptState = () => {
    clearBgTimers();
    setLoading(true);
    setError('');
    setStatusMessage('');
    setResult(null);
    setGeneratedImage('');
    setManualPrompt('');
    setCopied(false);
    setWorkflowStage('brief');
  };

  const handleEnterBriefStage = () => {
    if (!normalizedUrl) {
      setError(t('errorNoUrl'));
      setStatusMessage('');
      return false;
    }

    if (!isValidTargetUrl(normalizedUrl)) {
      setError(t('errorInvalidUrlFormat'));
      setStatusMessage('');
      return false;
    }

    setUrl(normalizedUrl);
    setError('');
    setStatusMessage('');
    setWorkflowStage('brief');
    return true;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch((copyError) => {
        console.error(t('errorCopy'), copyError);
        setError(t('errorCopy'));
      });
  };

  const handleContentChange = (section: SectionKey, newContent: string) => {
    setResult((previous) =>
      previous ? { ...previous, [section]: { ...previous[section], content: newContent } } : previous,
    );
  };

  const handleGenerateConcept = async () => {
    if (!normalizedUrl) {
      setError(t('errorNoUrl'));
      setStatusMessage('');
      return;
    }

    if (!isValidTargetUrl(normalizedUrl)) {
      setError(t('errorInvalidUrlFormat'));
      setStatusMessage('');
      return;
    }

    setUrl(normalizedUrl);

    const conceptCache = getSessionCache();
    const cacheKey = buildConceptCacheKey({
      locale,
      mascotType,
      model: textConfig.model,
      provider: textConfig.provider,
      url: normalizedUrl,
    });
    const cachedResult = conceptCache?.getItem(cacheKey);

    if (cachedResult && !demoMode) {
      try {
        setResult(JSON.parse(cachedResult));
        setGeneratedImage('');
        setManualPrompt('');
        setError('');
        setStatusMessage(t('resultFromCache'));
        setWorkflowStage('analysis');
        return;
      } catch {
        // Ignore cache parse errors and continue with live generation.
      }
    }

    resetConceptState();

    try {
      if (demoMode) {
        await delay(520);
        await flashResultBackground();
        setResult(buildDemoConceptResult({ locale, url: normalizedUrl }));
        setWorkflowStage('analysis');
        return;
      }

      if (textConfig.provider !== 'google') {
        throw new Error(t('errorCors'));
      }

      const apiKey = resolveGoogleTextKey();
      if (!apiKey) {
        throw new Error(t('errorNoApiKey'));
      }

      const nextResult = await fetchConcept({
        apiKey,
        model: textConfig.model,
        systemPrompt: buildSystemPrompt({
          analysisLanguage,
          mascotInstruction,
          t,
          url: normalizedUrl,
        }),
        t,
        url: normalizedUrl,
      });

      await flashResultBackground();
      setResult(nextResult);
      setStatusMessage('');
      setWorkflowStage('analysis');

      try {
        conceptCache?.setItem(cacheKey, JSON.stringify(nextResult));
      } catch {
        // Ignore cache write failures.
      }
    } catch (generationError) {
      setError(
        getReadableApiError({
          err: generationError,
          fallbackMessage: t('errorGenerateContent'),
          permissionMessage: t('errorPermissionDenied'),
          t,
        }),
      );
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePrompt = async (overrideMascotType?: MascotType) => {
    if (!result) return;

    setRegeneratingPrompt(true);
    setError('');
    setStatusMessage('');

    try {
      if (demoMode) {
        await delay(320);
        setResult((previous) =>
          previous
            ? {
                ...previous,
                section6: {
                  ...previous.section6,
                  content: `${previous.section6.content} Cinematic close-up variation, stronger character silhouette readability, premium product-ad framing.`,
                },
              }
            : previous,
        );
        setWorkflowStage('prompt');
        return;
      }

      if (textConfig.provider !== 'google') {
        throw new Error(t('errorCors'));
      }

      const apiKey = resolveGoogleTextKey();
      if (!apiKey) {
        throw new Error(t('errorNoApiKey'));
      }

      const instructionToUse = overrideMascotType ? buildMascotInstruction(overrideMascotType) : mascotInstruction;

      const nextPrompt = await fetchRegeneratedPrompt({
        apiKey,
        mascotInstruction: instructionToUse,
        model: textConfig.model,
        result,
        t,
        url: url.trim(),
      });

      setResult((previous) =>
        previous ? { ...previous, section6: { ...previous.section6, content: nextPrompt } } : previous,
      );
      setWorkflowStage('prompt');
    } catch (promptError) {
      setError(
        getReadableApiError({
          err: promptError,
          fallbackMessage: t('errorGeneratePrompt'),
          permissionMessage: t('errorPermissionDenied'),
          t,
        }),
      );
    } finally {
      setRegeneratingPrompt(false);
    }
  };

  const handleRegenerateSection = async (section: SectionKey) => {
    if (!result) return;
    
    // Using regeneratingPrompt state to disable all inputs while thinking
    setRegeneratingPrompt(true);
    setError('');
    setStatusMessage('');

    try {
      if (demoMode) {
        await delay(320);
        setResult((previous) =>
          previous
            ? {
                ...previous,
                [section]: {
                  ...previous[section],
                  content: `${previous[section].content} (Refined version)`,
                },
              }
            : previous,
        );
        return;
      }

      if (textConfig.provider !== 'google') {
        throw new Error(t('errorCors'));
      }

      const apiKey = resolveGoogleTextKey();
      if (!apiKey) {
        throw new Error(t('errorNoApiKey'));
      }

      const nextContent = await fetchRegeneratedSection({
        apiKey,
        model: textConfig.model,
        result,
        section,
        t,
        url: url.trim(),
      });

      setResult((previous) =>
        previous ? { ...previous, [section]: { ...previous[section], content: nextContent } } : previous,
      );
    } catch (regenError) {
      setError(
        getReadableApiError({
          err: regenError,
          fallbackMessage: t('errorGenerateContent'),
          permissionMessage: t('errorPermissionDenied'),
          t,
        }),
      );
    } finally {
      setRegeneratingPrompt(false);
    }
  };

  const handleGeneratePreviewImage = async () => {
    if (!promptText) {
      setStatusMessage('');
      setError(t('errorNoPrompt'));
      return;
    }

    const usingGoogleImage = imageConfig.provider === 'google';
    const resolvedGoogleImageKey = usingGoogleImage ? resolveGoogleImageKey() : '';

    if (usingGoogleImage && !resolvedGoogleImageKey) {
      setStatusMessage('');
      setError(t('errorNoApiKey'));
      return;
    }

    if (imageConfig.provider === 'openai' && !imageConfig.apiKey.trim()) {
      setStatusMessage('');
      setError(t('errorOpenAiKey'));
      return;
    }

    setGeneratingImage(true);
    setGeneratedImage('');
    setPreviewCharacterImage('');
    setError('');
    setStatusMessage('');
    clearBgTimers();
    setWorkflowStage('preview');

    try {
      if (demoMode) {
        await delay(3500);
        const demoImage =
          mascotType === 'animal'
            ? demoImages.animal
            : mascotType === 'human'
              ? demoImages.human
              : mascotType === 'object'
                ? demoImages.object
                : demoImages.auto;

        setGeneratedImage(demoImage);
        setPreviewCharacterImage(demoImage);
        return;
      }

      const characterOnlyBasePrompt = result
        ? `${result.section1.content}. ${result.section2.content}. ${result.section3.content}. ${result.section5.content}. CRITICAL: Isolated on a clean, solid white background, no environment, no background elements. CRITICAL LIGHTING MATCH: Provide dramatic and highly realistic dynamic lighting, strong rim light, and ambient occlusion so the 3D character has robust volume, depth, and blends flawlessly into a high-end composited scene.`
        : `${manualPrompt}. CRITICAL: Isolated on a clean, solid white background, no environment, no background elements. CRITICAL LIGHTING MATCH: Provide dramatic and highly realistic dynamic lighting, strong rim light, and ambient occlusion so the 3D character has robust volume, depth, and blends flawlessly into a high-end composited scene.`;
      const effectiveCharacterOnlyPrompt = addPromptConstraints(characterOnlyBasePrompt, aspectRatio, mascotType, includeText, url);

      const environmentOnlyBasePrompt = result
        ? `${result.section4.content}. ${result.section5.content}. CRITICAL: ONLY generate the background environment. NO characters, NO mascot, completely empty landscape/scene.`
        : `${manualPrompt}. CRITICAL: ONLY generate the background environment. NO characters, NO mascot, completely empty landscape/scene.`;
      const effectiveEnvironmentOnlyPrompt = addPromptConstraints(environmentOnlyBasePrompt, aspectRatio, mascotType, false, '');

      if (usingGoogleImage) {
        const [nextBgImageRaw, nextCharacterImageRaw] = await Promise.all([
          generateImage({
            apiKey: resolvedGoogleImageKey,
            aspectRatio,
            model: imageConfig.model,
            prompt: effectiveEnvironmentOnlyPrompt,
            provider: 'google',
            t,
          }),
          generateImage({
            apiKey: resolvedGoogleImageKey,
            aspectRatio,
            model: imageConfig.model,
            prompt: effectiveCharacterOnlyPrompt,
            provider: 'google',
            t,
          })
        ]);

        const nextCharacterImage = await removeWhiteBackground(nextCharacterImageRaw);
        const nextImage = await compositeImages(nextBgImageRaw, nextCharacterImage);

        setGeneratedImage(nextImage);
        setPreviewCharacterImage(nextCharacterImage);
        return;
      }

      const [nextBgImageRaw, nextCharacterImageRaw] = await Promise.all([
        generateImage({
          apiKey: imageConfig.apiKey.trim(),
          aspectRatio,
          model: imageConfig.model,
          prompt: effectiveEnvironmentOnlyPrompt,
          provider: 'openai',
          t,
        }),
        generateImage({
          apiKey: imageConfig.apiKey.trim(),
          aspectRatio,
          model: imageConfig.model,
          prompt: effectiveCharacterOnlyPrompt,
          provider: 'openai',
          t,
        })
      ]);

      const nextCharacterImage = await removeWhiteBackground(nextCharacterImageRaw);
      const nextImage = await compositeImages(nextBgImageRaw, nextCharacterImage);

      setGeneratedImage(nextImage);
      setPreviewCharacterImage(nextCharacterImage);
    } catch (imageError) {
      setError(
        getReadableApiError({
          err: imageError,
          fallbackMessage: t('errorImageGenerate'),
          permissionMessage: t('errorImagePermissionDenied'),
          t,
        }),
      );
      setStatusMessage('');
      setWorkflowStage('prompt');
    } finally {
      setGeneratingImage(false);
    }
  };

  const resetApplication = () => {
    setUrl('');
    setManualPrompt('');
    setResult(null);
    setGeneratedImage('');
    setPreviewCharacterImage('');
    setAspectRatio('1:1');
    setIncludeText(true);
    setMascotType('auto');
    setError('');
    setStatusMessage('');
    setCopied(false);
    setLoading(false);
    setGeneratingImage(false);
    setRegeneratingPrompt(false);
    setImageLoaded(false);
    setWorkflowStage('entry');
    clearBgTimers();
  };

  return {
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
    manualPrompt,
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
  };
}
