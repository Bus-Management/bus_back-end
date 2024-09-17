import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import 'dotenv/config'

import { redis } from '~/config/connectRedis'

const getAllBusRoutes = async (req, res, next) => {
  try {
    // Lấy tất cả các khóa bus_routes từ Redis
    const busRouteKeys = await redis.keys('bus_routes:*')

    // // Khởi tạo mảng để lưu trữ các tuyến xe của tài xế
    const allRoutes = []

    // Lặp qua từng khóa để kiểm tra driver_id
    for (const key of busRouteKeys) {
      const busRoute = await redis.hGetAll(key)
      allRoutes.push(JSON.parse(busRoute.data))
    }

    return res.status(StatusCodes.OK).json(allRoutes)
  } catch (error) {
    next(error)
  }
}

const createBusRoute = async (req, res, next) => {
  try {
    // Tạo một ID duy nhất cho tuyến xe
    const routeId = uuidv4()

    // Tạo cấu trúc dữ liệu tuyến xe mới
    const newRoute = {
      id: routeId,
      ...req.body,
      students: []
    }

    // Lưu từng trường của newRoute vào Redis dưới dạng các field riêng biệt
    await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(newRoute))

    return res.status(201).json({ message: 'Tạo tuyến xe thành công', route: newRoute })
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

    return res.status(StatusCodes.OK).json(busRoute)
  } catch (error) {
    next(error)
  }
}

const deleteBusRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params

    const routeExists = await redis.exists(`bus_routes:${routeId}`)
    if (!routeExists) {
      return res.status(404).json({ message: 'Route not found' })
    }

    await redis.del(`bus_routes:${routeId}`)

    return res.status(StatusCodes.OK).json({ message: 'Xóa thành công' })
  } catch (error) {
    next(error)
  }
}

const getDetailBusRoute = async (req, res, next) => {
  try {
    const busRouteId = req.params.id
    const route = await redis.hGetAll(`bus_routes:${busRouteId}`)
    if (!route) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Route not found' })
    }
    res.status(StatusCodes.OK).json(JSON.parse(route.data))
  } catch (error) {
    next(error)
  }
}

const updateBusRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params
    const updatedData = req.body

    // Kiểm tra xem tuyến xe có tồn tại trong Redis hay không
    const routeExists = await redis.exists(`bus_routes:${routeId}`)
    if (!routeExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Tuyến xe không tồn tại' })
    }

    // Lấy dữ liệu tuyến xe hiện tại từ Redis
    const currentRoute = await redis.hGetAll(`bus_routes:${routeId}`)

    const updateRoute = {
      ...JSON.parse(currentRoute.data),
      ...updatedData
    }

    // // Lưu dữ liệu cập nhật vào Redis
    await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(updateRoute))

    res.status(StatusCodes.OK).json(updateRoute)
  } catch (error) {
    next(error)
  }
}

const registerRoute = async (req, res, next) => {
  const { routeId, studentId } = req.body

  try {
    // Lấy dữ liệu tuyến xe từ Redis
    const routeData = await redis.hGetAll(`bus_routes:${routeId}`)

    if (!routeData) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Route not found' })
    }

    // Chuyển đổi dữ liệu tuyến xe sang JSON
    let route = JSON.parse(routeData.data)

    // // Kiểm tra xem học sinh đã đăng ký chưa
    const existingStudent = route.students.find((student) => student.student_id === studentId)

    if (existingStudent) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Student already registered on this route' })
    }

    const hasRouteId = await redis.hGetAll(`user:${studentId}`)
    if (hasRouteId && hasRouteId.routeId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Học sinh này đã đăng ký tuyến xe' })
    }
    await redis.hSet(`user:${studentId}`, { ...hasRouteId, routeId })

    // // Thêm học sinh mới vào danh sách students của tuyến xe
    route.students.push({
      student_id: studentId
    })

    await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(route))

    return res.status(200).json({ message: 'Đăng ký tuyến xe thành công' })
  } catch (error) {
    next(error)
  }
}

const unRegisterRoute = async (req, res, next) => {
  try {
    const { studentId, routeId } = req.body

    const student = await redis.hGetAll(`user:${studentId}`)
    if (!student || !student.id) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Student not found' })
    }

    const routeData = await redis.hGetAll(`bus_routes:${routeId}`)

    if (!routeData) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Route not found' })
    }

    // Chuyển đổi dữ liệu tuyến xe từ JSON sang obj JS
    let route = JSON.parse(routeData.data)
    if (!route || !route.id) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Route not found' })
    }

    await redis.hDel(`user:${studentId}`, 'routeId')

    route.students = route.students.filter((item) => item.student_id !== studentId)
    await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(route))

    return res.status(StatusCodes.OK).json({ message: 'Hủy đăng ký thành công' })
  } catch (error) {
    next(error)
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
      const dataBusRoute = JSON.parse(busRoute.data)

      if (dataBusRoute.driver_id === driverId) {
        assignedRoutes.push(dataBusRoute)
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

export const busController = {
  createBusRoute,
  getBusRouteStops,
  getAllBusRoutes,
  deleteBusRoute,
  getDetailBusRoute,
  updateBusRoute,
  registerRoute,
  unRegisterRoute,
  getAssignedBusRoute
}
