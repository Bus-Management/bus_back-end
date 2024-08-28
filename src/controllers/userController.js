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

// const getAssignedBusRoute = async (req, res, next) => {
//   try {
//     const { driverId } = req.params

//     // Lấy thông tin tài xế từ Redis
//     const driver = await redis.hGetAll(`user:${driverId}`)

//     if (!driver || Object.keys(driver).length === 0) {
//       return res.status(StatusCodes.NOT_FOUND).json({ message: 'Driver not found' })
//     }

//     // Lấy thông tin tuyến xe từ Redis dựa trên assigned_route_id
//     const busRoute = await redis.hGetAll(`bus_routes:${driver.bus_routes_id}`)

//     if (!busRoute || Object.keys(busRoute).length === 0) {
//       return res.status(StatusCodes.NOT_FOUND).json({ message: 'Assigned bus route not found' })
//     }

//     return res.status(StatusCodes.OK).json(busRoute)
//   } catch (error) {
//     next(error)
//   }
// }

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

export const userController = { getAllUser, signUp, getAssignedBusRoute, createBusRoute }
