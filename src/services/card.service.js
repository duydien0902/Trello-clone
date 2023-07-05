import { CardModel } from '*/models/card.model'
import { ColumnModel } from '*/models/column.model'
import { CloudinaryProvider } from '*/providers/CloudinaryProvider'
import { ObjectId } from 'mongodb'


const createNew = async (data) => {
  try {
    const createdCard = await CardModel.createNew(data)
    const getNewCard = await CardModel.findOneById(createdCard.insertedId.toString())

    await ColumnModel.pushCardOrder(getNewCard.columnId.toString(), getNewCard._id.toString())

    return getNewCard
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (cardId, data, cardCoverFile, userInfo) => {
  try {
    const updateData = {
      ...data,
      updatedAt: Date.now()
    }
    let updatedCard = {}
    if (cardCoverFile) {
      //Upload file len dịch vụ lưu trữ đám mây Cloundinary
      const uploadResult = await CloudinaryProvider.streamUpload(cardCoverFile.buffer, 'card-covers')
      // console.log(uploadResult)
      updatedCard = await CardModel.update(cardId, {
        cover: uploadResult.secure_url
      })
    } else if (updateData.newComment) {
      const comment = {
        ...updateData.newComment,
        userId: ObjectId(userInfo._id),
        userEmail: userInfo.email,
        createdAt: Date.now()
      }
      updatedCard = await CardModel.pushNewComment(cardId, comment)
    } else if (updateData.incomingMember) {
      updatedCard = await CardModel.updateMembers(cardId, updateData.incomingMember)
    } else {
      updatedCard = await CardModel.update(cardId, updateData)
    }

    return updatedCard
  } catch (error) {
    throw new Error(error)
  }
}

export const CardService = {
  createNew,
  update
}
