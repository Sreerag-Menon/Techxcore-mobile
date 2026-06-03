import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const HomeIcon = memo(function HomeIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.textSecondary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
export default HomeIcon;
