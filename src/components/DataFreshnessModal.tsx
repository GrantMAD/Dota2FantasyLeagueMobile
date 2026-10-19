import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useMobileTheme, themeVariables } from '@/src/lib/theme';
import { formatCountdown, formatRelativeTime, type FreshnessData, type JobDetailItem } from '@/src/lib/freshness';

export interface DataFreshnessModalProps {
  visible: boolean;
  onClose: () => void;
  freshness: FreshnessData | null | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
}

function formatExactTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Not available';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function getStatusBadgeStyle(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'synced':
      return {
        bg: '#064e3b',
        border: '#059669',
        text: '#34d399',
        label: 'Synced',
      };
    case 'running':
      return {
        bg: '#78350f',
        border: '#d97706',
        text: '#fde68a',
        label: 'Running',
      };
    case 'failed':
      return {
        bg: '#7f1d1d',
        border: '#dc2626',
        text: '#fca5a5',
        label: 'Failed',
      };
    case 'skipped':
      return {
        bg: '#1e293b',
        border: '#475569',
        text: '#94a3b8',
        label: 'Skipped',
      };
    default:
      return {
        bg: '#164e63',
        border: '#0891b2',
        text: '#67e8f9',
        label: 'Idle',
      };
  }
}

function JobCard({ job, isDark }: { job: JobDetailItem; isDark: boolean }) {
  const badge = getStatusBadgeStyle(job.status);
  const relativeLast = formatRelativeTime(job.lastRun);
  const countdownNext = formatCountdown(job.nextRun);

  return (
    <View
      style={{
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        borderColor: isDark ? '#1e293b' : '#cbd5e1',
      }}
      className="gap-2.5 rounded-2xl border p-4 shadow-sm"
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text
            style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            className="text-base font-bold"
          >
            {job.title}
          </Text>
          {job.schedule ? (
            <Text
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              className="mt-0.5 font-mono text-xs"
            >
              Cron: {job.schedule}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            backgroundColor: badge.bg,
            borderColor: badge.border,
          }}
          className="rounded-full border px-2.5 py-0.5"
        >
          <Text
            style={{ color: badge.text }}
            className="text-xs font-semibold capitalize"
          >
            {badge.label}
          </Text>
        </View>
      </View>

      {job.description ? (
        <Text
          style={{ color: isDark ? '#cbd5e1' : '#475569' }}
          className="text-xs leading-4"
        >
          {job.description}
        </Text>
      ) : null}

      <View
        style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
        className="mt-1 flex-row items-center justify-between border-t pt-2.5"
      >
        <View>
          <Text
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            className="text-[10px] font-semibold uppercase tracking-wider"
          >
            Last run
          </Text>
          <Text
            style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            className="mt-0.5 font-mono text-xs"
          >
            {relativeLast}
          </Text>
        </View>
        <View className="items-end">
          <Text
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            className="text-[10px] font-semibold uppercase tracking-wider"
          >
            Next run
          </Text>
          <Text
            style={{ color: '#14b8a6' }}
            className="mt-0.5 font-mono text-xs font-semibold"
          >
            {countdownNext}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function DataFreshnessModal({
  visible,
  onClose,
  freshness,
  isLoading,
  isRefetching,
  onRefresh,
}: DataFreshnessModalProps) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';

  const relativeUpdated = formatRelativeTime(freshness?.lastUpdated);
  const exactUpdated = formatExactTime(freshness?.lastUpdated);
  const countdownNext = formatCountdown(freshness?.nextUpdate);
  const exactNext = formatExactTime(freshness?.nextUpdate);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={themeVariables[theme]}
        className="flex-1 items-center justify-center bg-black/75 px-4 py-8"
      >
        <Pressable
          accessibilityLabel="Dismiss modal backdrop"
          className="absolute inset-0"
          onPress={onClose}
        />

        {/* Modal Card Dialog with solid background and clean borders */}
        <View
          accessibilityLabel="Live Data Sync Dialog"
          style={{
            backgroundColor: isDark ? '#020617' : '#ffffff',
            borderColor: isDark ? '#1e293b' : '#cbd5e1',
          }}
          className="w-full max-w-lg max-h-[85%] rounded-3xl border p-5 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2">
                <Text
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className="text-xl font-bold"
                >
                  Live Data Sync
                </Text>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : 'rgba(20, 184, 166, 0.1)',
                    borderColor: 'rgba(20, 184, 166, 0.4)',
                  }}
                  className="rounded-full border px-2 py-0.5"
                >
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                    Automated
                  </Text>
                </View>
              </View>
              <Text
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                className="mt-1 text-xs"
              >
                Background pipelines powering data on this screen
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Close sync details"
              accessibilityRole="button"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              }}
              className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
              onPress={onClose}
            >
              <Text
                style={{ color: isDark ? '#cbd5e1' : '#475569' }}
                className="text-sm font-bold"
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            className="mt-1"
            contentContainerClassName="gap-4 pb-2"
            showsVerticalScrollIndicator={false}
          >
            {/* Dual-stat summary card */}
            <View
              style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? '#1e293b' : '#cbd5e1',
              }}
              className="flex-row gap-3 rounded-2xl border p-4 shadow-sm"
            >
              <View
                style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
                className="flex-1 border-r pr-3"
              >
                <Text
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  className="text-[10px] font-semibold uppercase tracking-wider"
                >
                  Last Updated
                </Text>
                <Text
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className="mt-1 font-mono text-base font-bold"
                >
                  {relativeUpdated}
                </Text>
                <Text
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  className="mt-0.5 text-[11px]"
                >
                  {exactUpdated}
                </Text>
              </View>

              <View className="flex-1 pl-1">
                <Text
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  className="text-[10px] font-semibold uppercase tracking-wider"
                >
                  Next Scheduled Sync
                </Text>
                <Text
                  style={{ color: '#14b8a6' }}
                  className="mt-1 font-mono text-base font-bold"
                >
                  {countdownNext}
                </Text>
                <Text
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  className="mt-0.5 text-[11px]"
                >
                  {exactNext}
                </Text>
              </View>
            </View>

            {/* Jobs List Header */}
            <View className="flex-row items-center justify-between pt-1">
              <Text
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Active Job Pipelines ({freshness?.jobs.length ?? 0})
              </Text>
              {isRefetching ? (
                <View className="flex-row items-center gap-1.5">
                  <ActivityIndicator size="small" color="#14b8a6" />
                  <Text className="text-xs text-teal-400">Syncing...</Text>
                </View>
              ) : null}
            </View>

            {/* Jobs Cards */}
            {isLoading && !freshness ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator size="large" color="#14b8a6" />
                <Text
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  className="mt-3 text-xs"
                >
                  Fetching pipeline status...
                </Text>
              </View>
            ) : freshness?.jobs && freshness.jobs.length > 0 ? (
              freshness.jobs.map((job) => (
                <JobCard key={job.jobName} job={job} isDark={isDark} />
              ))
            ) : (
              <View
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                }}
                className="rounded-2xl border p-6 items-center"
              >
                <Text
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  className="text-xs"
                >
                  No specific background jobs tracked for this screen.
                </Text>
              </View>
            )}

            {/* Action Footer */}
            <View className="mt-2 gap-3 pt-2">
              <Text
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                className="text-center text-[11px]"
              >
                Data auto-refreshes every 2 minutes while active.
              </Text>

              <Pressable
                accessibilityLabel="Refresh sync status"
                accessibilityRole="button"
                style={{
                  backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : 'rgba(20, 184, 166, 0.1)',
                  borderColor: 'rgba(20, 184, 166, 0.4)',
                }}
                className="min-h-11 items-center justify-center rounded-xl border px-4 active:opacity-80"
                disabled={isRefetching}
                onPress={onRefresh}
              >
                <Text className="font-semibold text-teal-400">
                  {isRefetching ? 'Checking status...' : 'Refresh Status'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
