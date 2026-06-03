import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const MoonIcon = memo(function MoonIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export default MoonIcon;
