import { router } from 'expo-router';

import { FormMessage } from '@/components/form/form-message';
import { ReportForm } from '@/components/reports/report-form';
import { Screen } from '@/components/screen';
import { useCreateReport } from '@/hooks/use-reports';

export default function NewReportScreen() {
  const create = useCreateReport();

  return (
    <Screen hasHeader>
      <FormMessage
        tone="success"
        title="How reports work"
        message="Your report stays private until a moderator approves it. After that, everyone using the app can see it with your display name — never your email."
      />
      <ReportForm
        submitLabel="Submit report"
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (report) => router.replace({ pathname: '/report/[id]', params: { id: report.id, created: '1' } }),
          })
        }
        isPending={create.isPending}
        error={create.error}
      />
    </Screen>
  );
}
