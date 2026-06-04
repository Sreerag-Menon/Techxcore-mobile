# Student course viewing parity (web → mobile)

Reference for web LMS student flows vs Techxcore-mobile. API base: `POST /api/v0.2/<cmd>` with `x-access-token`.

## Web feature inventory

| Area | Route | Features | API cmds |
|------|-------|----------|----------|
| Catalog | `/curricula` | Zones, search/filter/sort, status tags, ratings, certificate modal, pending-test gate, multicourse routing | `get_trainee_course_publishings`, `get_certificate` |
| Variants | `/variants` | Pick variant, subscribe | `insert_trainee_course_subscribe` |
| Details | `/course-details` | Credits, activity, certificate | `get_student_course_credit_details`, `get_certificate` |
| Player | `/content` | Hierarchy, resume, sequential, formats, progress, notes, rating, certificate, Discourse | `get_trainee_course_publish_hier_v2`, `get_trainee_current_module`, progress cmds, `api/comments`, `api/postComment` |
| Old courses | `/oldcourses` | Previous AY publishings | `get_trainee_prevacd_course_publishings` |

## Mobile parity matrix

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Course list + search/filter | Yes | Yes | Done |
| Open course / player | Yes | Yes | Done |
| Hierarchy + current module | Yes | Yes | Done |
| Multi-format modules | Yes | Yes | Done |
| Progress / credit time / points | Yes | Yes | Done |
| In-course assessments | Yes | Yes | Done |
| Notes + Ask trainer | Yes | Yes | Done |
| Rating + certificate (player) | Yes | Yes | Done |
| Course details (credits) | Yes | Screen added | Done |
| Multi-course variants | Yes | Screen added | Done |
| Pending test gate | Yes | List gate added | Done |
| Discourse | Yes | Tab wired | Done |
| Video resume seek | Yes | Native + WebView | Done |
| YouTube/Vimeo progress | Partial web | Bridge added | Done |
| HTMLEditor / embedded inline HTML | `Embedded` + **Mark as complete**; HTMLEditor HTML from `browse_url` via `dangerouslySetInnerHTML` | WebView inline from `browse_url` only (not API `content_url`); file cache when large; **Mark as complete** (no auto-complete on load) | Done |
| Old courses | Yes | Screen added | Done |
| Offline downloads | No | No | Out of scope |

## Phase implementation (mobile)

- **Phase 0**: This document + shared `Course` fields (`course_publish_id` contract).
- **Phase 1**: `course-details`, `course-variants`, pending-test gate, Discourse tab, old courses.
- **Phase 2**: `initialSeekSeconds` on video; WebView progress polling for YouTube/Vimeo.
- **Phase 3**: Optional offline (not implemented).
