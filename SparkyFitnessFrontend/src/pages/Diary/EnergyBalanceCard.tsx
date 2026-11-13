import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { summarizeEnergyBalance } from '@workspace/shared';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAdaptiveTdee } from '@/hooks/Diary/useDailyProgress';

interface EnergyBalanceCardProps {
  date: string;
}

/**
 * Estimated expenditure (TDEE) and the average daily deficit or surplus
 * against it. The estimate is the server's adaptive one, learned from logged
 * intake against the weight trend, and a formula estimate until there is
 * enough history.
 */
const EnergyBalanceCard = ({ date }: EnergyBalanceCardProps) => {
  const { t } = useTranslation();
  const { energyUnit, convertEnergy, getEnergyUnitString } = usePreferences();
  const { data, isLoading, isError } = useAdaptiveTdee(date);
  const summary = data ? summarizeEnergyBalance(data) : null;
  const unit = getEnergyUnitString(energyUnit);
  const show = (kcal: number) =>
    Math.round(convertEnergy(kcal, 'kcal', energyUnit)).toLocaleString();

  const title = (
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <Scale className="h-4 w-4" />
        {t('diary.energyBalance.title', 'Expenditure & Balance')}
      </CardTitle>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card className="h-full">
        {title}
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card className="h-full">
        {title}
        <CardContent className="text-sm text-muted-foreground">
          {t(
            'diary.energyBalance.unavailable',
            'Your expenditure estimate is not available right now.'
          )}
        </CardContent>
      </Card>
    );
  }

  const balance = summary.dailyBalance;
  const balanceLabel =
    summary.direction === 'deficit'
      ? t('diary.energyBalance.deficit', 'Avg daily deficit')
      : summary.direction === 'surplus'
        ? t('diary.energyBalance.surplus', 'Avg daily surplus')
        : t('diary.energyBalance.balance', 'Avg daily balance');
  const balanceClass =
    summary.direction === 'deficit'
      ? 'text-green-600 dark:text-green-400'
      : summary.direction === 'surplus'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';

  return (
    <Card className="h-full" data-testid="energy-balance-card">
      {title}
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">
              {t('diary.energyBalance.tdee', 'TDEE')}
            </div>
            <div
              className="text-2xl font-bold"
              data-testid="energy-balance-tdee"
            >
              {show(summary.tdee)}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('diary.energyBalance.perDay', '{{unit}}/day', { unit })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t('diary.energyBalance.avgIntake', 'Avg intake')}
            </div>
            <div className="text-2xl font-bold">
              {summary.avgIntake === null ? '–' : show(summary.avgIntake)}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('diary.energyBalance.perDay', '{{unit}}/day', { unit })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{balanceLabel}</div>
            <div
              className={`text-2xl font-bold ${balanceClass}`}
              data-testid="energy-balance-balance"
            >
              {balance === null
                ? '–'
                : `${balance > 0 ? '+' : balance < 0 ? '−' : ''}${show(
                    Math.abs(balance)
                  )}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('diary.energyBalance.perDay', '{{unit}}/day', { unit })}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {summary.adaptive
            ? t(
                'diary.energyBalance.adaptiveNote',
                'Averages over the {{days}} logged days behind this estimate, against your weight trend.',
                { days: summary.daysOfData }
              )
            : t(
                'diary.energyBalance.formulaNote',
                'Formula estimate from your profile and activity level. Log food and weigh in regularly for a few weeks to learn your real expenditure.'
              )}
        </p>
      </CardContent>
    </Card>
  );
};

export default EnergyBalanceCard;
