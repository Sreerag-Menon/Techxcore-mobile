import { Alert, StyleSheet, Text, View } from 'react-native';

import Button from '../../Button';
import { useTheme } from '../../../theme';

export type AssessmentToolbarProps = {
  unattempted: number;
  flagged: number;
  onSave: () => void;
  onSubmit: () => void;
  onExit: () => void;
  loading?: boolean;
};

export function AssessmentToolbar({
  unattempted,
  flagged,
  onSave,
  onSubmit,
  onExit,
  loading,
}: AssessmentToolbarProps) {
  const { colors } = useTheme();

  const handleSubmit = () => {
    const parts: string[] = [];
    if (unattempted > 0) parts.push(`${unattempted} unattempted`);
    if (flagged > 0) parts.push(`${flagged} flagged`);
    const detail = parts.length > 0 ? ` You have ${parts.join(' and ')}.` : '';
    Alert.alert('Submit assessment?', `Are you sure you want to submit?${detail}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: onSubmit },
    ]);
  };

  const handleExit = () => {
    Alert.alert('Exit assessment?', 'Your progress will be saved. Exit now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', onPress: onExit },
    ]);
  };

  return (
    <View style={[styles.bar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.stats, { color: colors.textSecondary }]}>
        {unattempted} left · {flagged} flagged
      </Text>
      <View style={styles.actions}>
        <Button title="Save" variant="outline" size="sm" onPress={onSave} loading={loading} />
        <Button title="Submit" size="sm" onPress={handleSubmit} loading={loading} />
        <Button title="Exit" variant="ghost" size="sm" onPress={handleExit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  stats: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
