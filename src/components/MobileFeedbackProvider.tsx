import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMobileTheme } from '@/src/lib/theme';

type NoticeTone = 'success' | 'error' | 'info';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface Notice {
  title: string;
  message: string;
  tone: NoticeTone;
}

interface MobileFeedback {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  notify: (title: string, message: string, tone?: NoticeTone) => void;
}

const MobileFeedbackContext = createContext<MobileFeedback | null>(null);

export function MobileFeedbackProvider({ children }: PropsWithChildren) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationOptions | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmationResolver = useRef<((confirmed: boolean) => void) | null>(null);
  const palette = isDark
    ? {
        surface: '#0f172a',
        raised: '#1e293b',
        border: '#334155',
        text: '#f8fafc',
        secondary: '#cbd5e1',
        muted: '#94a3b8',
        accent: '#5eead4',
      }
    : {
        surface: '#ffffff',
        raised: '#f1f5f9',
        border: '#cbd5e1',
        text: '#0f172a',
        secondary: '#334155',
        muted: '#64748b',
        accent: '#0f766e',
      };

  const resolveConfirmation = useCallback((confirmed: boolean) => {
    const resolve = confirmationResolver.current;
    confirmationResolver.current = null;
    setConfirmation(null);
    resolve?.(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    confirmationResolver.current?.(false);
    confirmationResolver.current = resolve;
    setConfirmation(options);
  }), []);

  const notify = useCallback((title: string, message: string, tone: NoticeTone = 'success') => {
    if (timeout.current) clearTimeout(timeout.current);
    setNotice({ title, message, tone });
    timeout.current = setTimeout(() => {
      setNotice(null);
      timeout.current = null;
    }, 4500);
  }, []);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
    confirmationResolver.current?.(false);
    confirmationResolver.current = null;
  }, []);

  const noticeColor = notice?.tone === 'error'
    ? isDark ? '#fca5a5' : '#b91c1c'
    : notice?.tone === 'success'
      ? isDark ? '#6ee7b7' : '#047857'
      : palette.accent;

  return (
    <MobileFeedbackContext.Provider value={{ confirm, notify }}>
      {children}
      {notice ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000 }}
        >
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole={notice.tone === 'error' ? 'alert' : 'summary'}
            className="rounded-xl border px-4 py-3"
            style={{ backgroundColor: palette.surface, borderColor: palette.border, elevation: 12 }}
          >
            <Text style={{ color: noticeColor, fontWeight: '700' }}>{notice.title}</Text>
            <Text style={{ color: palette.secondary, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
              {notice.message}
            </Text>
          </View>
        </View>
      ) : null}
      <Modal
        accessibilityViewIsModal
        animationType="fade"
        onRequestClose={() => resolveConfirmation(false)}
        transparent
        visible={confirmation !== null}
      >
        {confirmation ? (
          <View className="flex-1 items-center justify-center bg-black/70 px-5">
            <Pressable
              accessibilityLabel="Dismiss confirmation"
              accessibilityRole="button"
              className="absolute inset-0"
              onPress={() => resolveConfirmation(false)}
            />
            <View
              accessibilityLabel={confirmation.title}
              className="w-full max-w-md rounded-2xl border p-5"
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            >
              <Text accessibilityRole="header" className="text-lg font-bold" style={{ color: palette.text }}>
                {confirmation.title}
              </Text>
              <Text className="mt-2 text-sm leading-5" style={{ color: palette.secondary }}>
                {confirmation.message}
              </Text>
              <View className="mt-5 flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 flex-1 items-center justify-center rounded-xl border px-3"
                  style={{ borderColor: palette.border, backgroundColor: palette.raised }}
                  onPress={() => resolveConfirmation(false)}
                >
                  <Text style={{ color: palette.secondary, fontWeight: '600' }}>
                    {confirmation.cancelLabel ?? 'Cancel'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 flex-1 items-center justify-center rounded-xl px-3"
                  style={{ backgroundColor: confirmation.destructive ? (isDark ? '#991b1b' : '#b91c1c') : palette.accent }}
                  onPress={() => resolveConfirmation(true)}
                >
                  <Text style={{ color: confirmation.destructive || isDark ? '#ffffff' : '#0f172a', fontWeight: '700' }}>
                    {confirmation.confirmLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </MobileFeedbackContext.Provider>
  );
}

export function useMobileFeedback(): MobileFeedback {
  const context = useContext(MobileFeedbackContext);
  if (!context) throw new Error('useMobileFeedback must be used within MobileFeedbackProvider');
  return context;
}
