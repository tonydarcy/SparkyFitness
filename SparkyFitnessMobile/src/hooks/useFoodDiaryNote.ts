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
    // Once anything has loaded, a failed background refetch keeps the editor.
    isLoaded: query.data !== undefined,
    refetch: query.refetch,
  };
}

export function useSaveFoodDiaryNote(date: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => saveFoodDiaryNote(date, note),
    // Saves of one day's note run in the order they were made, so the last
    // edit is the one the server keeps.
    scope: { id: `foodDiaryNote:${date}` },
    // Read the note back rather than writing the response into the cache:
    // the refetch replaces any read started before the save, and it belongs
    // to whichever account is active now, so a save that finishes after a
    // server switch never shows in the other account.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: foodDiaryNoteQueryKey(date),
        exact: true,
      }),
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
