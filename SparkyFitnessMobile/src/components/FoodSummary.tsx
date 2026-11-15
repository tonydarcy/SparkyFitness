import React from 'react';
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
import type { FoodSelection } from './DiaryFoodSelection';
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
  /**
   * Picking foods and logged meals to copy; owned by the screen, which pins
   * the Cancel / Copy bar. Without it the list offers no Select button.
   */
  selection?: FoodSelection;
}

/** Picking several foods to copy at once; see SwipeableFoodRow. */
interface FoodSelectionProps {
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (entry: FoodEntry) => void;
}

interface MealSectionProps extends FoodSelectionProps {
  group: MealGroup;
  /** Picks every food in the section, or drops them all if all are picked. */
  onToggleSelectAll?: (entries: FoodEntry[]) => void;
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
  onToggleSelectAll,
}) => {
  const { t } = useTranslation();
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  const label = getMealGroupLabel(group, t);
  const allSelected =
    group.entries.length > 0 &&
    group.entries.every((entry) => selectedIds?.has(entry.id));
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
      {selectionMode && onToggleSelectAll && (
        // Keyed so the native symbol view is replaced when the tick changes.
        <Icon
          key={allSelected ? 'on' : 'off'}
          name={allSelected ? 'checkmark-circle-filled' : 'radio-button-off'}
          size={22}
          color={accentPrimary}
        />
      )}
    </>
  );

  return (
    <View className="bg-surface rounded-xl p-4 overflow-hidden shadow-sm">
      {selectionMode && onToggleSelectAll ? (
        <Pressable
          onPress={() => onToggleSelectAll(group.entries)}
          className="flex-row gap-2 mb-3 items-center"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allSelected }}
          accessibilityLabel={t('foodSummary.selectMeal', {
            defaultValue: 'Select all of {{label}}',
            label,
          })}
        >
          {headerContent}
        </Pressable>
      ) : onPressMealType ? (
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
  selection,
}) => {
  const { t } = useTranslation();
  const viewMode = useAppPreferencesStore((s) => s.diaryViewMode);
  const setViewMode = useAppPreferencesStore((s) => s.setDiaryViewMode);
  const selectionMode = selection?.selectionMode ?? false;
  const selectedIds = selection?.selectedIds;
  const toggleSelect = selection?.toggleSelect;

  if (foodEntries.length === 0) {
    return <EmptyState onAddFood={onAddFood} />;
  }

  const viewToggle = (
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
      {selection && !selectionMode && (
        <Button
          variant="ghost"
          onPress={selection.startSelection}
          className="py-2 px-2"
          accessibilityLabel={t('foodSummary.selectFoods', {
            defaultValue: 'Select foods',
          })}
        >
          {t('foodSummary.select', { defaultValue: 'Select' })}
        </Button>
      )}
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
          onToggleSelectAll={selection?.toggleSelectAll}
        />
      ))}
    </View>
  );
};

export default FoodSummary;
