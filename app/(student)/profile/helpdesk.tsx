import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  EmptyState,
  ErrorState,
  HelpdeskTicketCard,
  LoadingScreen,
} from '@/components';
import { ScreenLayout } from '@/layouts';
import { useAppSelector } from '@/redux';
import {
  fetchMemberTickets,
  isTicketResolved,
  reopenHelpdeskTicket,
} from '@/services/profile';
import type { HelpdeskTicket } from '@/types/user.types';
import { useTheme } from '@/theme';

type StatusFilter = 'all' | 'pending' | 'resolved';
type SortMode = 'newest' | 'oldest' | 'type';

export default function HelpdeskScreen() {
  const { colors, fontFamily } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.user.profile);

  const memberId = profile?.member_id ?? authUser?.member_id;
  const organizationId =
    profile?.organization_id ?? authUser?.organization_id ?? 0;
  const goiId = profile?.goi_id ?? authUser?.goi_id;

  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!memberId || !organizationId) {
      setError('Member session is missing.');
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const rows = await fetchMemberTickets({
        memberId,
        organizationId,
        goiId,
      });
      setTickets(rows);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load helpdesk tickets.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goiId, memberId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = [...tickets];

    if (statusFilter === 'pending') {
      rows = rows.filter((ticket) => !isTicketResolved(ticket));
    } else if (statusFilter === 'resolved') {
      rows = rows.filter((ticket) => isTicketResolved(ticket));
    }

    rows.sort((a, b) => {
      if (sortMode === 'type') {
        return a.ticket_type.localeCompare(b.ticket_type);
      }
      const aTime = a.created_on ? Date.parse(a.created_on) : a.ticket_id;
      const bTime = b.created_on ? Date.parse(b.created_on) : b.ticket_id;
      return sortMode === 'oldest' ? aTime - bTime : bTime - aTime;
    });

    return rows;
  }, [sortMode, statusFilter, tickets]);

  const handleReopen = async (ticketId: number) => {
    setReopeningId(ticketId);
    try {
      await reopenHelpdeskTicket(ticketId);
      Toast.show({ type: 'success', text1: 'Ticket re-opened' });
      await load();
    } catch (reopenError) {
      Toast.show({
        type: 'error',
        text1: 'Re-open failed',
        text2:
          reopenError instanceof Error
            ? reopenError.message
            : 'Unable to re-open ticket.',
      });
    } finally {
      setReopeningId(null);
    }
  };

  if (isLoading) return <LoadingScreen label="Loading helpdesk..." />;

  if (error && tickets.length === 0) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState title="Helpdesk unavailable" message={error} onRetry={load} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      refreshing={isRefreshing}
      onRefresh={() => {
        setIsRefreshing(true);
        void load();
      }}
    >
      <View style={{ gap: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['all', 'All'],
              ['pending', 'Pending'],
              ['resolved', 'Resolved'],
            ] as const
          ).map(([value, label]) => {
            const active = statusFilter === value;
            return (
              <Pressable
                key={value}
                onPress={() => setStatusFilter(value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.onPrimary : colors.text,
                    fontSize: 13,
                    fontFamily: fontFamily.medium,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['newest', 'Newest'],
              ['oldest', 'Oldest'],
              ['type', 'Type A–Z'],
            ] as const
          ).map(([value, label]) => {
            const active = sortMode === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSortMode(value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primaryLight : colors.surfaceRaised,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.primaryDark : colors.textSecondary,
                    fontSize: 12,
                    fontFamily: fontFamily.medium,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            message="When you submit helpdesk requests, they will appear here."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((ticket) => (
              <HelpdeskTicketCard
                key={ticket.ticket_id}
                ticket={ticket}
                reopening={reopeningId === ticket.ticket_id}
                onReopen={handleReopen}
              />
            ))}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}
