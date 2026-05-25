import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';

import Button from '@/components/Button';
import { useTheme } from '@/theme';

interface FormImagePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export default function FormImagePicker<T extends FieldValues>({
  control,
  name,
  label,
}: FormImagePickerProps<T>) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const imageUri = typeof field.value === 'string' ? field.value : '';

        const handlePickImage = async () => {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (!permission.granted) {
            Alert.alert(
              'Permission required',
              'Photo access is needed to select a profile image.',
            );
            return;
          }

          setLoading(true);

          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]?.uri) {
              field.onChange(result.assets[0].uri);
            }
          } catch {
            Alert.alert(
              'Image picker error',
              'Unable to open the image picker right now.',
            );
          } finally {
            setLoading(false);
          }
        };

        return (
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {label}
            </Text>

            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: colors.border,
                }}
              />
            ) : null}

            <Button
              title={imageUri ? 'Change Photo' : 'Select Photo'}
              onPress={handlePickImage}
              variant="outline"
              loading={loading}
            />
          </View>
        );
      }}
    />
  );
}
