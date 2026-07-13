import { memo } from 'react';
import { Text, View } from 'react-native';

import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { useTheme } from '@/theme';
import type { HelpdeskTicket } from '@/types/user.types';
import { isTicketResolved } from '@/services/profile';

function formatTicketType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface HelpdeskTicketCardProps {
  ticket: HelpdeskTicket;
  onReopen?: (ticketId: number) => void;
  reopening?: boolean;
}

const HelpdeskTicketCard = memo(function HelpdeskTicketCard({
  ticket,
  onReopen,
  reopening = false,
}: HelpdeskTicketCardProps) {
  const { colors, fontFamily } = useTheme();
  const resolved = isTicketResolved(ticket);
  const title =
    ticket.suggestion_title ||
    ticket.course_name ||
    ticket.assessment_name ||
    formatTicketType(ticket.ticket_type);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            fontFamily: fontFamily.medium,
          }}
          numberOfLines={1}
        >
          {formatTicketType(ticket.ticket_type)}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
          {`#ILETK00${ticket.ticket_id}`}
        </Text>
      </View>

      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontFamily: fontFamily.bold,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>

      {ticket.ticket_desc ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            lineHeight: 18,
            fontFamily: fontFamily.regular,
          }}
          numberOfLines={3}
        >
          {ticket.ticket_desc}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Badge
          label={resolved ? 'Resolved' : 'In progress'}
          variant={resolved ? 'success' : 'warning'}
        />
        {ticket.created_on ? (
          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
            {ticket.created_on}
          </Text>
        ) : null}
      </View>

      {ticket.notes ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            fontFamily: fontFamily.regular,
          }}
        >
          Remarks: {ticket.notes}
        </Text>
      ) : null}

      {resolved && onReopen ? (
        <Button
          title="Re-open ticket"
          variant="outline"
          size="sm"
          loading={reopening}
          onPress={() => onReopen(ticket.ticket_id)}
        />
      ) : null}
    </View>
  );
});

export default HelpdeskTicketCard;
