// Guide:
// https://levelup.gitconnected.com/how-to-send-emails-from-node-js-with-sendinblue-c4caacb68f31
import SibApiV3Sdk from 'sib-api-v3-sdk'
import { env } from '*/config/environtment'

const defaultClient = SibApiV3Sdk.ApiClient.instance
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = env.SENDINBLUE_API_KEY

const tranEmailAPI = new SibApiV3Sdk.TransactionalEmailsApi()

// tài khoản admin gửi email
const adminSender = {
  email: 'duydien552@gmail.com', // emmail tài khoản tạo trên SenInBlue.com
  name: 'duydien'
}
const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    const receivers = [
      { email: toEmail }
    ]

    const mailOptions = {
      sender: adminSender,
      to: receivers,
      subject: subject,
      htmlContent: htmlContent
    }

    return tranEmailAPI.sendTransacEmail(mailOptions)

  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

export const SendinBlueProvider = {
  sendEmail
}