import { Languages, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { STANDARD_EASE } from '../constants';
import type { Locale } from '../i18n/messages';
import type { TFunction } from '../types';
import LiquidGlass from './LiquidGlass';

type AppHeaderProps = {
  locale: Locale;
  onToggleLocale: () => void;
  onReset: () => void;
  t: TFunction;
  workflowStepper?: ReactNode;
};

function AppHeader({ locale, onToggleLocale, onReset, t, workflowStepper }: AppHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: STANDARD_EASE }}
      className="mb-6"
    >
      <LiquidGlass as="div" variant="compact" className="app-header-glass px-4 py-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <Sparkles className="h-4 w-4 text-white/78" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.26em] text-white/88">URL HERO</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/68 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('reset')}
              </button>
              <button
                type="button"
                onClick={onToggleLocale}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/68 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <Languages className="h-3.5 w-3.5" />
                {locale === 'en' ? t('traditionalChinese') : t('english')}
              </button>
            </div>
          </div>
          {workflowStepper ? <div>{workflowStepper}</div> : null}
        </div>
      </LiquidGlass>
    </motion.header>
  );
}

export default AppHeader;
