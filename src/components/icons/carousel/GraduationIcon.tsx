import { memo } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const GraduationIcon = memo(function GraduationIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 10L12 5 2 10l10 5 10-5z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 12.5v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 10v5" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
});
export default GraduationIcon;
