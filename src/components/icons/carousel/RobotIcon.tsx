import { memo } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const RobotIcon = memo(function RobotIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2a2 2 0 012 2v1h3a3 3 0 013 3v9a3 3 0 01-3 3H7a3 3 0 01-3-3V8a3 3 0 013-3h3V4a2 2 0 012-2z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="11" r="1.2" fill={stroke} />
      <Circle cx="15" cy="11" r="1.2" fill={stroke} />
      <Path d="M9 15.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7 5.5V4M17 5.5V4" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
});
export default RobotIcon;
