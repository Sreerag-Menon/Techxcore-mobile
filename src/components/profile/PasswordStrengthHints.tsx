import { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import type { PasswordRequirement } from '@/utils/passwordValidation';

export interface PasswordStrengthHintsProps {
  requirements: PasswordRequirement[];
}

const PasswordStrengthHints = memo(function PasswordStrengthHints({
  requirements,
}: PasswordStrengthHintsProps) {
  const { colors, fontFamily } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      {requirements.map((req) => (
        <View
          key={req.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons
            name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={req.met ? colors.success : colors.textTertiary}
          />
          <Text
            style={{
              color: req.met ? colors.text : colors.textSecondary,
              fontSize: 13,
              fontFamily: fontFamily.regular,
            }}
          >
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

export default PasswordStrengthHints;
