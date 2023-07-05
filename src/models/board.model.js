import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { getDB } from '*/config/mongodb'
import { ColumnModel } from './column.model'
import { CardModel } from './card.model'
import { pagingSkipValue } from '*/utilities/algorithms'
import { UserModel } from './user.model'
// Define Board collection
const boardCollectionName = 'boards'
const boardCollectionSchema = Joi.object({
  title: Joi.string().required().min(1).max(50).trim(),

  description: Joi.string().required().min(3).max(256).trim(), // mô tả của board
  ownerIds: Joi.array().items(Joi.string()).default([]), // chủ - admin của board
  memberIds: Joi.array().items(Joi.string()).default([]), // thành viên của board

  columnOrder: Joi.array().items(Joi.string()).default([]),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})
const INVALID_UPDATE_FIELDS = ['_id', 'createdAt']

const validateSchema = async (data) => {
  return await boardCollectionSchema.validateAsync(data, { abortEarly: false })
}

const findOneById = async (id) => {
  try {
    const result = await getDB().collection(boardCollectionName).findOne({ _id: ObjectId(id) })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const createNew = async (data, userId) => {
  try {
    const value = await validateSchema(data)

    const createData = {
      ...value,
      ownerIds: [ObjectId(userId)]
    }

    const result = await getDB().collection(boardCollectionName).insertOne(createData)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (id, data) => {
  try {
    const updateData = { ...data }

    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    const result = await getDB().collection(boardCollectionName).findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result.value
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * @param {string} boardId
 * @param {string} columnId
 */
const pushColumnOrder = async (boardId, columnId) => {
  try {
    const result = await getDB().collection(boardCollectionName).findOneAndUpdate(
      { _id: ObjectId(boardId) },
      { $push: { columnOrder: columnId } },
      { returnDocument: 'after' }
    )

    return result.value
  } catch (error) {
    throw new Error(error)
  }
}

const getFullBoard = async (boardId) => {
  try {
    const result = await getDB().collection(boardCollectionName).aggregate([
      { $match: {
        _id: ObjectId(boardId),
        _destroy: false
      } },
      { $lookup: {
        from: ColumnModel.columnCollectionName,
        localField: '_id',
        foreignField: 'boardId',
        as: 'columns'
      } },
      { $lookup: {
        from: CardModel.cardCollectionName,
        localField: '_id',
        foreignField: 'boardId',
        as: 'cards'
      } },
      { $lookup: {
        from: UserModel.userCollectionName,
        localField: 'ownerIds',
        foreignField: '_id',
        as: 'owners',
        // pipeline trong luckup là để xử lý 1 hoặc nhiều luồng cần thiết
        pipeline: [
          { $project: { 'password': 0, 'verifyToken':0 } }
        ]
      } },
      { $lookup: {
        from: UserModel.userCollectionName,
        localField: 'memberIds',
        foreignField: '_id',
        as: 'members',
        pipeline: [
          { $project: { 'password': 0, 'verifyToken':0 } }
        ]
      } }
    ]).toArray()

    return result[0] || {}
  } catch (error) {
    throw new Error(error)
  }
}

const getListBoards = async (userId, currentPage, itemsPerPage, queryFilter) => {
  try {
    const queryConditions = [
      { _destroy: false },
      { $or: [
        { ownerIds: { $all: [ObjectId(userId)] } },
        { memberIds: { $all: [ObjectId(userId)] } }
      ] }
    ]

    if (queryFilter) {
      Object.keys(queryFilter).forEach(key => {

        //có phân biệt chữ hoa và chữ thường
        // queryConditions.push({ [key]: { $regex: queryFilter[key] } })

        // khooong phân biệt chữ hoa và chữ thường
        queryConditions.push({ [key]: { $regex: new RegExp(queryFilter[key], 'i') } })
      })

    }

    const query = await getDB().collection(boardCollectionName).aggregate(
      [
        { $match: { $and: queryConditions } },
        { $sort: { title: 1 } }, // value 0 thi tu Z-A, sort title theo A-Z (mặc định sẽ bị chữ B hoa đứng trước chữ a thường (theo chuẩn bảng mã ASCII)
        // $facet để xử lý nhiều luồng trong 1 query
        { $facet: {
          'boards': [
            { $skip: pagingSkipValue(currentPage, itemsPerPage) }, //bỏ qua số lượng bản ghi của những trang trước đó
            { $limit: itemsPerPage } // giows hạn bản ghi sdoos lượng trong 1 trang
          ],
          'totalBoards': [
            { $count: 'countedBoards' }//  Đếm số lượng bản ghi boards và trả về biến countedBoards
          ]

        } }
      ],
      // Khai báo thêm thuộc tính collation locale 'en' để fix vụ chữ B hoa và a thường ở trên
      { collation: { locale: 'en' } }
    ).toArray()

    const res = query[0]

    return {
      boards: res.boards || [],
      totalBoards: res.totalBoards[0]?.countedBoards || 0
    }

  } catch (error) {
    throw new Error(error)
  }
}

const pushMembers = async (boardId, userId) => {
  try {
    const result = await getDB().collection(boardCollectionName).findOneAndUpdate(
      { _id: ObjectId(boardId) },
      { $push: { memberIds: ObjectId(userId) } },
      { returnDocument: 'after' } // trả về tài liệu sau khi cập nhât 'befor' là trước nhé ~!!!!
    )

    return result.value
  } catch (error) {
    throw new Error(error)
  }
}

export const BoardModel = {
  boardCollectionName,
  createNew,
  update,
  pushColumnOrder,
  getFullBoard,
  findOneById,
  getListBoards,
  pushMembers
}
