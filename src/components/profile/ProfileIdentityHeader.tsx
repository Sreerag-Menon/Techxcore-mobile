import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Avatar from '@/components/Avatar';
import { useTheme } from '@/theme';

export interface ProfileIdentityHeaderProps {
  name: string;
  email?: string;
  memberType?: string;
  registrationNo?: string;
  className?: string;
  imageUrl?: string;
  onPressPhoto?: () => void;
  uploading?: boolean;
}

const ProfileIdentityHeader = memo(function ProfileIdentityHeader({
  name,
  email,
  memberType,
  registrationNo,
  className,
  imageUrl,
  onPressPhoto,
  uploading = false,
}: ProfileIdentityHeaderProps) {
  const { colors, fontFamily } = useTheme();

  const chips = [
    memberType,
    className ? `Class ${className}` : undefined,
    registrationNo ? `Reg ${registrationNo}` : undefined,
  ].filter(Boolean) as string[];

  return (
    <View
      style={{
        alignItems: 'center',
        gap: 14,
        paddingVertical: 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        onPress={onPressPhoto}
        disabled={!onPressPhoto || uploading}
        style={{ position: 'relative' }}
      >
        <Avatar imageUrl={imageUrl} name={name} size="xl" />
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.background,
          }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Ionicons name="camera" size={14} color={colors.onPrimary} />
          )}
        </View>
      </Pressable>

      <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 16 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 24,
            lineHeight: 30,
            fontFamily: fontFamily.bold,
            letterSpacing: -0.3,
            textAlign: 'center',
          }}
        >
          {name || 'Student'}
        </Text>
        {email ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              fontFamily: fontFamily.regular,
              textAlign: 'center',
            }}
          >
            {email}
          </Text>
        ) : null}
      </View>

      {chips.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {chips.map((chip) => (
            <View
              key={chip}
              style={{
                backgroundColor: colors.primaryLight,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: 12,
                  fontFamily: fontFamily.medium,
                }}
              >
                {chip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

export default ProfileIdentityHeader;
