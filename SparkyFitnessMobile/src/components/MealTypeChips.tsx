import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface MealTypeChipOption {
  id: string;
  label: string;
}

interface MealTypeChipsProps {
  options: MealTypeChipOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * One tappable chip per meal type, so the meal is a single tap instead of a
 * dropdown. Used by the copy sheet and the food logging screen.
 */
const MealTypeChips: React.FC<MealTypeChipsProps> = ({
  options,
  selectedId,
  onSelect,
  className = 'flex-row flex-wrap gap-2',
}) => (
  <View className={className}>
    {options.map((option) => {
      const isSelected = option.id === selectedId;
      return (
        <TouchableOpacity
          key={option.id}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelect(option.id)}
          activeOpacity={0.7}
          className={`px-4 py-2 rounded-full border ${
            isSelected
              ? 'bg-accent-primary border-accent-primary'
              : 'bg-raised border-border-subtle'
          }`}
        >
          <Text
            className={`text-sm ${
              isSelected ? 'text-white font-semibold' : 'text-text-primary'
            }`}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default MealTypeChips;
