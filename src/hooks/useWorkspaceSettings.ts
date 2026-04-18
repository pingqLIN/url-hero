import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from '../types';

type UseWorkspaceSettingsParams = {
  demoMode: boolean;
  setDemoMode: Dispatch<SetStateAction<boolean>>;
  t: TFunction;
};

export function useWorkspaceSettings({ demoMode, setDemoMode, t }: UseWorkspaceSettingsParams) {
  const [showSettings, setShowSettings] = useState(false);
  const [demoAutoPlay, setDemoAutoPlay] = useState(true);
  const [showLogViewer, setShowLogViewer] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const groups = useMemo(
    () => [
      {
        title: t('settingsRuntimeGroup'),
        description: t('demoModeHint'),
        items: [
          { label: t('demoMode'), value: demoMode, setter: () => setDemoMode((previous) => !previous) },
          ...(demoMode ? [{ label: '自動播放動畫串場', value: demoAutoPlay, setter: () => setDemoAutoPlay((previous) => !previous) }] : []),
          { label: '顯示即時 Log 除錯窗口', value: showLogViewer, setter: () => setShowLogViewer((previous) => !previous) },
        ],
      },
    ],
    [demoMode, demoAutoPlay, showLogViewer, t],
  );

  return {
    groups,
    showSettings,
    setShowSettings,
    demoAutoPlay,
    setDemoAutoPlay,
    showLogViewer,
    setShowLogViewer,
  };
}
