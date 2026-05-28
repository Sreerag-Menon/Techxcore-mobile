import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type PlayerStateStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'error'
  | 'completed';

export interface PlayerUiState {
  activeContentId: number | null;
  status: PlayerStateStatus;
  isFullscreen: boolean;
  controlsVisible: boolean;
  studyBuddyOpen: boolean;
}

const initialState: PlayerUiState = {
  activeContentId: null,
  status: 'idle',
  isFullscreen: false,
  controlsVisible: true,
  studyBuddyOpen: false,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setActiveContentId(state, action: PayloadAction<number | null>) {
      state.activeContentId = action.payload;
    },
    setPlayerStatus(state, action: PayloadAction<PlayerStateStatus>) {
      state.status = action.payload;
    },
    setFullscreen(state, action: PayloadAction<boolean>) {
      state.isFullscreen = action.payload;
    },
    setControlsVisible(state, action: PayloadAction<boolean>) {
      state.controlsVisible = action.payload;
    },
    setStudyBuddyOpen(state, action: PayloadAction<boolean>) {
      state.studyBuddyOpen = action.payload;
    },
  },
});

export const {
  setActiveContentId,
  setPlayerStatus,
  setFullscreen,
  setControlsVisible,
  setStudyBuddyOpen,
} = playerSlice.actions;

export default playerSlice.reducer;

