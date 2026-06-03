import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const MicIcon = memo(function MicIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 11a7 7 0 01-14 0M12 18v4M8 22h8" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
export default MicIcon;
