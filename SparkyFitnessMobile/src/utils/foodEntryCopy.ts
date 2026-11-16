import type {
  FoodEntryMeal,
  FoodEntryMealCreateData,
} from '../types/foodEntryMeals';
import { buildMealIngredientDraftFromEntryMealFood } from './mealBuilderDraft';

/**
 * A create payload that logs a whole logged meal again on another day or meal,
 * from the meal as `getFoodEntryMealWithComponents` returns it. The foods are
 * sent back as stored (the recipe base for a scaled meal), with the same
 * servings and yield, so the server rebuilds the same portion, exactly as an
 * unchanged save from the logged-meal editor would.
 */
export function buildFoodEntryMealCopyPayload(
  meal: FoodEntryMeal,
  targetDate: string,
  targetMealTypeId: string,
  /** 'HH:MM' to log the copy at instead of the original's time, e.g. for "Now". */
  entryTime?: string
): FoodEntryMealCreateData {
  return {
    meal_template_id: meal.meal_template_id,
    meal_type: meal.meal_type,
    meal_type_id: targetMealTypeId,
    entry_date: targetDate,
    entry_time: entryTime ?? meal.entry_time ?? null,
    name: meal.name,
    ...(meal.description ? { description: meal.description } : {}),
    notes: meal.notes ?? null,
    quantity: meal.quantity,
    unit: meal.unit,
    // A meal logged before the serving model change multiplied its foods by
    // the servings eaten; new copies use servings / yield. A yield of 1 gives
    // the copy that same multiplier, so it holds the same amount of food.
    entry_total_servings:
      meal.legacy_serving_unit_math && meal.unit === 'serving'
        ? 1
        : (meal.entry_total_servings ?? null),
    foods: meal.foods
      .map(buildMealIngredientDraftFromEntryMealFood)
      .map(({ brand: _brand, ...food }) => food),
  };
}
