import { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components';

const DashboardSkeleton = memo(function DashboardSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8, paddingTop: insets.top + 12 }}>
        <Skeleton variant="text" width="70%" height={28} />
        <Skeleton variant="text" width="55%" height={14} />
        <Skeleton variant="text" width="40%" height={12} />
      </View>

      <Skeleton variant="rectangular" width="100%" height={176} borderRadius={16} />

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        {[0, 1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            variant="rectangular"
            width="48%"
            height={120}
            borderRadius={16}
          />
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <Skeleton variant="text" width="40%" height={20} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton
              key={item}
              variant="rectangular"
              width={64}
              height={64}
              borderRadius={20}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1].map((item) => (
          <Skeleton
            key={item}
            variant="rectangular"
            width={280}
            height={160}
            borderRadius={16}
          />
        ))}
      </View>

      {[0, 1].map((item) => (
        <Skeleton
          key={item}
          variant="rectangular"
          width="100%"
          height={100}
          borderRadius={16}
        />
      ))}
    </View>
  );
});

export default DashboardSkeleton;
