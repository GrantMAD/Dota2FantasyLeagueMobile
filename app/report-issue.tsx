import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import {
  getIssueReports,
  submitIssueReport,
  type IssueReportCategory,
  type IssueReportStatus,
  type IssueReportStatusHistory,
  type IssueScreenshot,
} from '@/src/features/issue-reports/api';

const categories: { value: IssueReportCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'error', label: 'Error' },
  { value: 'ui', label: 'UI problem' },
];

const statusLabels: Record<IssueReportStatus, string> = {
  new: 'New',
  under_review: 'Under review',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const statusColors: Record<IssueReportStatus, string> = {
  new: 'text-amber-300',
  under_review: 'text-cyan-300',
  in_progress: 'text-sky-300',
  resolved: 'text-emerald-300',
  closed: 'text-slate-300',
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Date unavailable';
}

export default function ReportIssueScreen() {
  const params = useLocalSearchParams<{ reportId?: string | string[]; pageUrl?: string | string[] }>();
  const queryClient = useQueryClient();
  const reportIdValue = Array.isArray(params.reportId) ? params.reportId[0] : params.reportId;
  const highlightedReportId = reportIdValue && /^[1-9]\d*$/.test(reportIdValue)
    ? Number(reportIdValue)
    : undefined;
  const pageUrlParam = Array.isArray(params.pageUrl) ? params.pageUrl[0] : params.pageUrl;
  const pageUrl = pageUrlParam && pageUrlParam.startsWith('/') && !pageUrlParam.startsWith('//')
    ? pageUrlParam
    : '/report-issue';
  const reportsQuery = useQuery({
    queryKey: ['issue-reports', highlightedReportId],
    queryFn: () => getIssueReports(highlightedReportId),
    staleTime: 30_000,
  });
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IssueReportCategory>('bug');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<IssueScreenshot | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const historyByReport = new Map<number, IssueReportStatusHistory[]>();
  for (const entry of reportsQuery.data?.history ?? []) {
    const existing = historyByReport.get(entry.issue_report_id) ?? [];
    existing.push(entry);
    historyByReport.set(entry.issue_report_id, existing);
  }

  const submitMutation = useMutation({
    mutationFn: () => submitIssueReport({ title, category, description, pageUrl, screenshot }),
    onSuccess: async () => {
      setTitle('');
      setCategory('bug');
      setDescription('');
      setScreenshot(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  async function chooseScreenshot() {
    setFormError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('Allow photo library access to attach a screenshot.');
        return;
      }
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (selection.canceled) return;
      const asset = selection.assets[0];
      if (!asset) {
        setFormError('No screenshot was selected.');
        return;
      }
      const extension = asset.fileName?.split('.').pop()?.toLowerCase();
      const mimeType = asset.mimeType?.toLowerCase() ?? (
        extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : null
      );
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/webp') {
        setFormError('Choose a JPEG, PNG, or WebP screenshot.');
        return;
      }
      if (asset.fileSize !== null && asset.fileSize !== undefined && asset.fileSize > 5 * 1024 * 1024) {
        setFormError('Screenshots must be 5 MB or smaller.');
        return;
      }
      setScreenshot({
        uri: asset.uri,
        name: asset.fileName || `issue-screenshot.${mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]}`,
        mimeType,
        size: asset.fileSize ?? null,
      });
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to open the photo library.');
    }
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={reportsQuery.isRefetching} onRefresh={() => void reportsQuery.refetch()} tintColor="#14b8a6" />
        }
      >
        <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Help us improve</Text>
          <Text className="text-3xl font-bold text-white">Report an issue</Text>
          <Text className="text-sm leading-6 text-slate-400">
            Report a bug, error, or interface problem. You can attach a screenshot and follow the status of your report here.
          </Text>
        </View>

        <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-200">Issue type</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item.value }}
                  className={`min-h-10 justify-center rounded-full border px-4 ${
                    category === item.value ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
                  }`}
                  onPress={() => setCategory(item.value)}
                >
                  <Text className={`text-sm font-semibold ${category === item.value ? 'text-brand-300' : 'text-slate-300'}`}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-200">Short title</Text>
            <TextInput
              accessibilityLabel="Short title"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              placeholder="What went wrong?"
              placeholderTextColor="#64748b"
              className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
            />
            <Text className="text-right text-xs text-slate-500">{title.length}/120</Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-200">What happened?</Text>
            <TextInput
              accessibilityLabel="What happened?"
              value={description}
              onChangeText={setDescription}
              maxLength={5000}
              multiline
              textAlignVertical="top"
              placeholder="Describe what you expected and what happened instead."
              placeholderTextColor="#64748b"
              className="min-h-36 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
            />
            <Text className="text-right text-xs text-slate-500">{description.length}/5000</Text>
          </View>

          <View className="gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-h-11 self-start justify-center rounded-xl border border-slate-700 bg-slate-950 px-4"
              onPress={() => void chooseScreenshot()}
            >
              <Text className="font-semibold text-slate-200">{screenshot ? 'Change screenshot' : 'Add screenshot (optional)'}</Text>
            </Pressable>
            {screenshot ? (
              <View className="flex-row items-center gap-3 rounded-xl border border-slate-700 p-3">
                <Image accessibilityLabel="Selected screenshot preview" source={{ uri: screenshot.uri }} className="h-16 w-20 rounded-lg" resizeMode="cover" />
                <Text numberOfLines={2} className="flex-1 text-sm text-slate-300">{screenshot.name}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove screenshot"
                  className="min-h-10 justify-center px-2"
                  onPress={() => setScreenshot(null)}
                >
                  <Text className="font-semibold text-red-300">Remove</Text>
                </Pressable>
              </View>
            ) : (
              <Text className="text-xs leading-5 text-slate-500">JPEG, PNG, or WebP up to 5 MB.</Text>
            )}
          </View>

          {formError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{formError}</Text> : null}
          <Button
            label="Submit report"
            loading={submitMutation.isPending}
            disabled={title.trim().length < 5 || description.trim().length < 10}
            onPress={() => {
              setFormError(null);
              submitMutation.mutate();
            }}
          />
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">Your reports</Text>
            <Pressable accessibilityRole="button" onPress={() => void reportsQuery.refetch()}>
              <Text className="font-semibold text-brand-300">Refresh</Text>
            </Pressable>
          </View>
          {reportsQuery.isPending ? (
            <View accessibilityLabel="Loading issue reports" className="items-center py-10">
              <ActivityIndicator color="#14b8a6" />
            </View>
          ) : reportsQuery.isError ? (
            <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
              <Text className="font-semibold text-red-200">Reports unavailable</Text>
              <Text className="text-sm leading-5 text-red-100">{reportsQuery.error.message}</Text>
              <Pressable accessibilityRole="button" onPress={() => void reportsQuery.refetch()}>
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : reportsQuery.data.reports.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-slate-700 p-6">
              <Text className="text-center text-sm text-slate-400">You have not submitted any issue reports yet.</Text>
            </View>
          ) : reportsQuery.data.reports.map((report) => (
            <View
              key={report.id}
              className={`gap-3 rounded-2xl border bg-slate-900 p-5 ${
                highlightedReportId === report.id ? 'border-brand-500' : 'border-slate-800'
              }`}
            >
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="flex-1 text-lg font-bold text-white">{report.title}</Text>
                <Text className={`font-bold ${statusColors[report.status]}`}>{statusLabels[report.status]}</Text>
              </View>
              <Text className="text-xs text-slate-500">
                {report.category === 'ui' ? 'UI problem' : report.category === 'error' ? 'Error' : 'Bug'}
                {' · '}Submitted {formatDate(report.created_at)}
                {report.page_url ? ` · ${report.page_url}` : ''}
              </Text>
              <Text className="text-sm leading-6 text-slate-300">{report.description}</Text>
              {report.screenshot_url ? (
                <Image accessibilityLabel={`Screenshot attached to report ${report.id}`} source={{ uri: report.screenshot_url }} className="h-48 w-full rounded-xl" resizeMode="contain" />
              ) : null}
              {report.resolution_note ? (
                <View className="gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <Text className="text-xs font-bold uppercase tracking-wide text-emerald-300">Team update</Text>
                  <Text className="text-sm leading-5 text-slate-300">{report.resolution_note}</Text>
                </View>
              ) : null}
              {(historyByReport.get(report.id)?.length ?? 0) > 0 ? (
                <View className="gap-2 border-l border-slate-700 pl-3">
                  {historyByReport.get(report.id)?.map((entry) => (
                    <Text key={entry.id} className="text-xs leading-5 text-slate-400">
                      {entry.old_status ? `${statusLabels[entry.old_status]} → ` : 'Submitted as '}
                      {statusLabels[entry.new_status]} · {formatDate(entry.created_at)}
                      {entry.resolution_note ? `\n${entry.resolution_note}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
