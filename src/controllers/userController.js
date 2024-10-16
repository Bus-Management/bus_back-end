import { v4 as uuidv4 } from 'uuid'
import { redis } from '~/config/connectRedis'
import { StatusCodes } from 'http-status-codes'

const getAllUser = async (req, res, next) => {
  try {
    const userKeys = await redis.keys('user:*')

    const allUsers = []
    const newUserKeys = userKeys.filter((item) => !item.includes('children'))

    for (const key of newUserKeys) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      allUsers.push(user)
    }
    return res.status(StatusCodes.OK).json(allUsers)
  } catch (error) {
    next(error)
  }
}

const confirmStudentPickup = async (req, res, next) => {
  try {
    const { routeId } = req.params
    const { studentId, stopIndex } = req.body

    // Lấy thông tin tuyến xe từ Redis
    const busRoute = await redis.hGetAll(`bus_routes:${routeId}`)

    if (!busRoute || Object.keys(busRoute).length === 0) {
      return res.status(404).json({ message: 'Bus route not found' })
    }

    // Parse schedule để lấy danh sách điểm dừng
    const schedule = JSON.parse(busRoute.schedule)
    const stops = schedule.stops

    // Kiểm tra xem stopIndex có hợp lệ không
    if (stopIndex < 0 || stopIndex >= stops.length) {
      return res.status(400).json({ message: 'Invalid stop index' })
    }

    // Lưu trạng thái xác nhận đón học sinh tại điểm dừng
    const pickupKey = `bus_routes:${routeId}:pickups`
    const pickupField = `${stopIndex}:${studentId}`

    // Đánh dấu học sinh đã được đón tại điểm dừng
    await redis.hSet(pickupKey, pickupField, 'picked_up')

    return res.status(200).json({
      message: 'Student pickup confirmed',
      routeId,
      stop: stops[stopIndex],
      studentId
    })
  } catch (error) {
    next(error)
  }
}

const confirmStudentDropoff = async (req, res, next) => {
  try {
    const { routeId } = req.params
    const { studentId, stopIndex } = req.body

    // Lấy thông tin tuyến xe từ Redis
    const busRoute = await redis.hGetAll(`bus_routes:${routeId}`)

    if (!busRoute || Object.keys(busRoute).length === 0) {
      return res.status(404).json({ message: 'Bus route not found' })
    }

    // Parse schedule để lấy danh sách điểm dừng
    const schedule = JSON.parse(busRoute.schedule)
    const stops = schedule.stops

    // Kiểm tra xem stopIndex có hợp lệ không
    if (stopIndex < 0 || stopIndex >= stops.length) {
      return res.status(400).json({ message: 'Invalid stop index' })
    }

    // Lưu trạng thái xác nhận trả học sinh tại điểm dừng
    const dropoffKey = `bus_routes:${routeId}:dropoffs`
    const dropoffField = `${stopIndex}:${studentId}`

    // Đánh dấu học sinh đã được trả tại điểm dừng
    await redis.hSet(dropoffKey, dropoffField, 'dropped_off')

    return res.status(200).json({
      message: 'Student dropoff confirmed',
      stop: stops[stopIndex],
      studentId
    })
  } catch (error) {
    next(error)
  }
}

const registerStudent = async (req, res, next) => {
  try {
    const studentId = uuidv4()

    await redis.hSet(`user:${studentId}`, {
      id: studentId,
      ...req.body,
      role: 'student',
      status: ''
    })

    const parent = await redis.hGetAll(`user:${req.body.parentId}`)
    let listStudentIds = JSON.parse(parent.childrenIds)
    listStudentIds.push(studentId)
    await redis.hSet(`user:${req.body.parentId}`, {
      ...parent,
      childrenIds: JSON.stringify(listStudentIds)
    })

    return res.status(StatusCodes.CREATED).json({
      message: 'Đăng ký tài khoản thành công'
    })
  } catch (error) {
    next(error)
  }
}

const updateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params

    const student = await redis.hGetAll(`user:${studentId}`)
    if (!student || student.parentId !== req.body.parentId) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' })
    }

    await redis.hSet(`user:${studentId}`, {
      ...req.body
    })

    const updatedStudent = await redis.hGetAll(`user:${studentId}`)

    return res.status(200).json({
      message: 'Sửa thông tin thành công',
      student: updatedStudent
    })
  } catch (error) {
    next(error)
  }
}

const updateStudentStops = async (req, res, next) => {
  try {
    const { studentId } = req.params
    const { newStops } = req.body

    // Lấy thông tin hiện tại của học sinh
    const student = await redis.hGetAll(`user:${studentId}`)
    if (!student || !student.id) {
      return res.status(404).json({ message: 'Student not found' })
    }

    // Cập nhật điểm đón/trả của học sinh
    await redis.hSet(`user:${studentId}`, 'stops', JSON.stringify(newStops))

    return res.status(StatusCodes.OK).json({
      message: 'Student stops updated successfully',
      stops: newStops
    })
  } catch (error) {
    next(error)
  }
}

const getDetailUser = async (req, res, next) => {
  try {
    const userId = req.params.id
    const student = await redis.hGetAll(`user:${userId}`)
    if (!student) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Student not found' })
    }
    res.status(StatusCodes.OK).json(student)
  } catch (error) {
    next(error)
  }
}

const getAllDrivers = async (req, res, next) => {
  try {
    const allUserKeys = await redis.keys('user:*')
    const filteredUsers = allUserKeys.filter((user) => !user.includes('children'))

    const drivers = []

    for (const key of filteredUsers) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      if (user.role === 'driver') {
        drivers.push(user)
      }
    }

    return res.status(StatusCodes.OK).json(drivers)
  } catch (error) {
    next(error)
  }
}

const getAllParents = async (req, res, next) => {
  try {
    const allUserKeys = await redis.keys('user:*')

    const parents = []

    for (const key of allUserKeys) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      if (user.role === 'parent') {
        parents.push(user)
      }
    }

    return res.status(StatusCodes.OK).json(parents)
  } catch (error) {
    next(error)
  }
}

const getAllChildrens = async (req, res, next) => {
  try {
    const allUserKeys = await redis.keys('user:*')

    const childrens = []

    for (const key of allUserKeys) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      if (user.role === 'student' && user.parentId === req.user.id) {
        childrens.push(user)
      }
    }

    return res.status(StatusCodes.OK).json(childrens)
  } catch (error) {
    next(error)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params

    const routeExists = await redis.exists(`user:${userId}`)
    if (!routeExists) {
      return res.status(404).json({ message: 'User not found' })
    }

    await redis.del(`user:${userId}`)

    return res.status(StatusCodes.OK).json({ message: 'Xóa thành công' })
  } catch (error) {
    next(error)
  }
}

const deleteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params
    const { id, childrenIds } = req.user

    const routeExists = await redis.exists(`user:${studentId}`)
    if (!routeExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    await redis.del(`user:${studentId}`)

    let listStudents = JSON.parse(childrenIds)
    listStudents = listStudents.filter((item) => item !== studentId)

    await redis.hSet(`user:${id}`, {
      ...req.user,
      childrenIds: JSON.stringify(listStudents)
    })

    return res.status(StatusCodes.OK).json({ message: 'Xóa thành công' })
  } catch (error) {
    next(error)
  }
}

const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const updatedData = req.body

    const userExists = await redis.exists(`user:${userId}`)
    if (!userExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Người dùng không tồn tại' })
    }

    const oldPhone = await redis.hGet(`user:${userId}`, 'phone')
    if (oldPhone !== updatedData.phone) {
      await redis.hDel('phones', oldPhone, userId)
      await redis.hSet('phones', updatedData.phone, userId)
    }

    await redis.hSet(`user:${userId}`, {
      ...updatedData
    })

    res.status(StatusCodes.OK).json({ message: 'Cập nhật thông tin thành công' })
  } catch (error) {
    next(error)
  }
}

const updateStatusUser = async (req, res, next) => {
  try {
    const { studentId, status } = req.body

    const userExists = await redis.exists(`user:${studentId}`)
    if (!userExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Người dùng không tồn tại' })
    }

    await redis.hSet(`user:${studentId}`, 'status', status)

    return res.status(StatusCodes.OK).json({ message: 'Cập nhật thông tin thành công' })
  } catch (error) {
    next(error)
  }
}

const getChildrensAssignedRoute = async (req, res, next) => {
  try {
    const routeId = req.params.routeId
    const parentId = req.user.id

    const studentIds = await redis.hGet(`bus_routes:${routeId}`, 'studentIds')
    const childrenIds = await redis.hGet(`user:${parentId}`, 'childrenIds')

    let newStudentIds = JSON.parse(studentIds)
    let newChildrenIds = JSON.parse(childrenIds)

    const listChildrensAssigned = newStudentIds?.filter((item) => newChildrenIds.includes(item))

    const newListChildrensAssigned = await Promise.all(
      listChildrensAssigned?.map(async (item) => {
        const student = await redis.hGetAll(`user:${item}`)
        return {
          ...student
        }
      })
    )

    return res.status(StatusCodes.OK).json(newListChildrensAssigned)
  } catch (error) {
    next(error)
  }
}

export const userController = {
  getAllUser,
  confirmStudentPickup,
  confirmStudentDropoff,
  registerStudent,
  updateStudent,
  updateStudentStops,
  getDetailUser,
  getAllDrivers,
  getAllParents,
  getAllChildrens,
  deleteUser,
  deleteStudent,
  updateUser,
  updateStatusUser,
  getChildrensAssignedRoute
}
