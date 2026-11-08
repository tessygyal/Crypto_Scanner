import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChoiceChip } from '@/components/choice-chip';
import { Disclaimer } from '@/components/disclaimer';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SCHEME_QUESTIONS } from '@/utils/risk/scheme-scorecard';
import { checkTokenInput } from '@/utils/token';
import { analyzeUrl } from '@/utils/risk/url-analysis';

type Mode = 'link' | 'token' | 'scheme';

const linkSchema = z.object({
  url: z.string().trim().min(1, 'Paste a link to check.').max(2048, 'That link is too long to check.'),
});
type LinkForm = z.infer<typeof linkSchema>;

/** Made-up addresses that show what the checker looks for. */
const EXAMPLES = ['http://binance-airdrop.xyz/claim', 'https://b1nance.com/login', 'https://www.binance.com'];

export default function CheckScreen() {
  const [mode, setMode] = useState<Mode>('link');

  return (
    <Screen
      hero={{
        icon: 'shield-checkmark',
        title: 'Check before you pay',
        subtitle: 'Check a link or a crypto token you were sent, or answer a few questions about an offer.',
      }}>
      <View className="flex-row gap-sm" accessibilityRole="radiogroup" accessibilityLabel="What do you want to check?">
        <ChoiceChip label="Link" selected={mode === 'link'} onPress={() => setMode('link')} />
        <ChoiceChip label="Token" selected={mode === 'token'} onPress={() => setMode('token')} />
        <ChoiceChip label="Offer questions" selected={mode === 'scheme'} onPress={() => setMode('scheme')} />
      </View>

      {mode === 'link' ? <LinkCheck /> : mode === 'token' ? <TokenCheck /> : <SchemeCheck />}

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
      <Button label="Scan a QR code" variant="secondary" onPress={() => router.push('/scan')} fullWidth />

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

const tokenSchema = z.object({
  token: z.string().superRefine((value, ctx) => {
    const checked = checkTokenInput(value);
    if (!checked.ok) ctx.addIssue({ code: 'custom', message: checked.error });
  }),
});
type TokenForm = z.infer<typeof tokenSchema>;

function TokenCheck() {
  const { control, handleSubmit } = useForm<TokenForm>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: '' },
  });

  const onSubmit = handleSubmit(({ token }) => {
    router.push({ pathname: '/check-result', params: { type: 'token', input: token.trim() } });
  });

  return (
    <View className="gap-md">
      <TextField
        control={control}
        name="token"
        label="Token name, symbol or contract address"
        placeholder="e.g. USDT, or 0x…"
        hint="Looked up on CoinGecko, a crypto price tracker. A contract address is more reliable than a name, which anyone can copy."
        autoComplete="off"
        returnKeyType="search"
        maxLength={100}
        onSubmitEditing={() => onSubmit()}
      />
      <Button label="Check token" onPress={onSubmit} fullWidth />
      <Card className="gap-xs">
        <ThemedText variant="smallBold">Where to find the contract address</ThemedText>
        <ThemedText variant="small" color="textSecondary">
          Ask the person promoting the token, or look in the token&apos;s details in your wallet app. It starts with
          &quot;0x&quot; (Ethereum, BNB Chain, Polygon, Base), &quot;T&quot; (Tron), or is a long code (Solana).
        </ThemedText>
      </Card>
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
        <Card key={q.id}>
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
        </Card>
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
