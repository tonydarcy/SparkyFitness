import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import Icon from './Icon';
import WorkoutNotesField from './WorkoutNotesField';
import {
  useFoodDiaryNote,
  useSaveFoodDiaryNote,
} from '../hooks/useFoodDiaryNote';

interface DayNoteCardProps {
  date: string;
}

/**
 * The diary day's free-text note, under the food log. It saves when the box
 * loses focus (or the card unmounts); clearing it deletes the note. Hidden
 * until loaded and against a server without day notes.
 *
 * Mount it keyed by date: the field flushes its draft on unmount with the
 * handler of the day it was typed on.
 */
function DayNoteCard({ date }: DayNoteCardProps) {
  const { t } = useTranslation();
  const { note, supported, isLoaded } = useFoodDiaryNote(date);
  const { mutate } = useSaveFoodDiaryNote(date);
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  if (!isLoaded || !supported) return null;

  const title = t('diary.dayNote.title', { defaultValue: 'Day Note' });

  return (
    <View className="bg-surface rounded-xl p-4 mb-2 shadow-sm">
      <View className="flex-row items-center gap-2 mb-2">
        <Icon name="pencil" size={18} color={accentPrimary} />
        <Text className="text-base font-bold text-text-secondary">{title}</Text>
      </View>
      <WorkoutNotesField
        value={note}
        label=""
        accessibilityLabel={title}
        placeholder={t('diary.dayNote.placeholder', {
          defaultValue:
            'How did today go? Anything worth remembering about what you ate.',
        })}
        onCommit={(text) => {
          if (text.trim() === (note ?? '').trim()) return;
          mutate(text);
        }}
      />
    </View>
  );
}

export default DayNoteCard;
