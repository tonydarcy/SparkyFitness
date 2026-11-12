import { renderHook } from '@testing-library/react-native';
import { useBackupExercisePicker } from '../../src/hooks/useBackupExercisePicker';
import type { Exercise } from '../../src/types/exercise';

const squat = { id: 'ex-squat', name: 'Squat' } as Exercise;
const legPress = { id: 'ex-press', name: 'Leg Press' } as Exercise;
const slots = [{ clientId: 'slot-1', exerciseId: 'ex-squat' }];

describe('useBackupExercisePicker', () => {
  it('sets the chosen exercise as the target slot backup', () => {
    const setProgression = jest.fn();
    const onAdd = jest.fn();
    const { result } = renderHook(() =>
      useBackupExercisePicker(setProgression, onAdd, slots)
    );
    result.current.setBackupTarget('slot-1');
    result.current.handleSelectedExercise(legPress);
    expect(setProgression).toHaveBeenCalledWith('slot-1', {
      backupExerciseId: 'ex-press',
      backupExerciseName: 'Leg Press',
    });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('ignores the slot own exercise as its backup', () => {
    const setProgression = jest.fn();
    const onAdd = jest.fn();
    const { result } = renderHook(() =>
      useBackupExercisePicker(setProgression, onAdd, slots)
    );
    result.current.setBackupTarget('slot-1');
    result.current.handleSelectedExercise(squat);
    expect(setProgression).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('adds the exercise when no backup target is set', () => {
    const setProgression = jest.fn();
    const onAdd = jest.fn();
    const { result } = renderHook(() =>
      useBackupExercisePicker(setProgression, onAdd, slots)
    );
    result.current.handleSelectedExercise(squat);
    expect(onAdd).toHaveBeenCalledWith(squat);
  });
});
