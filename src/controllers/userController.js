import { v4 as uuidv4 } from 'uuid'
import { redis } from '~/config/connectRedis'
import { StatusCodes } from 'http-status-codes'

const signUp = async (req, res, next) => {
  try {
    const userId = uuidv4()
    await redis.hSet(`user:${userId}`, {
      id: userId,
      ...req.body
    })
    const user = await redis.hGetAll(`user:${userId}`)

    return res.status(StatusCodes.OK).json(user)
  } catch (error) {
    next(error)
  }
}

const getAllUser = async (req, res, next) => {
  try {
    // return res.status(StatusCodes.OK).json({ message: 'OK' })
  } catch (error) {
    throw error
  }
}

// --------------Xem tuyến xe được phân công của tài xế
const getAssignedBusRoute = async (req, res, next) => {
  try {
    const { driverId } = req.params

    // Lấy tất cả các khóa bus_routes từ Redis
    const busRouteKeys = await redis.keys('bus_routes:*')

    // // Khởi tạo mảng để lưu trữ các tuyến xe của tài xế
    const assignedRoutes = []

    // Lặp qua từng khóa để kiểm tra driver_id
    for (const key of busRouteKeys) {
      const busRoute = await redis.hGetAll(key)

      if (busRoute.driver_id === driverId) {
        assignedRoutes.push(busRoute)
      }
    }

    if (assignedRoutes.length === 0) {
      return res.status(404).json({ message: 'No bus routes assigned to this driver' })
    }

    return res.status(StatusCodes.OK).json({
      assignedRoutes
    })
  } catch (error) {
    next(error)
  }
}

const createBusRoute = async (req, res, next) => {
  try {
    // Tạo một ID duy nhất cho tuyến xe
    const routeId = uuidv4()

    // Lưu thông tin tuyến xe vào Redis
    await redis.hSet(`bus_routes:${routeId}`, {
      id: routeId,
      ...req.body,
      schedule: JSON.stringify(req.body.schedule)
    })

    // Lấy lại thông tin tuyến xe để trả về cho người dùng
    const busRoute = await redis.hGetAll(`bus_routes:${routeId}`)

    return res.status(StatusCodes.CREATED).json(busRoute)
  } catch (error) {
    next(error)
  }
}

const getBusRouteStops = async (req, res, next) => {
  try {
    const { routeId } = req.params

    // Lấy thông tin tuyến xe từ Redis
    const busRoute = await redis.hGetAll(`bus_routes:${routeId}`)

    if (!busRoute || Object.keys(busRoute).length === 0) {
      return res.status(404).json({ message: 'Bus route not found' })
    }

    // Lấy danh sách điểm đón/trả học sinh từ trường schedule.stops
    const stops = JSON.parse(busRoute.schedule).stops

    return res.status(StatusCodes.OK).json({ routeName: busRoute.route_name, stops })
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
    // const { userId } = req.user
    const { name, age, studentClass, address, parentId } = req.body

    // Tạo một ID duy nhất cho học sinh
    const studentId = uuidv4()

    // Lưu thông tin học sinh vào Redis dưới dạng một user mới
    await redis.hSet(`user:${studentId}`, {
      id: studentId,
      name,
      age,
      class: studentClass,
      address,
      parentId: parentId,
      role: 'Học sinh'
    })

    // Thêm học sinh vào danh sách học sinh của phụ huynh trong Redis
    await redis.sAdd(`user:${parentId}:children`, studentId)

    // Trả về thông tin học sinh đã đăng ký
    const student = await redis.hGetAll(`user:${studentId}`)

    return res.status(201).json({
      message: 'Student registered successfully',
      student
    })
  } catch (error) {
    next(error)
  }
}

const updateStudent = async (req, res, next) => {
  try {
    // const { userId } = req.user // ID của phụ huynh từ token hoặc session
    const { studentId } = req.params
    const { name, age, studentClass, address, parentId } = req.body

    // Kiểm tra xem học sinh có thuộc về phụ huynh không
    const student = await redis.hGetAll(`user:${studentId}`)
    if (!student || student.parentId !== parentId) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' })
    }

    // Cập nhật thông tin học sinh
    await redis.hSet(`user:${studentId}`, {
      ...student,
      name: name || student.name,
      age: age || student.age,
      class: studentClass || student.class,
      address: address || student.address
    })

    // Trả về thông tin học sinh đã cập nhật
    const updatedStudent = await redis.hGetAll(`user:${studentId}`)

    return res.status(200).json({
      message: 'Student information updated successfully',
      student: updatedStudent
    })
  } catch (error) {
    next(error)
  }
}

export const userController = {
  getAllUser,
  signUp,
  getAssignedBusRoute,
  createBusRoute,
  getBusRouteStops,
  confirmStudentPickup,
  confirmStudentDropoff,
  registerStudent,
  updateStudent
}
