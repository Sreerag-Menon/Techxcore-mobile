import React, { memo } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { normalizeMenuName } from '@/navigation/menuRouteMap';

import {
  HomeIcon,
  CoursesIcon,
  AssessmentIcon,
  LiveIcon,
  TrainingIcon,
  CalendarIcon,
  MessagesIcon,
  FeePaymentIcon,
  AttendanceIcon,
  EventsIcon,
  ShelfIcon,
  PlaybackIcon,
  SettingsIcon,
  SurveyIcon,
  RubricsIcon,
  TimetableIcon,
  JoinIcon,
  OldCoursesIcon,
} from './index';

type SvgIconComponent = React.ComponentType<{ size?: number; color?: string }>;

/** Maps backend logo keys to icon components */
const LOGO_ICON_MAP: Record<string, SvgIconComponent> = {
  IconMenuHome: HomeIcon,
  IconMenuProgram: CoursesIcon,
  IconMenuAssessment: AssessmentIcon,
  IconProfileSettings: SettingsIcon,
  IconMenuLive: LiveIcon,
  IconPlayProperty: PlaybackIcon,
  IconMenuTrainingZone: TrainingIcon,
  IconMenuShelf: ShelfIcon,
  IconCalendarMenu: CalendarIcon,
  IconTimeTable: TimetableIcon,
  IconMessages: MessagesIcon,
  IconFeePayment: FeePaymentIcon,
  IconSurvey: SurveyIcon,
  IconRubrics: RubricsIcon,
  IconAttendance: AttendanceIcon,
  IconEvents: EventsIcon,
  IconMenuOldCourse: OldCoursesIcon,
};

/** Fallback resolution by menu name when logo key is missing */
function iconFromMenuName(menuName: string): SvgIconComponent {
  const lower = normalizeMenuName(menuName);
  if (/home/i.test(lower)) return HomeIcon;
  if (/calendar/i.test(lower)) return CalendarIcon;
  if (/timetable|time table|schedule/i.test(lower)) return TimetableIcon;
  if (/messages?|chat/i.test(lower)) return MessagesIcon;
  if (/attendance/i.test(lower)) return AttendanceIcon;
  if (/live/i.test(lower)) return LiveIcon;
  if (/training/i.test(lower)) return TrainingIcon;
  if (/shelf|knowledge/i.test(lower)) return ShelfIcon;
  if (/fee|payment/i.test(lower)) return FeePaymentIcon;
  if (/survey/i.test(lower)) return SurveyIcon;
  if (/rubric/i.test(lower)) return RubricsIcon;
  if (/event|announcement/i.test(lower)) return EventsIcon;
  if (/old course/i.test(lower)) return OldCoursesIcon;
  if (/join/i.test(lower)) return JoinIcon;
  if (/playback/i.test(lower)) return PlaybackIcon;
  if (/assessment|test|exam/i.test(lower)) return AssessmentIcon;
  if (/course|program/i.test(lower)) return CoursesIcon;
  if (/profile|setting/i.test(lower)) return SettingsIcon;
  return CoursesIcon; // safe, recognisable fallback
}

export interface MenuIconProps {
  logo?: string;
  menuName: string;
  size?: number;
  color?: string;
}

const MenuIcon = memo(function MenuIcon({
  logo,
  menuName,
  size = 24,
  color,
}: MenuIconProps) {
  const { colors } = useTheme();
  const IconComponent =
    (logo && LOGO_ICON_MAP[logo]) || iconFromMenuName(menuName);
  const iconColor = color ?? colors.textSecondary;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconComponent size={size} color={iconColor} />
    </View>
  );
});

export default MenuIcon;
