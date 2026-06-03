import { memo } from 'react';
import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const SunIcon = memo(function SunIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="2" x2="12" y2="4" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="20" x2="12" y2="22" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="2" y1="12" x2="4" y2="12" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="20" y1="12" x2="22" y2="12" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
});

export default SunIcon;
