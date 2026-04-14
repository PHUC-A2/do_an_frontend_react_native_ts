import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface PitchSearchState {
    keyword: string;
}

const initialState: PitchSearchState = {
    keyword: '',
};

const pitchSearchSlice = createSlice({
    name: 'pitchSearch',
    initialState,
    reducers: {
        setPitchSearchKeyword(state, action: PayloadAction<string>) {
            state.keyword = action.payload;
        },
        clearPitchSearchKeyword(state) {
            state.keyword = '';
        },
    },
});

export const { setPitchSearchKeyword, clearPitchSearchKeyword } = pitchSearchSlice.actions;
export default pitchSearchSlice.reducer;
