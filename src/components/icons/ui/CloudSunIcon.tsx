import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const CloudSunIcon = memo(function CloudSunIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v1M4.22 4.22l.71.71M2 12h1M4.22 19.78l.71-.71M17 8a5 5 0 00-9.9-1A4 4 0 006 15h11a3 3 0 000-6 3 3 0 00-3-3h0"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

export default CloudSunIcon;
