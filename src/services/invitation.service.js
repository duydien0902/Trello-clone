import { InvitationModel } from '*/models/invitation.model'
import { UserModel } from '*/models/user.model'
import { BoardModel } from '*/models/board.model'
import { pickUser } from '*/utilities/transform'

const createNewBoardInvitation = async (data, userId) => {
  try {
    // Người đi mời: chính là người đang request, nên chúng ta tìm theo id lấy từ token
    const inviter = await UserModel.findOneById(userId)
    // Người được mời: lấy từ form phía client
    const invitee = await UserModel.findOneByEmail(data.inviteeEmail)

    const board = await BoardModel.findOneById(data.boardId)
    if (!invitee || !inviter || !board) {
      throw new Error('Inviter, invitee or board not found!')
    }

    //Kiểm tra xem cái thằng invitee nó đã là thanh viê ncuar cái board hay chưa
    const invitation = {
      inviterId: userId,
      inviteeId: invitee._id.toString(),
      type: InvitationModel.INVITATION_TYPES.BOARD_INVITATION,
      boardInvitation: {
        boardId: data.boardId,
        status: InvitationModel.BOARD_INVITATION_STATUS.PENDING
      }
    }

    const createdInvitation = await InvitationModel.createNewBoardInvitation(invitation)
    const getInvitation = await InvitationModel.findOneById(createdInvitation.insertedId.toString())

    const resData = {
      ...getInvitation,
      inviter: pickUser(inviter),
      invitee: pickUser(invitee),
      board: board
    }


    return resData
  } catch (error) {
    throw new Error(error)
  }
}

const getInvitations = async (userId) => {
  try {
    const getInvitations = await InvitationModel.findByUser(userId)
    // console.log('getInvitations', getInvitations)

    const resInvitations = getInvitations.map(i => {
      return {
        ...i,
        inviter: i.inviter[0] || {},
        invitee: i.invitee[0] || {},
        board: i.board[0] || {}
      }
    })

    return resInvitations
  } catch (error) {
    throw new Error(error)
  }
}

// userId tương đương với inviteeId (lấy từ token, là người thực hiện request)
const updateBoardInvitation = async (userId, invitationId, action) => {
  try {
    // Tìm bản ghi invitation trong model
    const getInvitation = await InvitationModel.findOneById(invitationId)
    if (!getInvitation) {
      throw new Error('Invitation not found!')
    }

    // Lấy full thông tin của board
    const boardId = getInvitation.boardInvitation.boardId.toString()
    const board = await BoardModel.findOneById(boardId)
    if (!board) {
      throw new Error('board not found!')
    }

    // Vì memberIds và ownerIds đang là mảng chứa các ObjectIds nên sẽ parse sang String
    const boardMemberIds = board.memberIds.map(i => i.toString())
    const boardOwnerIds = board.ownerIds.map(i => i.toString())

    // Kiểm tra xem nếu hành động là Accept join board mà cái thằng user (invitee) đã là owner hoặc member của board rồi thì trả về thông báo lỗi.
    if (action === 'accept' && (boardMemberIds.includes(userId) || boardOwnerIds.includes(userId))) {
      throw new Error('You are already a member of this board')
    }

    // Khởi tạo một cái status
    let updateStatus = InvitationModel.BOARD_INVITATION_STATUS.PENDING
    if (action === 'accept') updateStatus = InvitationModel.BOARD_INVITATION_STATUS.ACCEPTED
    if (action === 'reject') updateStatus = InvitationModel.BOARD_INVITATION_STATUS.REJECTED

    // Tạo dữ liệu để update bản ghi Invitation
    const updateData = {
      boardInvitation: {
        ...getInvitation.boardInvitation,
        status: updateStatus
      }
    }

    // Bước 1: Cập nhật status trong bản ghi Invitation
    const updatedInvitation = await InvitationModel.update(invitationId, updateData)

    // Bước 2: Nếu trường hợp Accept một lời mời thành công, thì cần phải thêm thông tin của thằng user (userId) vào bản ghi memberIds trong collection board.
    if (updatedInvitation.boardInvitation.status === InvitationModel.BOARD_INVITATION_STATUS.ACCEPTED) {
      await BoardModel.pushMembers(boardId, userId)
    }

    return updatedInvitation
  } catch (error) {
    throw new Error(error)
  }
}

export const InvitationService = {
  createNewBoardInvitation,
  getInvitations,
  updateBoardInvitation
}

