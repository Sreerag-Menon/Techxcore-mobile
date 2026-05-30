/**
 * All backend API endpoint paths grouped by domain module.
 * The Axios client automatically prepends the base URL + API version.
 * Every endpoint uses the POST HTTP method.
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/member_login',
    LOGOUT: '/member_logout',
    REFRESH_TOKEN: '/refresh_auth_token',
    CLEAR_USER_SESSION: '/clear_user_session_info',
    FORGOT_PASSWORD: '/forgot_password',
    RESET_PASSWORD: '/reset_member_password',
    CHANGE_PASSWORD: '/change_member_password',
    SESSION_INFO: '/member_session_info',
    GOOGLE_LOGIN: '/member_login_google',
    MICROSOFT_LOGIN: '/member_login_microsoft',
  },
  STUDENT: {
    DASHBOARD_COURSES: '/get_dashboard_trainee_courses',
    COURSES: '/get_trainee_courses',
    COURSE_DETAILS: '/get_course_publish_details',
    COURSE_CONTENT: '/get_course_publish_content_hier_v2',
    COURSE_HIER: '/get_course_publish_content_hier_v2',
    TRAINEE_COURSE_PUBLISH_HIER: '/get_trainee_course_publish_hier_v2',
    CURRENT_MODULE: '/get_trainee_current_module',
    MODULE_PROGRESS: '/insert_update_trainee_module_time',
    TEST_PROGRESS: '/insert_update_trainee_test_time',
    TRAINEE_POINTS: '/insert_update_trainee_points',
    TRAINEE_CREDIT_TIME: '/insert_update_trainee_credit_time',
    MODULE_NOTES_GET: '/get_module_notes',
    MODULE_NOTES_SAVE: '/insert_update_module_notes',
    COURSE_RATING: '/insert_update_course_rating',
    CERTIFICATE: '/get_trainee_certificate',
    ANALYTICS_PLAYER: '/update_analytics',
    COURSE_PUBLISHINGS: '/get_trainee_course_publishings',
    OPEN_COURSES: '/get_trainee_open_courses',
    TRENDING_COURSES: '/get_trainee_course_trendings',
  },
  ASSESSMENT: {
    LIST: '/get_trainee_assessments',
    HOME_ASSESSMENTS: '/get_trainee_home_assessments',
    DETAILS: '/get_test_dtl',
    QUESTIONS: '/get_test_questions_v2',
    SUBMIT: '/insert_test_results',
    UPDATE_ANSWER: '/insert_update_test_answer',
    ATTEMPTS: '/get_trainee_assessment_attempts',
    ATTEMPT_DETAILS: '/get_trainee_assessment_attempt_details',
    SUMMARY: '/getTestAssessmentSummary',
  },
  USER: {
    SUMMARY: '/get_member_summary',
    MENU: '/get_member_menu',
    RECENT_ACTIVITY: '/get_recent_member_activity',
    TRANSACTIONS: '/get_member_transactions',
  },
  PARENT: {
    CHILDREN: '/get_parent_childrn',
    DETAILS: '/get_parent_details',
    COURSE_PROGRESS: '/get_parent_course_progress_dependant',
  },
  NOTIFICATION: {
    LIST: '/get_notification',
  },
  ATTENDANCE: {
    TRACKER: '/get_attendance_tracker_details',
    COURSE_WISE: '/get_course_wise_attendance',
  },
  COMMUNICATION: {
    GET_MESSAGES: '/get_ask_trainer_messages',
    SEND_MESSAGE: '/insert_update_ask_doctor',
    MARK_READ: '/mark_ask_doctor_messages_read',
    BROADCAST: '/get_broadcast_messages',
  },
  VIDEO: {
    UNIT: '/get_video_unit_v2',
    RESUME: '/resume_video_v2',
    SEARCH: '/video_search_v2',
  },
  SITE: {
    DETAILS: '/getSiteDetails',
    ROLES: '/get_all_roles',
    LABELS: '/get_label',
  },
} as const;
