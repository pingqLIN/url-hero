import { Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { STANDARD_EASE } from '../constants';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

type FinalPreviewStageProps = {
  generatedImage: string;
  previewCharacterImage: string;
  generatingImage: boolean;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  promptText?: string;
  mascotType: string;
  t: TranslateFn;
};

function FinalPreviewStage({ generatedImage, previewCharacterImage, generatingImage, imageLoaded, setImageLoaded, promptText = '', mascotType, t }: FinalPreviewStageProps) {
  useEffect(() => {
    if (previewCharacterImage) {
      setImageLoaded(false);
      const img = new Image();
      img.src = previewCharacterImage;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageLoaded(true);
    } else {
      setImageLoaded(false);
    }
  }, [previewCharacterImage, setImageLoaded]);

  const showWaitingState = generatingImage || !previewCharacterImage || !imageLoaded;

  const handleDownloadTarget = (src: string, filename: string) => {
    if (!src || typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPrompt = () => {
    if (!promptText || typeof document === 'undefined') {
      return;
    }

    const blob = new Blob([promptText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'url-hero-prompt.md';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="relative flex h-full min-h-0 w-full items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {showWaitingState ? (
          <motion.div
            key="preview-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: STANDARD_EASE }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6"
          >
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/18 px-6 py-4 backdrop-blur-sm">
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  className="h-2.5 w-2.5 rounded-full bg-white/72"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.92, 1.08, 0.92] }}
                  transition={{
                    duration: 0.9,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: index * 0.18,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview-image"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: STANDARD_EASE }}
            className="absolute inset-x-0 bottom-[clamp(8px,4vh,40px)] z-20 flex justify-center pointer-events-none"
          >
            <div className="relative mb-[clamp(82px,16vh,202px)] sm:mb-[clamp(108px,20vh,244px)] flex justify-center">
              <motion.div
                data-robot="true"
                animate={{
                  y: [0, -20, 0],
                  rotate: mascotType === 'animal' || mascotType === 'object' ? [-2, 2, -2] : [-1, 1, -1],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: mascotType === 'animal' ? 3.5 : 4.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative flex justify-center"
              >
                <img
                  src={previewCharacterImage}
                  alt={t('mascotPreviewAlt')}
                  className="pointer-events-auto h-[clamp(200px,42vh,500px)] w-auto max-w-[100vw] object-contain object-bottom"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <div className="absolute left-[calc(100%+1rem)] sm:left-[calc(100%+2rem)] top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 pointer-events-auto max-w-[140px]">
                <button
                  type="button"
                  onClick={() => handleDownloadTarget(previewCharacterImage, 'url-hero-character-transparent.png')}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300/38 bg-amber-500/22 px-4 py-2 text-xs font-medium text-white shadow-[0_18px_40px_rgba(245,158,11,0.22)] backdrop-blur-md transition-all hover:border-amber-200/56 hover:bg-amber-400/32 whitespace-nowrap"
                >
                  <Download className="h-4 w-4 shrink-0 text-amber-100" />
                  <span>去背景圖檔</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTarget(generatedImage, 'url-hero-environment.png')}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300/38 bg-amber-500/22 px-4 py-2 text-xs font-medium text-white shadow-[0_18px_40px_rgba(245,158,11,0.22)] backdrop-blur-md transition-all hover:border-amber-200/56 hover:bg-amber-400/32 whitespace-nowrap"
                >
                  <Download className="h-4 w-4 shrink-0 text-amber-100" />
                  <span>帶環境圖檔</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPrompt}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300/38 bg-amber-500/22 px-4 py-2 text-xs font-medium text-white shadow-[0_18px_40px_rgba(245,158,11,0.22)] backdrop-blur-md transition-all hover:border-amber-200/56 hover:bg-amber-400/32 whitespace-nowrap"
                >
                  <Download className="h-4 w-4 shrink-0 text-amber-100" />
                  <span>提示詞 .md</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default FinalPreviewStage;
