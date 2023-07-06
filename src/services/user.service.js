import { UserModel } from '*/models/user.model'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { SendinBlueProvider } from '*/providers/SendinBlueProvider'
import { CloudinaryProvider } from '*/providers/CloudinaryProvider'

import { WEBSITE_DOMAIN } from '../utilities/constants'
import { pickUser } from '*/utilities/transform'
import { JwtProvider } from '*/providers/JwtProvider'
import { env } from '*/config/environtment'
import { RedisQueueProvider } from '*/providers/RedisQueueProvider'
import { CardModel } from '*/models/card.model'


const createNew = async (reqBody) => {
  try {
    // kiểm tra xem email đã tồn taij trong hệ thống của mình hay chưa
    const exisUser = await UserModel.findOneByEmail(reqBody.email)
    if (exisUser) {
      throw new Error('Email đã tồn tại')
    }

    // tạo data user để lưu vào DB
    // nameFromEmail: nếu email là trungquandev@gmail.com thì sẽ lấy được "trungquandev"
    const nameFormEmail = reqBody.email.split('@')[0] || ''
    const userData = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8),
      username: nameFormEmail,
      displayName: nameFormEmail,
      verifyToken: uuidv4()
    }
    const createdUser = await UserModel.createNew(userData)
    const getUser = await UserModel.findOneById(createdUser.insertedId.toString())

    // gửi email cho ngừoi dùng xác thực
    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?token=${getUser.verifyToken}`
    const subject = 'Trello Clone App: Please verify your email before using our services!'
    const htmlContent = `
    <h3>Here is your verification link:</h3>
    <h3>${verificationLink}</h3>
    <h3>Sincerely,<br/> - Trungquandev Official - </h3>
   `
    await SendinBlueProvider.sendEmail(getUser.email, subject, htmlContent)
    return pickUser(getUser)

  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

const verifyAccount = async (reqBody) => {
  try {
    // kiểm tra xem email đã tồn taij trong hệ thống của mình hay chưa
    const existUser = await UserModel.findOneByEmail(reqBody.email)
    if (!existUser) {
      throw new Error('tài khoản không tồn tại.')
    }

    if (existUser.isActive) {
      throw new Error('tài khoản đã đc active...')
    }

    if (existUser.verifyToken !== reqBody.token) {
      throw new Error('Token khonong hợp lệ...')
    }

    const updateData = {
      verifyToken: null,
      isActive: true
    }
    const updatedUser = await UserModel.update(existUser._id.toString(), updateData)

    return pickUser(updatedUser)

  } catch (error) {
    throw new Error(error)
  }
}

const signIn = async (reqBody) => {
  try {
    // kiểm tra xem email đã tồn taij trong hệ thống của mình hay chưa
    const exisUser = await UserModel.findOneByEmail(reqBody.email)
    if (!exisUser) {
      throw new Error('tài khoản không tồn tại.')
    }

    if (!exisUser.isActive) {
      throw new Error('tài khoản chưa đc active.')
    }
    // Compare password
    if (!bcryptjs.compareSync(reqBody.password, exisUser.password)) {
      throw new Error('email hoặc mật khẩu không đúng.')
    }
    // thông tin được đính kèm trong jwt token
    const userInfoToStoreInJwtToken = {
      _id: exisUser._id,
      email: exisUser.email
    }
    //xử lí token
    // Taoj ra 2 laoại token, access Token và rếhToken về phía FE
    const accessToken = await JwtProvider.generateToken(
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_SECRET_LIFE, // 1 tiengs
      // 5, // 5 giây
      userInfoToStoreInJwtToken
    )

    const refreshToken = await JwtProvider.generateToken(
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_SECRET_LIFE, //14 ngay
      // 15,
      userInfoToStoreInJwtToken
    )

    return { accessToken, refreshToken, ...pickUser(exisUser) }
  } catch (error) {
    throw new Error(error)
  }
}

const refreshToken = async (clientRefreshToken) => {
  try {
    //Verify /giaỉ mã refresh token
    const refreshTokenDecoded = await JwtProvider.verifyToken(env.REFRESH_TOKEN_SECRET_SIGNATURE, clientRefreshToken)

    // Đoạn này vì chúng ta chỉ lưu những thông tin unique và cố định của user, vì vậy có thể lấy luôn từ decoded ra, tiết kiệm query vào DB để lấy data mới.
    const userInfoToStoreInJwtToken = {
      _id: refreshTokenDecoded._id,
      email: refreshTokenDecoded.email
    }

    //xử lí token
    // Taoj mới access token
    const accessToken = await JwtProvider.generateToken(
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_SECRET_LIFE, //1 tieng
      // 5, // 5 giây
      userInfoToStoreInJwtToken
    )

    return { accessToken }
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

const update = async (userId, reqBody, userAvatarFile) => {
  try {
    let updatedUser = {}
    let shouldUpdateCardsComments = false

    if (userAvatarFile) {
      //Upload file len dịch vụ lưu trữ đám mây Cloundinary
      const uploadResult = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, 'users')
      // console.log(uploadResult)
      updatedUser = await UserModel.update(userId, {
        avatar: uploadResult.secure_url
      })
      shouldUpdateCardsComments = true
    } else if (reqBody.currentPassword && reqBody.newPassword) {
      // Change password
      const existUser = await UserModel.findOneById(userId)
      if (!existUser) {
        throw new Error('User not found.')
      }
      // Compare password
      if (!bcryptjs.compareSync(reqBody.currentPassword, existUser.password)) {
        throw new Error('Your current password is incorrect!')
      }

      updatedUser = await UserModel.update(userId, {
        password: bcryptjs.hashSync(reqBody.newPassword, 8)
      })

    } else {
      // General information: displayName...vv
      updatedUser = await UserModel.update(userId, reqBody)
      if (reqBody.displayName) {
        shouldUpdateCardsComments = true
      }
    }

    // Backgroung task https://github.com/mkamrani/example-node-bull/blob/main/basic/index.js
    // chạy background job cho việc cập nhật rất nhiều bản ghi card comments thuộc về user đó
    if (shouldUpdateCardsComments) {
      // Bước 1: khởi tạo một cái hàng đơị để cập nhật toàn bộ comments
      let updateCardsCommentsQueue = RedisQueueProvider.generateQueue('updateCardsCommentsQueue')

      // Bước 2: định nghĩa ra những việc cần làm trong tiến trình hàng đợi
      updateCardsCommentsQueue.process(async (job, done) => {
        console.log('bắt đầu chạy một hoặc nhiều công việc trong hàng đợi...')
        try {
          // job.data ở đây chính là cái updatedUser đươcj truyền vào ở bước số 4
          const cardCommentUpdated = await CardModel.updateManyComments(job.data)
          done(null, cardCommentUpdated)
        } catch (error) {
          done(new Error('Error from updateCardsCommentsQueue', error))
        }
      })

      // Bước 3: Kiểm tra cái job này completed hoắc là failed, tuỳ trường hợp mà chúng ta sẽ xử lý, vd như bắn thông baos về emai, hoặc bắn thoong báo về slack, telegram.
      // Nhiều event khác: https://github.com/OptimalBits/bull/blob/HEAD/REFERENCE.md#events
      updateCardsCommentsQueue.on('completed', (job, result) => {
        console.log(`Job với id là: ${job.id} và tên job: ${job.queue.name} đã xong với kết quả là: `, result)
        // bắn thông báo lỗi  slack ....
      })
      updateCardsCommentsQueue.on('failed', (job, error) => {
        console.log(`Job với id là: ${job.id} và tên job: ${job.queue.name} đã bị lỗi: `, error)
        // bắn thông báo lỗi  slack ....
      })
      //Bước 4: Bước quan trọng: thêm vào hàng đợi để xử lý
      //https://github.com/OptimalBits/bull/blob/HEAD/REFERENCE.md#queueadd
      updateCardsCommentsQueue.add(updatedUser, {
        attempts: 3, // ssố lần thử lại nếu lỗi
        backoff: 3000 // khoảng thời gian giữa các lần thử job
      })
    }

    return pickUser(updatedUser)
  } catch (error) {
    throw new Error(error)
  }
}


export const UserService = {
  createNew,
  verifyAccount,
  signIn,
  refreshToken,
  update
}
