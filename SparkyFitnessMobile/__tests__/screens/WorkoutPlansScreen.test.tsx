import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import WorkoutPlansScreen from '../../src/screens/WorkoutPlansScreen';
import {
  useAddStarterWorkoutPlan,
  useDeleteWorkoutPlan,
  useServerConnection,
  useStarterWorkoutPlans,
  useUpdateWorkoutPlan,
  useWorkoutPlans,
} from '../../src/hooks';
import type { WorkoutPlanTemplate } from '../../src/types/workoutPlans';

jest.mock('../../src/hooks', () => ({
  useDeleteWorkoutPlan: jest.fn(),
  useServerConnection: jest.fn(),
  useUpdateWorkoutPlan: jest.fn(),
  useWorkoutPlans: jest.fn(),
  useStarterWorkoutPlans: jest.fn(),
  useAddStarterWorkoutPlan: jest.fn(),
}));

jest.mock('../../src/components/ActiveWorkoutBar', () => ({
  useActiveWorkoutBarPadding: jest.fn(() => 0),
}));

const mockUsePlans = useWorkoutPlans as jest.MockedFunction<
  typeof useWorkoutPlans
>;
const mockUseDelete = useDeleteWorkoutPlan as jest.MockedFunction<
  typeof useDeleteWorkoutPlan
>;
const mockUseConnection = useServerConnection as jest.MockedFunction<
  typeof useServerConnection
>;
const mockUseUpdate = useUpdateWorkoutPlan as jest.MockedFunction<
  typeof useUpdateWorkoutPlan
>;

const mockUseStarter = useStarterWorkoutPlans as jest.MockedFunction<
  typeof useStarterWorkoutPlans
>;
const mockUseAddStarter = useAddStarterWorkoutPlan as jest.MockedFunction<
  typeof useAddStarterWorkoutPlan
>;
const addStarterPlanAsync = jest.fn();
const deleteWorkoutPlanAsync = jest.fn();
const updateWorkoutPlanAsync = jest.fn();
const refetch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));
const route = {
  key: 'WorkoutPlans-key',
  name: 'WorkoutPlans' as const,
  params: undefined,
};
const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };

const plan = {
  id: 'plan-1',
  user_id: 'user-1',
  plan_name: 'Push pull legs',
  description: '',
  start_date: '2026-10-01',
  end_date: null,
  is_active: true,
  schedule_type: 'weekly',
  assignments: [],
} as WorkoutPlanTemplate;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={{ insets, frame }}>
      <WorkoutPlansScreen navigation={mockNavigation} route={route} />
    </SafeAreaProvider>
  );
}

describe('WorkoutPlansScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnection.mockReturnValue({
      isConnected: true,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePlans.mockReturnValue({
      workoutPlans: [plan],
      isLoading: false,
      isError: false,
      refetch,
    });
    mockUseDelete.mockReturnValue({ deleteWorkoutPlanAsync, isPending: false });
    deleteWorkoutPlanAsync.mockResolvedValue(undefined);
    mockUseStarter.mockReturnValue({ starterPlans: [] });
    mockUseAddStarter.mockReturnValue({
      addStarterPlanAsync,
      pendingKey: undefined,
    } as unknown as ReturnType<typeof useAddStarterWorkoutPlan>);
    addStarterPlanAsync.mockResolvedValue({ id: 'plan-2' });
    mockUseUpdate.mockReturnValue({ updateWorkoutPlanAsync, isPending: false });
    updateWorkoutPlanAsync.mockResolvedValue({ ...plan });
  });

  test('hides starter plans when the server offers none', () => {
    const screen = renderScreen();
    expect(screen.queryByText('Starter plans')).toBeNull();
  });

  test('adds a starter plan with translated names', async () => {
    mockUseStarter.mockReturnValue({
      starterPlans: [
        {
          key: 'push_pull_legs',
          session_keys: ['push', 'pull', 'legs'],
          exercise_count: 15,
        },
      ],
    });
    const screen = renderScreen();
    expect(screen.getByText('Push → Pull → Legs')).toBeTruthy();

    fireEvent.press(screen.getByText('Add plan'));
    await waitFor(() =>
      expect(addStarterPlanAsync).toHaveBeenCalledWith({
        key: 'push_pull_legs',
        body: expect.objectContaining({
          plan_name: 'Push / Pull / Legs',
          session_names: { push: 'Push', pull: 'Pull', legs: 'Legs' },
        }),
      })
    );
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  test('shows a plan and opens its detail screen', () => {
    const screen = renderScreen();
    expect(screen.getByText('Push pull legs')).toBeTruthy();
    expect(screen.getByLabelText('Active plan')).toBeTruthy();

    fireEvent.press(screen.getByText('Push pull legs'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutPlanDetail', {
      template: plan,
    });
  });

  test('toggling the switch sends a full payload and toasts diary changes', async () => {
    updateWorkoutPlanAsync.mockResolvedValue({
      ...plan,
      is_active: false,
      regenerated_entries: { removed: 3, created: 0 },
    });
    const screen = renderScreen();

    fireEvent(screen.getByLabelText('Active plan'), 'valueChange', false);

    await waitFor(() => {
      expect(updateWorkoutPlanAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          plan_name: 'Push pull legs',
        }),
        expect.any(String)
      );
    });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: 'Plan deactivated',
        text2: 'Removed 3 upcoming sessions',
      })
    );
  });

  test('confirms before deleting a plan', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = renderScreen();

    fireEvent.press(screen.getByLabelText('Delete Push pull legs'));
    const buttons = alert.mock.calls[0][2];
    await buttons?.[1].onPress?.();

    await waitFor(() => {
      expect(deleteWorkoutPlanAsync).toHaveBeenCalledWith('plan-1');
    });
    expect(Toast.show).toHaveBeenCalledWith({
      type: 'success',
      text1: 'Workout plan deleted',
    });
  });

  test('offers plan creation from the empty state', () => {
    mockUsePlans.mockReturnValue({
      workoutPlans: [],
      isLoading: false,
      isError: false,
      refetch,
    });
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Create workout plan'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutPlanForm');
  });

  test('retries after a loading error', () => {
    mockUsePlans.mockReturnValue({
      workoutPlans: [],
      isLoading: false,
      isError: true,
      refetch,
    });
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
