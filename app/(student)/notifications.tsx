import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
} from '../../src/components';
import { ScreenLayout } from '../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../src/redux';
import {
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from '../../src/redux/slices/notificationSlice';
import { useTheme } from '../../src/theme';
import { formatDate, timeAgo } from '../../src/utils';

export default function NotificationsScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { notifications, isLoading, error, unreadCount } = useAppSelector(
    (state) => state.notification,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    await dispatch(fetchNotifications()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadNotifications();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadNotifications]);

  return (
    <ScreenLayout refreshing={isRefreshing} onRefresh={onRefresh}>
      <View style={{ gap: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 28,
                fontWeight: '700',
              }}
            >
              Notifications
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              {unreadCount} unread updates from your LMS workspace.
            </Text>
          </View>
          {notifications.length > 0 ? (
            <Button
              title="Mark all read"
              onPress={() => dispatch(markAllAsRead())}
              variant="outline"
              size="sm"
            />
          ) : null}
        </View>

        {error && !notifications.length && !isLoading ? (
          <ErrorState
            title="Notifications unavailable"
            message={error}
            onRetry={() => {
              void loadNotifications();
            }}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            message="You are all caught up for now."
          />
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.notification_id}
              variant={notification.is_read ? 'default' : 'elevated'}
              padding="lg"
              onPress={() => dispatch(markAsRead(notification.notification_id))}
            >
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    >
                      {notification.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      {notification.message}
                    </Text>
                  </View>
                  <Badge
                    label={notification.is_read ? 'Read' : 'New'}
                    variant={notification.is_read ? 'neutral' : 'primary'}
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {timeAgo(notification.created_at)}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {formatDate(notification.created_at)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScreenLayout>
  );
}
