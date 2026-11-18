import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  fetchFoodDiaryNote,
  saveFoodDiaryNote,
} from '../services/api/foodDiaryNotesApi';
import { foodDiaryNoteQueryKey } from './queryKeys';
import { useRefetchOnFocus } from './useRefetchOnFocus';

/**
 * The diary day's note. `supported` is false against a server without day
 * notes, so the card hides rather than offering a box that cannot save.
 */
export function useFoodDiaryNote(date: string) {
  const query = useQuery({
    queryKey: foodDiaryNoteQueryKey(date),
    queryFn: () => fetchFoodDiaryNote(date),
    enabled: Boolean(date),
  });

  useRefetchOnFocus(query.refetch);

  return {
    note: query.data?.note ?? null,
    supported: query.data !== null,
    isLoaded: query.isSuccess,
  };
}

export function useSaveFoodDiaryNote(date: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => saveFoodDiaryNote(date, note),
    onSuccess: (saved) => {
      queryClient.setQueryData(foodDiaryNoteQueryKey(date), saved);
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: t('diary.dayNote.saveFailed', {
          defaultValue: "Couldn't save the day note",
        }),
      });
    },
  });
}
