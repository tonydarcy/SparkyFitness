import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotebookPen } from 'lucide-react';
import { FOOD_DIARY_NOTE_MAX_LENGTH } from '@workspace/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  useFoodDiaryNoteQuery,
  useSaveFoodDiaryNoteMutation,
} from '@/hooks/Diary/useFoodDiaryNote';

interface DayNoteCardProps {
  date: string;
  userId?: string;
}

/**
 * A free-text note for the diary day (how it went, a meal out, feeling
 * unwell). It saves when the box loses focus; clearing it deletes the note.
 */
const DayNoteCard = ({ date, userId }: DayNoteCardProps) => {
  const { t } = useTranslation();
  const { data, isLoading } = useFoodDiaryNoteQuery(date, userId);
  const { mutate, isPending, isSuccess, reset } = useSaveFoodDiaryNoteMutation(
    date,
    userId
  );
  const savedNote = data?.note ?? '';
  const [draft, setDraft] = useState(savedNote);

  // Follow the saved note when it loads or changes.
  useEffect(() => {
    setDraft(savedNote);
  }, [savedNote]);

  // A "Saved" status belongs to the day it was shown for.
  useEffect(() => {
    reset();
  }, [date, userId, reset]);

  const save = () => {
    if (draft.trim() === savedNote.trim()) return;
    mutate(draft);
  };

  return (
    <Card className="h-full" data-testid="day-note-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4" />
          {t('diary.dayNote.title', 'Day Note')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <Textarea
          aria-label={t('diary.dayNote.title', 'Day Note')}
          placeholder={t(
            'diary.dayNote.placeholder',
            'How did today go? Anything worth remembering about what you ate.'
          )}
          value={draft}
          maxLength={FOOD_DIARY_NOTE_MAX_LENGTH}
          disabled={isLoading}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className="min-h-[96px] resize-y"
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isPending
            ? t('diary.dayNote.saving', 'Saving...')
            : isSuccess
              ? t('diary.dayNote.saved', 'Saved')
              : t(
                  'diary.dayNote.hint',
                  'Saves when you click away. Clear the text to delete it.'
                )}
        </p>
      </CardContent>
    </Card>
  );
};

export default DayNoteCard;
