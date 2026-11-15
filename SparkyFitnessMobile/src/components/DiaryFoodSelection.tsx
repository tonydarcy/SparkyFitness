import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import type { FoodEntry } from '../types/foodEntries';
import type { MealType } from '../types/mealTypes';
import Button from './ui/Button';
import CopyMealSheet, {
  type CopyMealSheetRef,
  type QuickTarget,
} from './CopyMealSheet';
import { useCopySelectedFoods } from '../hooks/useCopySelectedFoods';
import type { CopyFoodEntryInput } from '../hooks/useCopyFoodEntry';
import { currentEntryTime } from '../utils/foodEntryCopy';
import type { CopyFoodEntriesPayload } from '../services/api/foodEntriesApi';

/** What the diary rows need to pick foods and logged meals to copy. */
export interface FoodSelection {
  selectionMode: boolean;
  selectedIds?: ReadonlySet<string>;
  toggleSelect: (entry: FoodEntry) => void;
  /** Picks all of `entries` (a meal section), or drops them if all are picked. */
  toggleSelectAll: (entries: FoodEntry[]) => void;
  startSelection: () => void;
}

export interface DiaryFoodSelection extends FoodSelection {
  selectedCount: number;
  isCopying: boolean;
  endSelection: () => void;
  openCopySheet: () => void;
  /** The copy sheet; render it once, anywhere on the screen. */
  copySheet: React.ReactElement;
}

/**
 * The meal type a diary food was logged in: its id, else the active meal type
 * with the same name (entries from before meal-type ids carry only the name).
 */
function entryMealTypeId(
  entry: FoodEntry,
  mealTypes: MealType[]
): string | undefined {
  if (entry.meal_type_id) return entry.meal_type_id;
  const name = entry.meal_type.toLowerCase();
  return mealTypes.find((mt) => mt.name.toLowerCase() === name)?.id;
}

/**
 * Picking several diary foods (and logged meals) to copy at once. The state
 * lives with the screen, not the food list, so the screen can pin the
 * Cancel / Copy bar where it stays visible while the list scrolls.
 */
export function useDiaryFoodSelection(
  day: string,
  foodEntries: FoodEntry[],
  mealTypes: MealType[]
): DiaryFoodSelection {
  // The selection belongs to the diary day shown, so moving to another day
  // ends it.
  const [selection, setSelection] = useState<{
    day: string;
    ids: ReadonlySet<string>;
  } | null>(null);
  const activeSelection = selection?.day === day ? selection : null;
  const selectedIds = activeSelection?.ids;
  const selectedEntries = useMemo(
    () =>
      selectedIds
        ? foodEntries.filter((entry) => selectedIds.has(entry.id))
        : [],
    [foodEntries, selectedIds]
  );

  const toggleSelect = useCallback(
    (entry: FoodEntry) => {
      setSelection((prev) => {
        const ids = new Set(prev?.day === day ? prev.ids : []);
        if (ids.has(entry.id)) ids.delete(entry.id);
        else ids.add(entry.id);
        return { day, ids };
      });
    },
    [day]
  );
  const toggleSelectAll = useCallback(
    (entries: FoodEntry[]) => {
      setSelection((prev) => {
        const ids = new Set(prev?.day === day ? prev.ids : []);
        const allPicked = entries.every((entry) => ids.has(entry.id));
        for (const entry of entries) {
          if (allPicked) ids.delete(entry.id);
          else ids.add(entry.id);
        }
        return { day, ids };
      });
    },
    [day]
  );
  const startSelection = useCallback(
    () => setSelection({ day, ids: new Set() }),
    [day]
  );
  const endSelection = useCallback(() => setSelection(null), []);

  const copySheetRef = useRef<CopyMealSheetRef>(null);
  // The picked set a running copy was made from. Its success ends only that
  // selection, never one the user started or changed while it ran.
  const copiedIds = useRef<ReadonlySet<string> | null>(null);
  const { copyFoods, isPending: isCopying } = useCopySelectedFoods({
    onSuccess: () => {
      copySheetRef.current?.dismiss();
      const ids = copiedIds.current;
      copiedIds.current = null;
      setSelection((prev) => (prev && prev.ids === ids ? null : prev));
    },
  });

  const openCopySheet = () => {
    const [first] = selectedEntries;
    if (!first) return;
    const single = selectedEntries.length === 1;
    copySheetRef.current?.present(
      day,
      single ? (entryMealTypeId(first, mealTypes) ?? null) : null,
      single ? first.meal_type : '',
      single
        ? { foodName: first.food_name ?? '' }
        : { count: selectedEntries.length }
    );
  };

  const handleCopy = (
    payloads: CopyFoodEntriesPayload[],
    {
      targetMealTypeId,
      quickTarget,
    }: { targetMealTypeId: string | null; quickTarget: QuickTarget | null }
  ) => {
    // "Now" logs the copies at the current time; any other target keeps the
    // time of day each food was first logged at.
    const entryTime = quickTarget === 'now' ? currentEntryTime() : undefined;
    const inputs: CopyFoodEntryInput[] = [];
    let skipped = 0;
    for (const { targetDate } of payloads) {
      for (const entry of selectedEntries) {
        // No picked meal means each food keeps the meal it came from.
        const mealTypeId =
          targetMealTypeId ?? entryMealTypeId(entry, mealTypes);
        if (!mealTypeId) {
          skipped += 1;
          continue;
        }
        inputs.push({
          entry,
          targetDate,
          targetMealTypeId: mealTypeId,
          ...(entryTime ? { entryTime } : {}),
        });
      }
    }
    copiedIds.current = selectedIds ?? null;
    copyFoods(inputs, skipped);
  };

  return {
    selectionMode: activeSelection !== null,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    startSelection,
    selectedCount: selectedEntries.length,
    isCopying,
    endSelection,
    openCopySheet,
    copySheet: (
      <CopyMealSheet
        ref={copySheetRef}
        isPending={isCopying}
        onCopy={handleCopy}
      />
    ),
  };
}

/** Cancel, the picked count and Copy, for the screen to pin in view. */
export const FoodSelectionBar: React.FC<{
  selection: DiaryFoodSelection;
}> = ({ selection }) => {
  const { t } = useTranslation();
  if (!selection.selectionMode) return null;
  return (
    <View className="flex-row items-center gap-2 bg-raised p-1 rounded-lg border border-border-subtle shadow-md">
      <Button
        variant="ghost"
        onPress={selection.endSelection}
        className="py-2 px-3"
        accessibilityLabel={t('common.cancel', { defaultValue: 'Cancel' })}
      >
        {t('common.cancel', { defaultValue: 'Cancel' })}
      </Button>
      <Text className="flex-1 text-center text-sm text-text-secondary">
        {t('foodSummary.selectedCount', {
          count: selection.selectedCount,
          defaultValue: '{{count}} selected',
          defaultValue_one: '{{count}} selected',
          defaultValue_other: '{{count}} selected',
        })}
      </Text>
      <Button
        variant="primary"
        onPress={selection.openCopySheet}
        disabled={selection.selectedCount === 0 || selection.isCopying}
        className="py-2 px-4"
        accessibilityLabel={t('foodSummary.copySelected', {
          defaultValue: 'Copy',
        })}
      >
        {t('foodSummary.copySelected', { defaultValue: 'Copy' })}
      </Button>
    </View>
  );
};
