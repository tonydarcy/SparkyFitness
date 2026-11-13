import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { createFoodEntry } from '../services/api/foodEntriesApi';
import { buildFoodEntryCopyPayload } from '../utils/foodEntryCopy';
import type { CopyFoodEntryInput } from './useCopyFoodEntry';
import { invalidateFoodCache } from './invalidateFoodCache';

interface CopyResult {
  copied: CopyFoodEntryInput[];
  failedCount: number;
}

/**
 * Logs each copy in turn. One that fails does not stop the rest; the copy only
 * counts as failed when nothing was copied.
 */
async function copyEach(inputs: CopyFoodEntryInput[]): Promise<CopyResult> {
  const copied: CopyFoodEntryInput[] = [];
  let failedCount = 0;
  for (const { entry, targetDate, targetMealTypeId, entryTime } of inputs) {
    try {
      await createFoodEntry(
        buildFoodEntryCopyPayload(
          entry,
          targetDate,
          targetMealTypeId,
          entryTime
        )
      );
      copied.push({ entry, targetDate, targetMealTypeId, entryTime });
    } catch {
      failedCount += 1;
    }
  }
  if (copied.length === 0) {
    throw new Error('Failed to copy foods');
  }
  return { copied, failedCount };
}

/** Logs several picked diary foods again, on one or more days. */
export function useCopySelectedFoods(options?: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: copyEach,
    onSuccess: ({ copied, failedCount }) => {
      // Only the target days change; the source entries are left untouched.
      for (const day of new Set(copied.map((input) => input.targetDate))) {
        invalidateFoodCache(queryClient, day);
      }
      if (failedCount > 0) {
        Toast.show({
          type: 'error',
          text1: t('foodEntryCopy.foodsPartial', {
            defaultValue: 'Copied {{copied}} of {{total}} foods',
            copied: copied.length,
            total: copied.length + failedCount,
          }),
          text2: t('common.tryAgain', { defaultValue: 'Please try again.' }),
        });
      } else {
        Toast.show({
          type: 'success',
          text1: t('foodEntryCopy.foodsSuccess', {
            count: copied.length,
            defaultValue: '{{count}} foods copied',
            defaultValue_one: '{{count}} food copied',
            defaultValue_other: '{{count}} foods copied',
          }),
        });
      }
      options?.onSuccess?.();
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: t('foodEntryCopy.foodsFailed', {
          defaultValue: 'Failed to copy foods',
        }),
        text2: t('common.tryAgain', { defaultValue: 'Please try again.' }),
      });
    },
  });

  // isPending only updates on the next render, so a quick double tap could
  // send every copy twice. The ref blocks a second copy until the first settles.
  const inFlight = useRef(false);
  const { mutate } = mutation;
  const copyFoods = useCallback(
    (inputs: CopyFoodEntryInput[]) => {
      if (inFlight.current || inputs.length === 0) return;
      inFlight.current = true;
      mutate(inputs, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    [mutate]
  );

  return { copyFoods, isPending: mutation.isPending };
}
