import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import authorizedAxiosInstance from 'utilities/customAxios'
import { API_ROOT } from 'utilities/constants'
import { toast } from 'react-toastify'

const initialState = {
  currentUser: null,
  isAuthenticated: false
}

export const signInUserAPI = createAsyncThunk(
  'user/signInUserAPI',
  async (data) => {
    const request = await authorizedAxiosInstance.post(`${API_ROOT}/v1/users/sign_in`, data)
    return request.data
  }
)

export const signOutUserAPI = createAsyncThunk(
  'user/signOutUserAPI',
  async (showSuccessMessage = true) => {
    const request = await authorizedAxiosInstance.delete(`${API_ROOT}/v1/users/sign_out`)
    if (showSuccessMessage) {
      toast.success('User signed out successfully!', { theme: 'colored' })
    }
    return request.data
  }
)

export const updateUserAPI = createAsyncThunk(
  'user/updateUserAPI',
  async (data) => {
    const request = await authorizedAxiosInstance.put(`${API_ROOT}/v1/users/update`, data)
    if (request.data) {
      toast.success('User updated successfully!', { theme: 'colored' })
    }
    return request.data
  }
)

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    //
  },

  extraReducers: (builder) => {
    builder.addCase(signInUserAPI.fulfilled, (state, action) => {
      const user = action.payload

      state.currentUser = user
      state.isAuthenticated = true
    })
    builder.addCase(signOutUserAPI.fulfilled, (state) => {
      state.currentUser = null
      state.isAuthenticated = false
    })
    builder.addCase(updateUserAPI.fulfilled, (state, action) => {
      const updatedUser = action.payload
      state.currentUser = updatedUser
    })
  }
})

// Action creators are generated for each case reducer function
// export const {} = userSlice.actions

export const selectCurrentUser = (state) => {
  return state.user.currentUser
}

export const selectIsAuthenticated = (state) => {
  return state.user.isAuthenticated
}

// export default userReducer.reducer
export const userReducer = userSlice.reducer