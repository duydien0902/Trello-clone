import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import authorizedAxiosInstance from 'utilities/customAxios'

import { API_ROOT } from 'utilities/constants'
import { mapOrder } from 'utilities/sorts'


const initialState = {
  currentFullBoard: null
}

export const fetchFullBoardDetailsAPI = createAsyncThunk(
  'activeBoard/fetchFullBoardDetailsAPI',
  async (boardId) => {
    const request = await authorizedAxiosInstance.get(`${API_ROOT}/v1/boards/${boardId}`)
    return request.data
  }
)

export const activeBoardSlice = createSlice({
  name: 'activeBoard',
  initialState,
  reducers: {
    upadateCurrentFullBoard: (state, action) => {
      const fullBoard = action.payload
      state.currentFullBoard = fullBoard
    },
    updateCardInBoard: (state, action) => {
      //update nested data
      const incomingCard = action.payload
      const column = state.currentFullBoard.columns.find(i => i._id === incomingCard.columnId)
      if (column) {
        const card = column.cards.find(i => i._id === incomingCard._id)
        if (card) {
          // card.title = incomingCard.title
          const updateKeys = ['title', 'cover', 'description', 'memberIds', 'comments', 'c_CardMembers']
          updateKeys.forEach(key => {
            card[key] = incomingCard[key]
          })
        }
      }
    }

  },
  extraReducers: (builder) => {
    builder.addCase(fetchFullBoardDetailsAPI.fulfilled, (state, action) => {
      let fullBoard = action.payload

      // thàh viên trong board gộp lại của owner và members
      fullBoard.users = fullBoard .owners.concat(fullBoard.members)
      // fullBoard.users = fullBoard .owners.concat(...[fullBoard.owners, fullBoard.owners, fullBoard.owners, fullBoard.owners, fullBoard.owners])
      fullBoard.totalUsers = fullBoard.users?.length

      //sắp xếp thuứ tự các cột columns
      fullBoard.columns = mapOrder(fullBoard.columns, fullBoard.columnOrder, '_id')

      //sắp xếp thuứ tự các cột card
      fullBoard.columns.forEach(column => {
        column.cards = mapOrder(column.cards, column.cardOrder, '_id')
        column.cards.forEach(card => {
          let c_CardMembers = []
          if (Array.isArray(card.memberIds)) {
            card.memberIds.forEach(memberId => {
              const fullMemberInfo = fullBoard.users?.find(u => u._id === memberId)
              if (fullMemberInfo) c_CardMembers.push(fullMemberInfo)
            })
          }
          card['c_CardMembers'] = c_CardMembers
        })
      })

      state.currentFullBoard = fullBoard
    })
  }
})

// Action creators are generated for each case reducer function
export const { upadateCurrentFullBoard, updateCardInBoard } = activeBoardSlice.actions

export const selectCurrentFullBoard = (state) => {
  return state.activeBoard.currentFullBoard
}

// export default activeBoardSlice.reducer
export const activeBoardReducer = activeBoardSlice.reducer