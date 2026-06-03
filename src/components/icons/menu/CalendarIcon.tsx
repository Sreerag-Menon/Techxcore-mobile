import { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const CalendarIcon = memo(function CalendarIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.textSecondary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={stroke} strokeWidth={1.8} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
});
export default CalendarIcon;
