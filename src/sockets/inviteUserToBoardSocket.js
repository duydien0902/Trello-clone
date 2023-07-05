
// param socket nó sẽ phaỉ được lấy từ thư viện socket.io
export const inviteUserToBoardSocket = (socket) => {
  // lắng nghee sự kiện từ phía client có tên là c_user_invited_to_board
  socket.on('c_user_invited_to_board', (invitation) => {
    // emit ngược lại một sự kiện về cho mọi client khác ngoại trừ chính cái thằng gửi request lên
    socket.broadcast.emit('s_user_invited_to_board', invitation)
  })
}