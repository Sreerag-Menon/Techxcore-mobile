import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import Input from '@/components/Input';

interface FormDatePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [
    digits.slice(0, 4),
    digits.slice(4, 6),
    digits.slice(6, 8),
  ].filter(Boolean);

  return parts.join('-');
}

export default function FormDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'YYYY-MM-DD',
}: FormDatePickerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={typeof field.value === 'string' ? field.value : ''}
          onChangeText={(value) => field.onChange(formatDateInput(value))}
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={10}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
