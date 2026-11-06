import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { Disclaimer } from '@/components/disclaimer';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SCHEME_QUESTIONS } from '@/utils/risk/scheme-scorecard';
import { analyzeUrl } from '@/utils/risk/url-analysis';

type Mode = 'link' | 'scheme';

const linkSchema = z.object({
  url: z.string().trim().min(1, 'Paste a link to check.').max(2048, 'That link is too long to check.'),
});
type LinkForm = z.infer<typeof linkSchema>;

/** Made-up addresses that show what the checker looks for. */
const EXAMPLES = ['http://binance-airdrop.xyz/claim', 'https://b1nance.com/login', 'https://www.binance.com'];

export default function CheckScreen() {
  const [mode, setMode] = useState<Mode>('link');

  return (
    <Screen>
      <View className="gap-sm">
        <ThemedText variant="title">Check</ThemedText>
        <ThemedText color="textSecondary">
          Check a link you were sent, or answer a few questions about an offer, to see its risk indicators.
        </ThemedText>
      </View>

      <View className="flex-row gap-sm" accessibilityRole="radiogroup" accessibilityLabel="What do you want to check?">
        <ChoiceChip label="Link" selected={mode === 'link'} onPress={() => setMode('link')} />
        <ChoiceChip label="Offer questions" selected={mode === 'scheme'} onPress={() => setMode('scheme')} />
      </View>

      {mode === 'link' ? <LinkCheck /> : <SchemeCheck />}

      <Disclaimer />
    </Screen>
  );
}

function LinkCheck() {
  const { control, handleSubmit, setError, setValue } = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
    defaultValues: { url: '' },
  });

  const onSubmit = handleSubmit(({ url }) => {
    const analysis = analyzeUrl(url);
    if (!analysis.ok) {
      setError('url', { message: analysis.error });
      return;
    }
    router.push({ pathname: '/check-result', params: { type: 'url', input: url.trim() } });
  });

  return (
    <View className="gap-md">
      <TextField
        control={control}
        name="url"
        label="Link"
        placeholder="https://…"
        hint="Checked on your phone — the link is not opened."
        keyboardType="url"
        autoComplete="off"
        textContentType="URL"
        returnKeyType="search"
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Check link" onPress={onSubmit} fullWidth />

      <View className="gap-sm">
        <ThemedText variant="smallBold" color="textSecondary">
          Try an example
        </ThemedText>
        {EXAMPLES.map((example) => (
          <Pressable
            key={example}
            onPress={() => setValue('url', example, { shouldValidate: true })}
            accessibilityRole="button"
            accessibilityLabel={`Use example ${example}`}
            className="rounded-sm border border-border bg-surface px-md py-sm active:opacity-70">
            <ThemedText variant="small" numberOfLines={1}>
              {example}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SchemeCheck() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const yes = SCHEME_QUESTIONS.filter((q) => answers[q.id]).map((q) => q.id);
  const answered = Object.keys(answers).length;

  const set = (id: string, value: boolean) => setAnswers((a) => ({ ...a, [id]: value }));

  return (
    <View className="gap-md">
      <ThemedText color="textSecondary">
        Think about the offer, investment or person that contacted you. Answer what you know — leave a
        question if you&apos;re not sure.
      </ThemedText>

      {SCHEME_QUESTIONS.map((q, i) => (
        <View key={q.id} className="border rounded-md p-md gap-sm border-border bg-surface">
          <ThemedText variant="bodyBold" nativeID={`q-${q.id}`}>
            {i + 1}. {q.question}
          </ThemedText>
          <View className="flex-row gap-sm" accessibilityRole="radiogroup" aria-labelledby={`q-${q.id}`}>
            <ChoiceChip
              label="Yes"
              selected={answers[q.id] === true}
              onPress={() => set(q.id, true)}
              accessibilityLabel={`Yes: ${q.question}`}
            />
            <ChoiceChip
              label="No"
              selected={answers[q.id] === false}
              onPress={() => set(q.id, false)}
              accessibilityLabel={`No: ${q.question}`}
            />
          </View>
        </View>
      ))}

      <ThemedText variant="small" color="textSecondary">
        {answered} of {SCHEME_QUESTIONS.length} answered
      </ThemedText>
      <Button
        label="See results"
        onPress={() => router.push({ pathname: '/check-result', params: { type: 'scheme', answers: yes.join(',') } })}
        disabled={answered === 0}
        fullWidth
      />
      {answered > 0 && (
        <Button label="Clear answers" variant="secondary" onPress={() => setAnswers({})} fullWidth />
      )}
    </View>
  );
}
