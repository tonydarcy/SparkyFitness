import {
  getFoodDiaryNote,
  saveFoodDiaryNote,
} from '@/api/Diary/foodDiaryNoteService';
import { foodDiaryNoteKeys } from '@/api/keys/diary';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const useFoodDiaryNoteQuery = (date: string, userId?: string) => {
  const { t } = useTranslation();
  return useQuery({
    queryKey: foodDiaryNoteKeys.byDate(date, userId),
    queryFn: () => getFoodDiaryNote(date),
    enabled: Boolean(date),
    meta: {
      errorMessage: t(
        'diary.dayNote.failedToLoad',
        "Failed to load the day's note."
      ),
    },
  });
};

export const useSaveFoodDiaryNoteMutation = (date: string, userId?: string) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => saveFoodDiaryNote(date, note),
    // Saves of one day's note run in the order they were made, so the last
    // edit is the one the server keeps.
    scope: { id: `foodDiaryNote:${userId ?? 'current'}:${date}` },
    onSuccess: async (saved) => {
      const key = foodDiaryNoteKeys.byDate(date, userId);
      // A read started before the save must not put the old note back.
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      queryClient.setQueryData(key, saved);
    },
    meta: {
      errorMessage: t(
        'diary.dayNote.failedToSave',
        "Failed to save the day's note."
      ),
    },
  });
};
