import { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

interface IconProps { size?: number; color?: string; }

const FeePaymentIcon = memo(function FeePaymentIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.textSecondary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2" stroke={stroke} strokeWidth={1.8} />
      <Path d="M2 10h20" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
});
export default FeePaymentIcon;
