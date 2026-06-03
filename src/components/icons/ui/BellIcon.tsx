import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const BellIcon = memo(function BellIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export default BellIcon;
