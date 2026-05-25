import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { useTheme } from '@/theme';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export default function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = 'Select an option',
}: FormSelectProps<T>) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = options.find((option) => option.value === field.value);

        return (
          <>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              {label}
            </Text>

            <Pressable
              onPress={() => setVisible(true)}
              style={{
                borderWidth: 1.5,
                borderColor: fieldState.error ? colors.error : colors.border,
                borderRadius: 12,
                backgroundColor: colors.surface,
                minHeight: 52,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: selected ? colors.text : colors.textTertiary,
                  fontSize: 15,
                }}
              >
                {selected?.label ?? placeholder}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                v
              </Text>
            </Pressable>

            {fieldState.error ? (
              <Text
                style={{
                  color: colors.error,
                  fontSize: 12,
                  marginTop: 6,
                  marginLeft: 4,
                }}
              >
                {fieldState.error.message}
              </Text>
            ) : null}

            <Modal
              visible={visible}
              transparent
              animationType="fade"
              onRequestClose={() => setVisible(false)}
            >
              <Pressable
                onPress={() => setVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  justifyContent: 'center',
                  padding: 24,
                }}
              >
                <Pressable
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 20,
                    padding: 20,
                    gap: 16,
                    maxHeight: '70%',
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: '700',
                    }}
                  >
                    {label}
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8 }}>
                      {options.map((option) => {
                        const isSelected = option.value === field.value;

                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => {
                              field.onChange(option.value);
                              setVisible(false);
                            }}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 14,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected
                                ? colors.primaryLight
                                : colors.background,
                            }}
                          >
                            <Text
                              style={{
                                color: isSelected ? colors.primary : colors.text,
                                fontSize: 15,
                                fontWeight: isSelected ? '700' : '500',
                              }}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
          </>
        );
      }}
    />
  );
}
