'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Level, Word } from '@/lib/types';
import {
  getDictionary,
  TranslationKey,
  Dictionary,
  Locale,
  supportedLocales,
} from '@/lib/translations';

// =================================================================
// ============== NEW AUDIO ENGINE =================================
// =================================================================

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, AudioBuffer | 'loading' | 'failed'> = new Map();
  private uiSounds = ['success', 'error', 'completed'];

  private async initializeContext() {
    if (this.audioContext || typeof window === 'undefined') return;

    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      if (this.audioContext.state === 'suspended') {
        const resume = () => {
          this.audioContext?.resume();
          window.removeEventListener('click', resume);
          window.removeEventListener('touchstart', resume);
        };
        window.addEventListener('click', resume);
        window.addEventListener('touchstart', resume);
      }
    } catch (e) {
      console.error('Web Audio API is not supported in this browser', e);
    }
  }

  public async preloadUISounds(): Promise<void> {
    await this.initializeContext();
    const promises = this.uiSounds.map((sound) =>
      this.loadAudio(sound, `/${sound}.wav`)
    );
    await Promise.all(promises);
  }

  public async loadAudio(key: string, path: string): Promise<void> {
    await this.initializeContext();
    if (!this.audioContext || this.audioCache.has(key)) {
      return;
    }

    this.audioCache.set(key, 'loading');

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio: ${path}, status: ${response.status}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioCache.set(key, audioBuffer);
    } catch (e) {
      console.error(`Failed to load audio from path: ${path}`, e);
      this.audioCache.set(key, 'failed');
    }
  }

  public playSound(key: string): void {
    if (!this.audioContext) {
      console.warn('AudioContext not initialized. Cannot play sound.');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const audioBuffer = this.audioCache.get(key);

    if (audioBuffer instanceof AudioBuffer) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      } catch (e) {
        console.error(`Error playing sound '${key}':`, e);
      }
    } else if (audioBuffer === 'loading') {
      setTimeout(() => this.playSound(key), 100);
    }
  }
}

const audioManager = new AudioEngine();

// =================================================================
// ============== END AUDIO ENGINE =================================
// =================================================================

export type GameMode = 'it-en' | 'study' | 'en-it';
export type View = 'landing' | 'level';

const MAX_LEVELS_PER_PAGE = 12;
const dir = (lang: string): 'ltr' | 'rtl' => (lang === 'he' ? 'rtl' : 'ltr');

interface AppContextType {
  view: View;
  level: Level | null;
  startLevel: (level: Level) => void;
  endLevel: (completedLevel: Level | null) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  playSound: (sound: 'success' | 'error' | 'completed' | string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  allLevels: Level[];
  levelRanges: { value: string; label: string }[];
  levelsByRange: { [key: string]: Level[] };
  loadAudioForLevel: (
    levelId: number,
    onProgress?: (p: number) => void
  ) => Promise<void>;
  levelToScrollTo: number | null;
  setLevelToScrollTo: (id: number | null) => void;
  lang: Locale;
  setLang: (lang: Locale) => void;
  dictionary: Dictionary;
  t: (key: TranslationKey | string, values?: Record<string, string | number>) => string;
  isHydrated: boolean;
  direction: 'ltr' | 'rtl';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentLangParam = searchParams.get('lang') as Locale | null;
  const currentLang =
    currentLangParam && supportedLocales.includes(currentLangParam)
      ? currentLangParam
      : 'en';

  const [lang, setLangInternal] = useState<Locale>(currentLang);
  const [dictionary, setDictionary] = useState<Dictionary>({} as Dictionary);
  const [isHydrated, setIsHydrated] = useState(false);
  const [view, setView] = useState<View>('landing');
  const [level, setLevel] = useState<Level | null>(null);
  const [levelToScrollTo, setLevelToScrollToInternal] = useState<number | null>(null);
  const [gameMode, setGameModeInternal] = useState<GameMode>('it-en');
  const [activeTab, setActiveTabInternal] = useState('1-12');
  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [levelsByRange, setLevelsByRange] = useState<{ [key: string]: Level[] }>({});
  const [levelRanges, setLevelRanges] = useState<{ value: string; label: string }[]>([]);

  // Sync lang with URL params (WORKING APP PATTERN)
  useEffect(() => {
    if (currentLang !== lang) {
      setLangInternal(currentLang);
    }
  }, [currentLang, lang]);

  // Dictionary loading (WORKING APP PATTERN)
  useEffect(() => {
    let isMounted = true;
    getDictionary(lang).then((d: Dictionary) => {
      if (isMounted) {
        setDictionary(d);
        if (!isHydrated) setIsHydrated(true);
      }
    });
    return () => { isMounted = false; };
  }, [lang, isHydrated]);

  // Document lang/dir (WORKING APP PATTERN)
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir(lang);
  }, [lang]);

  // Preload UI sounds
  useEffect(() => {
    audioManager.preloadUISounds();
  }, []);

  // Load levels for current lang
  useEffect(() => {
    let cancelled = false;
    async function loadLevels() {
      try {
        const basePath = `/data/${lang}`;
        const levels: Level[] = [];

        // Try index.json first
        try {
          const indexRes = await fetch(`${basePath}/index.json`);
          if (indexRes.ok) {
            const indexData = await indexRes.json();
            if (Array.isArray(indexData.files)) {
              for (const file of indexData.files) {
                try {
                  const res = await fetch(`${basePath}/${file}`);
                  if (!res.ok) continue;
                  const data = await res.json();
                  if (Array.isArray(data.levels)) {
                    levels.push(...data.levels);
                  }
                } catch {
                  // ignore individual file errors
                }
              }
              if (cancelled) return;
              setAllLevels(levels);
            }
          }
        } catch {
          // ignore missing index.json
        }

        // Fallback files
        const fallbackFiles = ['levels1-12.json', 'levels13-24.json', 'levels25-32.json'];
        for (const file of fallbackFiles) {
          try {
            const res = await fetch(`${basePath}/${file}`);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data.levels)) {
              levels.push(...data.levels);
            }
          } catch {
            // ignore
          }
        }

        if (cancelled) return;

        setAllLevels(levels);
        const totalGeneratedLevels = levels.length;
        const ranges: { value: string; label: string }[] = [];
        const numTabs = Math.ceil(totalGeneratedLevels / MAX_LEVELS_PER_PAGE);

        for (let i = 0; i < numTabs; i++) {
          const start = i * MAX_LEVELS_PER_PAGE + 1;
          const end = Math.min((i + 1) * MAX_LEVELS_PER_PAGE, totalGeneratedLevels);
          ranges.push({ value: `${start}-${end}`, label: `${start}-${end}` });
        }

        setLevelRanges(ranges);

        const newLevelsByRange: { [key: string]: Level[] } = {};
        for (const range of ranges) {
          const [start, end] = range.value.split('-').map(Number);
          newLevelsByRange[range.value] = levels.filter((l) => l.id >= start && l.id <= end);
        }
        setLevelsByRange(newLevelsByRange);

        if (ranges.length > 0) {
          setActiveTabInternal(ranges[0].value);
        }
      } catch (e) {
        console.error('Failed to load levels:', e);
      }
    }

    loadLevels();
    return () => { cancelled = true; };
  }, [lang]);

  const playSound = useCallback((key: string) => {
    audioManager.playSound(key);
  }, []);

  const loadAudioForLevel = useCallback(async (levelId: number, onProgress?: (p: number) => void) => {
    const levelToLoad = allLevels.find((l) => l.id === levelId);
    if (!levelToLoad) return;

    const wordsToLoad = (levelToLoad.words || []) as Word[];
    if (wordsToLoad.length === 0) {
      if (onProgress) onProgress(100);
      return;
    }

    const loadPromises: Promise<void>[] = [];
    for (const word of wordsToLoad) {
      const cacheKey = word.filename;
      const audioPath = `/audio/Italian/${cacheKey}.wav`;
      loadPromises.push(audioManager.loadAudio(cacheKey, audioPath));
    }

    if (!onProgress) {
      await Promise.all(loadPromises);
    } else {
      let loadedCount = 0;
      const totalToLoad = loadPromises.length;
      if (totalToLoad === 0) {
        onProgress(100);
        return;
      }

      const reportProgress = () => {
        loadedCount++;
        const progress = Math.round((loadedCount / totalToLoad) * 100);
        onProgress(progress);
      };

      for (const promise of loadPromises) {
        promise.then(reportProgress, reportProgress);
      }
      await Promise.all(loadPromises);
    }
  }, [allLevels]);

  const setLang = useCallback((newLang: Locale) => {
    setLangInternal(newLang);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (newLang === 'en') {
      current.delete('lang');
    } else {
      current.set('lang', newLang);
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';
    
    router.push(`${pathname}${query}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const startLevel = useCallback((selectedLevel: Level) => {
    if (selectedLevel.words && selectedLevel.words.length > 0) {
      setLevel(selectedLevel);
      setView('level');
    }
  }, []);

  const endLevel = useCallback((completedLevel: Level | null) => {
    if (completedLevel) {
      const range = levelRanges.find((r) => {
        const [start, end] = r.value.split('-').map(Number);
        return completedLevel.id >= start && completedLevel.id <= end;
      });

      if (range && range.value !== activeTab) {
        setActiveTabInternal(range.value);
      }

      setLevelToScrollToInternal(completedLevel.id);
    }

    setLevel(null);
    setView('landing');
  }, [activeTab, levelRanges]);

  // FIXED: Proper setter functions with unique names
  const setGameMode = useCallback((mode: GameMode) => {
    setGameModeInternal(mode);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabInternal(tab);
  }, []);

  const setLevelToScrollTo = useCallback((id: number | null) => {
    setLevelToScrollToInternal(id);
  }, []);

  const value = useMemo(() => ({
    view,
    level,
    startLevel,
    endLevel,
    gameMode,
    setGameMode,
    playSound,
    activeTab,
    setActiveTab,
    allLevels,
    levelRanges,
    levelsByRange,
    loadAudioForLevel,
    levelToScrollTo,
    setLevelToScrollTo,
    lang,
    setLang,
    dictionary,
    t: (key: TranslationKey | string, values?: Record<string, string | number>): string => {
      if (Object.keys(dictionary).length === 0) return String(key);
      let translation = dictionary[key as TranslationKey] || String(key);
      if (values) {
        Object.keys(values).forEach((k) => {
          translation = translation.replace(`{${k}}`, String(values[k]));
        });
      }
      return translation;
    },
    isHydrated,
    direction: dir(lang),
  }), [
    view, level, startLevel, endLevel, gameMode, playSound, activeTab, allLevels,
    levelRanges, levelsByRange, loadAudioForLevel, levelToScrollTo, lang, setLang,
    dictionary, isHydrated, dir
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useTranslation() {
  const { t } = useApp();
  return t;
}
