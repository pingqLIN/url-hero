import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { STANDARD_EASE } from '../constants';
import type { Locale } from '../i18n/messages';
import type { TFunction } from '../types';
import LiquidGlass from './LiquidGlass';

type AppFooterProps = {
  locale: Locale;
  t: TFunction;
};

type FooterPanelKey = 'docs' | 'privacy';

type FooterPanelContent = {
  intro: string;
  references: Array<{ href: string; label: string }>;
  sections: Array<{
    body: string[];
    heading: string;
  }>;
  title: string;
};

const footerContent: Record<Locale, Record<FooterPanelKey, FooterPanelContent>> = {
  en: {
    docs: {
      title: 'Documentation',
      intro:
        'This app turns a target URL into a mascot concept, then walks through concept generation, prompt editing, and preview rendering in one browser-first workflow.',
      sections: [
        {
          heading: 'What this project does',
          body: [
            'Generate a six-part mascot brief from a URL, including concept, character design, props, environment, lighting, and a final English image prompt.',
            'Support live text generation with Google Gemini and preview image generation with Gemini image models or OpenAI DALL·E.',
          ],
        },
        {
          heading: 'How to use it',
          body: [
            'Enter a valid domain or URL, choose the mascot type if you want to force the direction, and generate the concept.',
            'Refine the prompt, adjust image settings, then render a preview image in the final stage.',
          ],
        },
        {
          heading: 'Project structure',
          body: [
            'The app is built with React 19, TypeScript, Motion, and Vite.',
            'Core workflow logic lives in hooks and services, while the visual shell is handled by stage sections and shared components.',
          ],
        },
        {
          heading: 'Operational notes',
          body: [
            'Text concepts can be cached in sessionStorage for the current browser session when the generation scope matches.',
            'Demo mode uses built-in sample data and does not make live provider requests.',
          ],
        },
      ],
      references: [
        { label: 'Project repository', href: 'https://github.com/pingqLIN/url-hero' },
        {
          label: 'GitHub Docs: About READMEs',
          href: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
        },
      ],
    },
    privacy: {
      title: 'Privacy',
      intro:
        'This screen summarizes how the current browser app handles URLs, prompts, API keys, and generated output. It is a product-level summary, not legal advice.',
      sections: [
        {
          heading: 'Data you enter',
          body: [
            'The app processes the target URL, prompt text, optional image text, selected provider/model settings, and any generated image returned to the browser.',
            'If you type a custom API key, it is kept in client-side React state for the active session in this browser tab.',
          ],
        },
        {
          heading: 'How requests are handled',
          body: [
            'Live text generation requests are sent to Google Gemini from the browser when Google is selected.',
            'Preview image requests are sent from the browser to the selected provider, such as Google Gemini or OpenAI image generation endpoints.',
          ],
        },
        {
          heading: 'Local storage and persistence',
          body: [
            'Matching concept results can be cached in sessionStorage to speed up repeated concept generation within the same browser session.',
            'This repo does not implement a user account system or a server-side database for saving your concepts in the current frontend flow.',
          ],
        },
        {
          heading: 'Your controls',
          body: [
            'You can avoid custom keys by using built-in or selected shared keys when available, or refresh the page to clear in-memory key state.',
            'If you do not want concept caching, close the browser tab or clear site storage for this app.',
          ],
        },
      ],
      references: [
        { label: 'Project repository', href: 'https://github.com/pingqLIN/url-hero' },
        {
          label: 'GitHub General Privacy Statement',
          href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
        },
      ],
    },
  },
  'zh-TW': {
    docs: {
      title: '文件',
      intro:
        '這個 app 會把目標網址轉成 mascot 概念，再用單一瀏覽器工作流完成概念生成、prompt 編修與預覽圖輸出。',
      sections: [
        {
          heading: '專案用途',
          body: [
            '根據 URL 生成六段式 mascot brief，包含核心概念、角色設定、道具、環境、光線與最後的英文圖像 prompt。',
            '支援 Google Gemini 文字生成，以及 Gemini 圖像模型或 OpenAI DALL·E 的預覽圖輸出。',
          ],
        },
        {
          heading: '使用流程',
          body: [
            '輸入有效網址後，可先指定 mascot 類型，再生成概念內容。',
            '之後可編修 prompt、調整圖像設定，最後在預覽階段生成圖片。',
          ],
        },
        {
          heading: '專案結構',
          body: [
            '前端使用 React 19、TypeScript、Motion 與 Vite。',
            '核心流程邏輯集中在 hooks 與 services，畫面結構則由各 stage section 與共用元件組成。',
          ],
        },
        {
          heading: '執行補充',
          body: [
            '當生成條件一致時，文字概念結果可能會暫存在 sessionStorage，加快同一瀏覽器工作階段內的重複操作。',
            'Demo mode 只使用內建示範資料，不會送出即時 provider 請求。',
          ],
        },
      ],
      references: [
        { label: '專案 repository', href: 'https://github.com/pingqLIN/url-hero' },
        {
          label: 'GitHub Docs：About READMEs',
          href: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
        },
      ],
    },
    privacy: {
      title: '隱私',
      intro:
        '這裡整理的是目前瀏覽器版 app 對網址、prompt、API key 與生成結果的處理方式。它是產品層級摘要，不是法律意見。',
      sections: [
        {
          heading: '你輸入的資料',
          body: [
            'app 會處理目標 URL、prompt 文字、可選的圖片文字、所選 provider/model 設定，以及最後回到瀏覽器中的生成圖片。',
            '若你手動輸入自訂 API key，它只會保留在目前分頁的前端 React state 中。',
          ],
        },
        {
          heading: '請求如何送出',
          body: [
            '當使用 Google 時，文字生成請求會直接從瀏覽器送到 Google Gemini。',
            '預覽圖請求也會直接從瀏覽器送到所選 provider，例如 Google Gemini 或 OpenAI 圖像生成端點。',
          ],
        },
        {
          heading: '本機儲存與保存',
          body: [
            '符合條件的概念結果可能會暫存於 sessionStorage，用來加快同一瀏覽器工作階段中的重複生成。',
            '目前這個 repo 的前端流程沒有使用者帳號系統，也沒有後端資料庫去長期保存你的概念內容。',
          ],
        },
        {
          heading: '你的控制方式',
          body: [
            '若環境提供共享 key，你可以不輸入自訂 key；若想清掉暫存中的 key 狀態，可直接重新整理頁面。',
            '若不希望保留概念快取，可關閉分頁或清除本網站儲存資料。',
          ],
        },
      ],
      references: [
        { label: '專案 repository', href: 'https://github.com/pingqLIN/url-hero' },
        {
          label: 'GitHub General Privacy Statement',
          href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
        },
      ],
    },
  },
};

function AppFooter({ locale, t }: AppFooterProps) {
  const [activePanel, setActivePanel] = useState<FooterPanelKey | null>(null);
  const panelContent = useMemo(
    () => (activePanel ? footerContent[locale][activePanel] : null),
    [activePanel, locale],
  );

  return (
    <>
      <footer className="mx-auto mt-6 mb-6 max-w-max">
        <LiquidGlass as="div" variant="compact" className="px-6 py-2.5 flex flex-col items-center justify-between gap-4 sm:flex-row shadow-[0_8px_32px_rgba(2,6,20,0.4)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/50">
            {t('footerPoweredBy')}
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActivePanel('docs')}
              className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white/80"
            >
              {t('docs')}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel('privacy')}
              className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white/80"
            >
              {t('privacy')}
            </button>
          </div>
        </LiquidGlass>
      </footer>

      <AnimatePresence>
        {panelContent && (
          <>
            <motion.button
              type="button"
              aria-label="Close footer panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: STANDARD_EASE }}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => setActivePanel(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.28, ease: STANDARD_EASE }}
              className="fixed inset-x-4 bottom-4 z-[51] mx-auto w-full max-w-4xl"
            >
              <LiquidGlass as="article" variant="panel" className="max-h-[min(78vh,760px)] overflow-hidden px-6 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                  <div className="space-y-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/38">
                      {activePanel === 'docs' ? t('docs') : t('privacy')}
                    </div>
                    <h2 className="text-xl font-semibold text-white/92">{panelContent.title}</h2>
                    <p className="max-w-2xl text-sm leading-7 text-white/62">{panelContent.intro}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/54 transition-colors hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-6 overflow-y-auto pr-1 [scrollbar-width:thin] max-h-[calc(min(78vh,760px)-140px)]">
                  {panelContent.sections.map((section) => (
                    <section key={section.heading} className="space-y-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/56">
                        {section.heading}
                      </h3>
                      <div className="space-y-2">
                        {section.body.map((paragraph) => (
                          <p key={paragraph} className="text-sm leading-7 text-white/72">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}

                  <section className="space-y-3 border-t border-white/8 pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/56">References</h3>
                    <div className="flex flex-col gap-2">
                      {panelContent.references.map((reference) => (
                        <a
                          key={reference.href}
                          href={reference.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {reference.label}
                        </a>
                      ))}
                    </div>
                  </section>
                </div>
              </LiquidGlass>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default AppFooter;
