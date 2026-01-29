'use client';

import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import type { Word } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface StudyModeListProps {
  level: { words: Word[] };
}

export default function StudyModeList({ level }: StudyModeListProps) {
  const { playSound } = useApp();
  const isRTL = useIsRTL();

  const playWordSound = (word: Word) => {
    playSound(word.filename);
  };

  return (
    // Key CSS part:
    // - grid with auto rows (each row sizes by its tallest item)
    // - items-stretch ensures cards in each row match heights of that tallest item
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-auto items-stretch">
      {level.words.map((word, index) => (
        <motion.div
          key={word.word}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex"
        >
          <Card className="flex flex-col flex-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-headline text-2xl">
                  {word.word}
                </CardTitle>
                <button
                  onClick={() => playWordSound(word)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                  aria-label={`Pronounce ${word.word}`}
                >
                  {isRTL ? (
                    <Volume2 className="w-5 h-5" style={{ transform: 'rotate(180deg)' }} />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </div>
              <CardDescription>
                {word.translations.join(', ')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {word.definition && (
                <p className="text-muted-foreground">{word.definition}</p>
              )}
              {word.info && (
                <p className="text-sm text-muted-foreground/70 italic mt-2">
                  {word.info}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
