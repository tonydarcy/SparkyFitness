import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { summarizeEnergyBalance } from '@workspace/shared';

import { useAdaptiveTdee } from '../hooks/useAdaptiveTdee';
import { useEnergyUnit } from '../hooks/useEnergyUnit';
import { energyUnitLabel, formatEnergyNumber } from '../utils/energyUnit';

interface EnergyBalanceCardProps {
  selectedDate: string;
}

const BALANCE_COLOR = {
  deficit: 'text-icon-success',
  surplus: 'text-icon-warning',
  maintenance: 'text-text-primary',
} as const;

/**
 * Estimated expenditure (TDEE) and the average daily deficit or surplus
 * against it. Learned on the server from logged intake against the weight
 * trend, a formula estimate until there is enough history. Hidden when the
 * server has no estimate (older servers lack the route).
 */
const EnergyBalanceCard: React.FC<EnergyBalanceCardProps> = ({
  selectedDate,
}) => {
  const { t } = useTranslation();
  const energyUnit = useEnergyUnit();
  const { data } = useAdaptiveTdee(selectedDate);
  const summary = data ? summarizeEnergyBalance(data) : null;
  if (!summary) return null;

  const unit = energyUnitLabel(energyUnit, t);
  const perDay = t('energyBalanceCard.perDay', {
    unit,
    defaultValue: '{{unit}}/day',
  });
  const balance = summary.dailyBalance;
  const balanceLabel =
    summary.direction === 'deficit'
      ? t('energyBalanceCard.deficit', { defaultValue: 'Avg deficit' })
      : summary.direction === 'surplus'
        ? t('energyBalanceCard.surplus', { defaultValue: 'Avg surplus' })
        : t('energyBalanceCard.balance', { defaultValue: 'Avg balance' });
  const balanceText =
    balance === null
      ? '–'
      : `${balance > 0 ? '+' : balance < 0 ? '−' : ''}${formatEnergyNumber(
          Math.abs(balance),
          energyUnit
        )}`;

  const stat = (
    label: string,
    value: string,
    className = 'text-text-primary',
    testID?: string
  ) => (
    <View className="flex-1">
      <Text className="text-text-secondary text-xs">{label}</Text>
      <Text testID={testID} className={`text-xl font-bold ${className}`}>
        {value}
      </Text>
      <Text className="text-text-muted text-xs">{perDay}</Text>
    </View>
  );

  return (
    <View
      testID="energy-balance-card"
      className="bg-surface rounded-xl p-4 mb-3 shadow-sm"
    >
      <Text className="font-bold text-text-secondary mb-2">
        {t('energyBalanceCard.title', {
          defaultValue: 'Expenditure & Balance',
        })}
      </Text>
      <View className="flex-row" style={{ gap: 12 }}>
        {stat(
          t('energyBalanceCard.tdee', { defaultValue: 'TDEE' }),
          formatEnergyNumber(summary.tdee, energyUnit),
          'text-text-primary',
          'energy-balance-tdee'
        )}
        {stat(
          t('energyBalanceCard.avgIntake', { defaultValue: 'Avg intake' }),
          summary.avgIntake === null
            ? '–'
            : formatEnergyNumber(summary.avgIntake, energyUnit)
        )}
        {stat(
          balanceLabel,
          balanceText,
          summary.direction
            ? BALANCE_COLOR[summary.direction]
            : 'text-text-primary',
          'energy-balance-balance'
        )}
      </View>
      <Text className="text-text-muted text-xs mt-2">
        {summary.adaptive
          ? t('energyBalanceCard.adaptiveNote', {
              days: summary.daysOfData,
              defaultValue:
                'Averages over the {{days}} logged days behind this estimate, against your weight trend.',
            })
          : t('energyBalanceCard.formulaNote', {
              defaultValue:
                'Formula estimate from your profile. Log food and weigh in regularly for a few weeks to learn your real expenditure.',
            })}
      </Text>
    </View>
  );
};

export default EnergyBalanceCard;
