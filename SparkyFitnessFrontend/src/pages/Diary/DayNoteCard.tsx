import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotebookPen } from 'lucide-react';
import { FOOD_DIARY_NOTE_MAX_LENGTH } from '@workspace/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  useFoodDiaryNoteQuery,
  useSaveFoodDiaryNoteMutation,
} from '@/hooks/Diary/useFoodDiaryNote';

interface DayNoteCardProps {
  date: string;
  userId?: string;
  /** Someone who can read but not write this diary (View Reports). */
  readOnly?: boolean;
}

/**
 * A free-text note for the diary day (how it went, a meal out, feeling
 * unwell). It saves when the box loses focus; clearing it deletes the note.
 * Mount it keyed by person and day, so a draft never moves to another one.
 */
const DayNoteCard = ({ date, userId, readOnly = false }: DayNoteCardProps) => {
  const { t } = useTranslation();
  const { data, isError, refetch } = useFoodDiaryNoteQuery(date, userId);
  const { mutate, isPending, isSuccess } = useSaveFoodDiaryNoteMutation(
    date,
    userId
  );
  const loaded = data !== undefined;
  const savedNote = data?.note ?? '';
  const [draft, setDraft] = useState(savedNote);
  // The text the box was last filled with or sent; while the draft still
  // matches it, the user has typed nothing newer and the saved note may
  // replace it.
  const seeded = useRef(savedNote);
  // The latest text sent and not yet answered: what the note will be.
  const pending = useRef<string | null>(null);

  useEffect(() => {
    setDraft((current) => (current === seeded.current ? savedNote : current));
    seeded.current = savedNote;
  }, [savedNote]);

  const save = () => {
    if (readOnly || !loaded) return;
    const expected = pending.current ?? savedNote;
    if (draft.trim() === expected.trim()) return;
    const text = draft;
    pending.current = text;
    seeded.current = text;
    mutate(text, {
      onSettled: () => {
        if (pending.current === text) pending.current = null;
      },
    });
  };

  const hint = readOnly
    ? null
    : isPending
      ? t('diary.dayNote.saving', 'Saving...')
      : isSuccess
        ? t('diary.dayNote.saved', 'Saved')
        : t(
            'diary.dayNote.hint',
            'Saves when you click away. Clear the text to delete it.'
          );

  return (
    <Card className="h-full" data-testid="day-note-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4" />
          {t('diary.dayNote.title', 'Day Note')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {!loaded && isError ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {t('diary.dayNote.failedToLoad', "Failed to load the day's note.")}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('diary.dayNote.retry', 'Retry')}
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              aria-label={t('diary.dayNote.title', 'Day Note')}
              placeholder={
                readOnly
                  ? t('diary.dayNote.empty', 'No note for this day.')
                  : t(
                      'diary.dayNote.placeholder',
                      'How did today go? Anything worth remembering about what you ate.'
                    )
              }
              value={draft}
              maxLength={FOOD_DIARY_NOTE_MAX_LENGTH}
              disabled={!loaded}
              readOnly={readOnly}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={save}
              className="min-h-[96px] resize-y"
            />
            {hint && (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {hint}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DayNoteCard;
