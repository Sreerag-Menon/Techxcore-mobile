import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import Button from '../../Button';
import Input from '../../Input';
import { useUploadAssignmentFileMutation } from '../../../redux/api/assessmentApi';
import type { AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

export type AssignmentQuestionProps = {
  question: AssessmentSessionQuestion;
  onAnswered: (selection: string[]) => void;
};

export function AssignmentQuestion({ question, onAnswered }: AssignmentQuestionProps) {
  const { colors } = useTheme();
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadAssignment] = useUploadAssignmentFileMutation();
  const progress = useSharedValue(0);

  const existingSelection = question.user_selection ?? [];
  const isSubmitted = existingSelection.length > 0 && Boolean(existingSelection[0]);

  useEffect(() => {
    if (isSubmitted) {
      setFileName(existingSelection[0] ?? '');
      setNote(existingSelection[1] ?? '');
      setFileUrl(existingSelection[3] ?? '');
    } else {
      setNote('');
      setFileName('');
      setFileUrl('');
    }
  }, [existingSelection, isSubmitted, question.id]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);
      progress.value = 0.1;

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);
      formData.append('std_assignment_type', '1');

      progress.value = withTiming(0.5, { duration: 400 });
      const rsp = await uploadAssignment({ formData }).unwrap();
      progress.value = withTiming(1, { duration: 300 });

      setFileName(rsp.fileName ?? asset.name);
      setFileUrl(rsp.fileUrl ?? '');
      setUploadProgress(1);
    } catch {
      setFileName('');
      setFileUrl('');
    } finally {
      setUploading(false);
    }
  }, [progress, uploadAssignment]);

  const handleSubmit = useCallback(() => {
    if (!fileName && !note.trim()) return;
    onAnswered([fileName, note.trim(), '', fileUrl]);
  }, [fileName, fileUrl, note, onAnswered]);

  const canSubmit = useMemo(
    () => Boolean(fileName || note.trim()) && !uploading,
    [fileName, note, uploading],
  );

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="document-text" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.fileName, { color: colors.text }]}>{fileName || 'Submitted'}</Text>
            {note ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{note}</Text>
            ) : null}
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Assignment submitted</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button
        title={uploading ? 'Uploading…' : 'Upload file'}
        onPress={() => void handlePickFile()}
        loading={uploading}
        fullWidth
      />

      {uploading || uploadProgress > 0 ? (
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.progressFill, progressStyle, { backgroundColor: colors.primary }]}
          />
        </View>
      ) : null}

      {fileName ? (
        <View style={[styles.fileCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Ionicons name="document" size={20} color={colors.primary} />
          <Text style={[styles.fileName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {fileName}
          </Text>
          <Pressable onPress={() => { setFileName(''); setFileUrl(''); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <Input
        label="Notes (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={4}
        placeholder="Add a comment about your submission"
      />

      <Button title="Submit assignment" onPress={handleSubmit} disabled={!canSubmit} fullWidth />

      {uploading ? <ActivityIndicator color={colors.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  fileName: { fontSize: 14, fontWeight: '600' },
});
