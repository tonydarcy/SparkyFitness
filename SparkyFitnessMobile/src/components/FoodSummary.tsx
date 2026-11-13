import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { FoodEntry } from '../types/foodEntries';
import type { DailyGoals } from '../types/goals';
import type { MealType } from '../types/mealTypes';
import Icon from './Icon';
import { MEAL_CONFIG } from '../constants/meals';
import SwipeableFoodRow from './SwipeableFoodRow';
import SegmentedControl from './SegmentedControl';
import Button from './ui/Button';
import CopyMealSheet, {
  type CopyMealSheetRef,
  type QuickTarget,
} from './CopyMealSheet';
import { useCopySelectedFoods } from '../hooks/useCopySelectedFoods';
import type { CopyFoodEntryInput } from '../hooks/useCopyFoodEntry';
import { currentEntryTime } from '../utils/foodEntryCopy';
import type { CopyFoodEntriesPayload } from '../services/api/foodEntriesApi';
import { usePreferences } from '../hooks/usePreferences';
import {
  useAppPreferencesStore,
  type DiaryViewMode,
} from '../stores/appPreferencesStore';
import { formatTimeLabel } from '../utils/entryTimeDisplay';
import { buildTimelineGroups, hourSlotTime } from '../utils/diaryTimeline';
import {
  calculateEntryNutrition,
  calculateMealNutrition,
  getMealGroupLabel,
  groupFoodEntriesByMealType,
  getMealTargetCalories,
  type MealGroup,
} from '../utils/mealNutrition';
import { useEnergyUnit } from '../hooks/useEnergyUnit';
import { energyUnitLabel, roundedEnergy } from '../utils/energyUnit';

interface FoodSummaryProps {
  foodEntries: FoodEntry[];
  mealTypes: MealType[];
  goals?: DailyGoals;
  calorieGoal?: number;
  onAddFood?: () => void;
  /** Timeline quick add at an hour slot (HH:MM). */
  onAddFoodAt?: (time: string) => void;
  onAdjustServing?: (entry: FoodEntry) => void;
  onPressMealType?: (
    mealTypeId: string | null,
    mealTypeName: string,
    entries: FoodEntry[]
  ) => void;
}

/** Picking several foods to copy at once; see SwipeableFoodRow. */
interface FoodSelectionProps {
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (entry: FoodEntry) => void;
}

interface MealSectionProps extends FoodSelectionProps {
  group: MealGroup;
  goals?: DailyGoals;
  calorieGoal?: number;
  onAdjustServing?: (entry: FoodEntry) => void;
  onPressMealType?: (
    mealTypeId: string | null,
    mealTypeName: string,
    entries: FoodEntry[]
  ) => void;
}

const EmptyState: React.FC<{ onAddFood?: () => void }> = ({ onAddFood }) => {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onAddFood}
      accessibilityRole="button"
      accessibilityLabel={t('foodSummary.tapToAddFood', {
        defaultValue: 'Tap to add food',
      })}
      className="bg-surface rounded-xl p-4 mb-2 shadow-sm items-center py-6"
    >
      <Text className="text-text-muted text-base">
        {t('foodSummary.tapToAddFood', { defaultValue: 'Tap to add food' })}
      </Text>
    </Pressable>
  );
};

const MealSection: React.FC<MealSectionProps> = ({
  group,
  goals,
  calorieGoal,
  onAdjustServing,
  onPressMealType,
  selectionMode,
  selectedIds,
  onToggleSelect,
}) => {
  const { t } = useTranslation();
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  const label = getMealGroupLabel(group, t);
  // Single canonical MEAL_CONFIG lookup (read once, reuse both fields). A
  // custom category named "breakfast" still gets the neutral icon, never the
  // system one — ownership is decided by isSystem, not by the name.
  const systemConfig = group.isSystem
    ? MEAL_CONFIG[group.name.toLowerCase()]
    : undefined;
  const icon = systemConfig?.icon ?? 'meal-snack';

  const energyUnit = useEnergyUnit();
  const totalCalories = calculateMealNutrition(group.entries).values.calories;
  const targetCalories = React.useMemo(
    () => getMealTargetCalories(group.name, group.isSystem, goals, calorieGoal),
    [group.isSystem, group.name, goals, calorieGoal]
  );

  const headerContent = (
    <>
      <Icon name={icon} size={18} color={accentPrimary} />
      <Text className="text-base font-bold text-text-secondary flex-1">
        {label}
      </Text>
      {(totalCalories > 0 || targetCalories > 0) && (
        <View className="bg-accent-primary/5 rounded-full px-2.5 py-0.5">
          <Text className="text-xs text-accent-primary font-semibold">
            {roundedEnergy(totalCalories, energyUnit)}
            {targetCalories > 0
              ? ` / ${roundedEnergy(targetCalories, energyUnit)}`
              : ''}{' '}
            {energyUnitLabel(energyUnit, t)}
          </Text>
        </View>
      )}
      {onPressMealType && (
        <Icon name="chevron-forward" size={14} color={accentPrimary} />
      )}
    </>
  );

  return (
    <View className="bg-surface rounded-xl p-4 overflow-hidden shadow-sm">
      {onPressMealType ? (
        <Pressable
          onPress={() =>
            onPressMealType(group.mealTypeId, group.name, group.entries)
          }
          className="flex-row gap-2 mb-3 items-center"
          accessibilityRole="button"
          accessibilityLabel={t('foodSummary.nutritionBreakdown', {
            defaultValue: '{{label}} nutrition breakdown',
            label,
          })}
        >
          {headerContent}
        </Pressable>
      ) : (
        <View className="flex-row gap-2 mb-3 items-center">
          {headerContent}
        </View>
      )}
      {group.entries.map((entry, index) => {
        const nutrition = calculateEntryNutrition(entry);
        return (
          <SwipeableFoodRow
            key={entry.id || index}
            entry={entry}
            nutrition={nutrition}
            onAdjustServing={onAdjustServing}
            selectionMode={selectionMode}
            selected={selectedIds?.has(entry.id) ?? false}
            onToggleSelect={onToggleSelect}
          />
        );
      })}
    </View>
  );
};

interface FoodTimelineProps extends FoodSelectionProps {
  foodEntries: FoodEntry[];
  mealTypes: MealType[];
  onAddFoodAt?: (time: string) => void;
  onAdjustServing?: (entry: FoodEntry) => void;
}

const FoodTimeline: React.FC<FoodTimelineProps> = ({
  foodEntries,
  mealTypes,
  onAddFoodAt,
  onAdjustServing,
  selectionMode,
  selectedIds,
  onToggleSelect,
}) => {
  const { t } = useTranslation();
  const { preferences } = usePreferences();
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;
  const groups = React.useMemo(
    () => buildTimelineGroups(foodEntries, mealTypes),
    [foodEntries, mealTypes]
  );

  return (
    <View className="bg-surface rounded-xl p-4 overflow-hidden shadow-sm gap-3">
      {groups.map((group) => {
        const slot = group.hour === null ? null : hourSlotTime(group.hour);
        const label = slot
          ? (formatTimeLabel(slot, preferences?.time_format) ?? slot)
          : t('diary.timeline.noTime', { defaultValue: 'No time' });
        return (
          <View key={slot ?? 'untimed'}>
            <View className="flex-row items-center mb-1">
              <Text className="text-xs font-semibold uppercase text-text-muted flex-1">
                {label}
              </Text>
              {slot && onAddFoodAt && !selectionMode && (
                <Pressable
                  onPress={() => onAddFoodAt(slot)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('diary.timeline.addAt', {
                    defaultValue: 'Add food at {{time}}',
                    time: label,
                  })}
                >
                  <Icon name="add" size={18} color={accentPrimary} />
                </Pressable>
              )}
            </View>
            <View className="border-l border-border-subtle pl-3">
              {group.items.map(({ entry }, index) => (
                <SwipeableFoodRow
                  key={entry.id || index}
                  entry={entry}
                  nutrition={calculateEntryNutrition(entry)}
                  onAdjustServing={onAdjustServing}
                  selectionMode={selectionMode}
                  selected={selectedIds?.has(entry.id) ?? false}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const FoodSummary: React.FC<FoodSummaryProps> = ({
  foodEntries,
  mealTypes,
  goals,
  calorieGoal,
  onAddFood,
  onAddFoodAt,
  onAdjustServing,
  onPressMealType,
}) => {
  const { t } = useTranslation();
  const viewMode = useAppPreferencesStore((s) => s.diaryViewMode);
  const setViewMode = useAppPreferencesStore((s) => s.setDiaryViewMode);

  // Foods picked to copy together. The selection belongs to one day, so
  // moving to another day ends it.
  const day = foodEntries[0]?.entry_date ?? '';
  const [selection, setSelection] = useState<{
    day: string;
    ids: ReadonlySet<string>;
  } | null>(null);
  const activeSelection = selection?.day === day ? selection : null;
  const selectionMode = activeSelection !== null;
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
  const endSelection = useCallback(() => setSelection(null), []);

  const copySheetRef = useRef<CopyMealSheetRef>(null);
  const { copyFoods, isPending: isCopying } = useCopySelectedFoods({
    onSuccess: () => {
      copySheetRef.current?.dismiss();
      setSelection(null);
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
    for (const { targetDate } of payloads) {
      for (const entry of selectedEntries) {
        // No picked meal means each food keeps the meal it came from.
        const mealTypeId =
          targetMealTypeId ?? entryMealTypeId(entry, mealTypes);
        if (!mealTypeId) continue;
        inputs.push({
          entry,
          targetDate,
          targetMealTypeId: mealTypeId,
          ...(entryTime ? { entryTime } : {}),
        });
      }
    }
    copyFoods(inputs);
  };

  if (foodEntries.length === 0) {
    return <EmptyState onAddFood={onAddFood} />;
  }

  const selectionBar = (
    <View className="flex-row items-center gap-2 bg-raised p-1 rounded-lg">
      <Button
        variant="ghost"
        onPress={endSelection}
        className="py-2 px-3"
        accessibilityLabel={t('common.cancel', { defaultValue: 'Cancel' })}
      >
        {t('common.cancel', { defaultValue: 'Cancel' })}
      </Button>
      <Text className="flex-1 text-center text-sm text-text-secondary">
        {t('foodSummary.selectedCount', {
          count: selectedEntries.length,
          defaultValue: '{{count}} selected',
          defaultValue_one: '{{count}} selected',
          defaultValue_other: '{{count}} selected',
        })}
      </Text>
      <Button
        variant="primary"
        onPress={openCopySheet}
        disabled={selectedEntries.length === 0 || isCopying}
        className="py-2 px-4"
        accessibilityLabel={t('foodSummary.copySelected', {
          defaultValue: 'Copy',
        })}
      >
        {t('foodSummary.copySelected', { defaultValue: 'Copy' })}
      </Button>
    </View>
  );

  const copySheet = (
    <CopyMealSheet
      ref={copySheetRef}
      isPending={isCopying}
      onCopy={handleCopy}
    />
  );

  const viewToggle = selectionMode ? (
    selectionBar
  ) : (
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <SegmentedControl<DiaryViewMode>
          segments={[
            {
              key: 'meals',
              label: t('diary.view.meals', { defaultValue: 'Meals' }),
            },
            {
              key: 'timeline',
              label: t('diary.view.timeline', { defaultValue: 'Timeline' }),
            },
          ]}
          activeKey={viewMode}
          onSelect={setViewMode}
        />
      </View>
      <Button
        variant="ghost"
        onPress={() => setSelection({ day, ids: new Set() })}
        className="py-2 px-2"
        accessibilityLabel={t('foodSummary.selectFoods', {
          defaultValue: 'Select foods',
        })}
      >
        {t('foodSummary.select', { defaultValue: 'Select' })}
      </Button>
    </View>
  );

  if (viewMode === 'timeline') {
    return (
      <View className="gap-2 mb-2">
        {viewToggle}
        <FoodTimeline
          foodEntries={foodEntries}
          mealTypes={mealTypes}
          onAddFoodAt={onAddFoodAt}
          onAdjustServing={onAdjustServing}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
        {copySheet}
      </View>
    );
  }

  // groupFoodEntriesByMealType only creates groups that have entries, so the
  // previous visibleGroups re-filter was redundant.
  const groups = groupFoodEntriesByMealType(foodEntries, mealTypes);

  if (groups.length === 0) {
    return <EmptyState onAddFood={onAddFood} />;
  }

  return (
    <View className="gap-2 mb-2">
      {viewToggle}
      {groups.map((group) => (
        <MealSection
          key={
            group.mealTypeId
              ? `meal:${group.mealTypeId}`
              : `historical:${group.name.toLowerCase()}`
          }
          group={group}
          goals={goals}
          calorieGoal={calorieGoal}
          onAdjustServing={onAdjustServing}
          onPressMealType={selectionMode ? undefined : onPressMealType}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ))}
      {copySheet}
    </View>
  );
};

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

export default FoodSummary;
