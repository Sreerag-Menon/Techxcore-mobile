import { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const CalendarEventIcon = memo(function CalendarEventIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={stroke} strokeWidth={1.8} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
});
export default CalendarEventIcon;
