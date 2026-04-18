import { motion } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { MessageKey } from '../i18n/messages';

type ToggleItem = {
  label: string;
  value: boolean;
  setter: (v: boolean) => void;
};

type ToggleGroup = {
  title: string;
  description?: string;
  items: ToggleItem[];
};

function SettingsPanel({
  showSettings,
  setShowSettings,
  groups,
  demoMode,
  workflowStage,
  setWorkflowStage,
  t,
}: {
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  groups: ToggleGroup[];
  demoMode: boolean;
  workflowStage?: string;
  setWorkflowStage?: (stage: any) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  if (!showSettings) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={() => setShowSettings(false)}
      />

      <motion.aside
        initial={{ opacity: 0, x: 28, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 28, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-6 right-6 z-[51] w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.5rem] border border-white/10 bg-slate-950/78 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.38)] backdrop-blur-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="h-4 w-4 text-amber-300" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/88">
                {t('additionalSettings')}
              </h2>
            </div>
            <p className="text-[11px] leading-relaxed text-white/38">
              {t('additionalSettingsHint')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('closeSettings')}
            onClick={() => setShowSettings(false)}
            className="rounded-lg p-1 text-white/32 transition-colors hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.title} className="space-y-2.5">
              <div className="space-y-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/62">
                  {group.title}
                </h3>
                {group.description && (
                  <p className="text-[10px] leading-relaxed text-white/34">{group.description}</p>
                )}
              </div>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.setter(!item.value)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-left transition-all duration-200 hover:border-white/14 hover:bg-white/[0.06]"
                  >
                    <span className="text-xs font-medium text-white/72">{item.label}</span>
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                        item.value ? 'bg-amber-700' : 'bg-slate-700/80'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition duration-200 ${
                          item.value ? 'translate-x-[18px]' : 'translate-x-1'
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {demoMode && (
          <div className="mt-4 space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/90 mb-1">
              演示階段切換
            </h3>
            <div className="flex flex-wrap gap-2">
              {['entry', 'brief', 'analysis', 'prompt', 'preview'].map(stage => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setWorkflowStage?.(stage)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
                    workflowStage === stage
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-amber-500/20 text-amber-100/70 hover:bg-amber-500/40 hover:text-white'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
            <p className="text-[10px] leading-relaxed text-amber-100/82 pt-2 border-t border-amber-500/20">
              {t('demoModeHint')}
            </p>
          </div>
        )}
      </motion.aside>
    </>
  );
}

export default SettingsPanel;
