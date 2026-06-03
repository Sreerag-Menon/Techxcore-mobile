import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const TrainingIcon = memo(function TrainingIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.textSecondary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4v16M18 4v16M6 12h12M3 6h3M18 6h3M3 18h3M18 18h3" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
export default TrainingIcon;
