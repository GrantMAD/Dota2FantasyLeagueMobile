import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMobileTheme } from '@/src/lib/theme';
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
  { value: 'error', label: 'Error message' },
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
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
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
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<IssueScreenshot | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<number | null>(highlightedReportId ?? null);

  const historyByReport = new Map<number, IssueReportStatusHistory[]>();
  for (const entry of reportsQuery.data?.history ?? []) {
    const existing = historyByReport.get(entry.issue_report_id) ?? [];
    existing.push(entry);
    historyByReport.set(entry.issue_report_id, existing);
  }

  const submitMutation = useMutation({
    mutationFn: () => submitIssueReport({ title, category, description, pageUrl, screenshot }),
    onSuccess: async (report) => {
      setTitle('');
      setCategory('bug');
      setDescription('');
      setScreenshot(null);
      setFormError(null);
      setSuccessMessage(`Report #${report.id} was submitted. It is private to you and the support team; follow its status below.`);
      await queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
    },
    onError: (error: Error) => {
      setSuccessMessage(null);
      setFormError(error.message);
    },
  });

  async function chooseScreenshot() {
    setFormError(null);
    setSuccessMessage(null);
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
          <RefreshControl refreshing={reportsQuery.isRefetching} onRefresh={() => void reportsQuery.refetch()} tintColor={isDark ? '#2dd4bf' : '#0f766e'} />
        }
      >
        <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Help us improve</Text>
          <Text className="text-3xl font-bold text-slate-50">Report an issue</Text>
          <Text className="text-sm leading-6 text-slate-400">
            Tell us about a bug, error, or interface problem. Your report is private to you and the support team, and you can follow its status here.
          </Text>
        </View>

        <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-200">Issue type</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Issue type: ${categories.find((item) => item.value === category)?.label ?? 'Bug'}`}
              accessibilityHint="Opens issue type options"
              accessibilityState={{ expanded: categoryPickerVisible }}
              className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4"
              onPress={() => setCategoryPickerVisible(true)}
            >
              <Text className="text-base font-medium text-slate-50">
                {categories.find((item) => item.value === category)?.label ?? 'Bug'}
              </Text>
              <Text className="text-lg font-semibold text-slate-400">⌄</Text>
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-200">Short title</Text>
            <TextInput
              accessibilityLabel="Short title"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setSuccessMessage(null);
              }}
              maxLength={120}
              placeholder="What went wrong?"
              placeholderTextColor="#64748b"
              className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-slate-50"
            />
            <Text className="text-right text-xs text-slate-500">{title.length}/120</Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-200">What happened?</Text>
            <TextInput
              accessibilityLabel="What happened?"
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                setSuccessMessage(null);
              }}
              maxLength={5000}
              multiline
              textAlignVertical="top"
              placeholder="Describe what you expected and what happened instead."
              placeholderTextColor="#64748b"
              className="min-h-36 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-50"
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
              <Text className="text-xs leading-5 text-slate-500">JPEG, PNG, or WebP up to 5 MB. Screenshots are stored privately.</Text>
            )}
          </View>

          {formError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{formError}</Text> : null}
          {successMessage ? (
            <View accessibilityRole="alert" className="gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <Text className="font-semibold text-emerald-300">Report submitted</Text>
              <Text className="text-sm leading-5 text-slate-200">{successMessage}</Text>
            </View>
          ) : null}
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
            <Text className="text-xl font-bold text-slate-50">Your reports</Text>
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
                <Text className="font-semibold text-slate-50">Try again</Text>
              </Pressable>
            </View>
          ) : reportsQuery.data.reports.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-slate-700 p-6">
              <Text className="text-center text-sm text-slate-400">You have not submitted any issue reports yet.</Text>
            </View>
          ) : reportsQuery.data.reports.map((report) => (
            <View
              key={report.id}
              className={`overflow-hidden rounded-2xl border bg-slate-900 ${
                highlightedReportId === report.id ? 'border-brand-500' : 'border-slate-800'
              }`}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: expandedReportId === report.id }}
                onPress={() => setExpandedReportId((current) => current === report.id ? null : report.id)}
                className="gap-2 p-5"
              >
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="flex-1 text-lg font-bold text-slate-50">{report.title}</Text>
                  <Text className={`font-bold ${statusColors[report.status]}`}>{statusLabels[report.status]}</Text>
                </View>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-xs text-slate-500">
                    {report.category === 'ui' ? 'UI problem' : report.category === 'error' ? 'Error message' : 'Bug'}
                    {' · '}Submitted {formatDate(report.created_at)}
                  </Text>
                  <Text className="text-xs font-semibold text-brand-300">
                    {expandedReportId === report.id ? 'Hide details' : 'Show details'}
                  </Text>
                </View>
              </Pressable>
              {expandedReportId === report.id ? (
                <View className="gap-3 border-t border-slate-800 px-5 pb-5 pt-4">
                  {report.page_url ? <Text className="text-xs text-slate-500">{report.page_url}</Text> : null}
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
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        accessibilityViewIsModal
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={categoryPickerVisible}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close issue type picker"
            className="absolute inset-0"
            style={{ backgroundColor: isDark ? 'rgba(2, 6, 23, 0.82)' : 'rgba(15, 23, 42, 0.55)' }}
            onPress={() => setCategoryPickerVisible(false)}
          />
          <View
            className="gap-3 rounded-t-3xl border p-5"
            style={{
              paddingBottom: 28,
              backgroundColor: isDark ? '#020617' : '#ffffff',
              borderColor: isDark ? '#334155' : '#cbd5e1',
            }}
          >
            <View className="mb-1 items-center">
              <View className="h-1 w-10 rounded-full" style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }} />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                Select issue type
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close issue type picker"
                className="h-10 w-10 items-center justify-center rounded-full border"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                }}
                onPress={() => setCategoryPickerVisible(false)}
              >
                <Text className="text-xl" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>×</Text>
              </Pressable>
            </View>
            <View style={{ gap: 8 }}>
              {categories.map((item) => {
                const isSelected = category === item.value;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      minHeight: 52,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? (isDark ? '#14b8a6' : '#0f766e')
                        : (isDark ? '#334155' : '#cbd5e1'),
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(20, 184, 166, 0.16)' : '#ccfbf1')
                        : (isDark ? '#0f172a' : '#f8fafc'),
                      paddingHorizontal: 16,
                    }}
                    onPress={() => {
                      setCategory(item.value);
                      setCategoryPickerVisible(false);
                      setSuccessMessage(null);
                    }}
                  >
                    <Text style={{
                      color: isSelected
                        ? (isDark ? '#5eead4' : '#0f766e')
                        : (isDark ? '#e2e8f0' : '#1e293b'),
                      fontSize: 16,
                      fontWeight: '600',
                    }}>
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Text style={{ color: isDark ? '#5eead4' : '#0f766e', fontSize: 16, fontWeight: '700' }}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
