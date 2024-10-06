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
      allRoutes.push(busRoute)
    }
    const newArr = allRoutes.map((item) => {
      return {
        ...item,
        stops: JSON.parse(item.stops)
      }
    })

    return res.status(StatusCodes.OK).json(newArr)
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
      stops: JSON.stringify(req.body.stops),
      students: JSON.stringify([])
    }

    // Lưu từng trường của newRoute vào Redis dưới dạng các field riêng biệt
    await redis.hSet(`bus_routes:${routeId}`, newRoute)

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

    if (!busRoute) {
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
    const parsedRoute = {
      ...route,
      stops: JSON.parse(route.stops),
      students: JSON.parse(route.students)
    }
    res.status(StatusCodes.OK).json(parsedRoute)
  } catch (error) {
    next(error)
  }
}

const updateBusRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params

    // Kiểm tra xem tuyến xe có tồn tại trong Redis hay không
    const routeExists = await redis.exists(`bus_routes:${routeId}`)
    if (!routeExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Tuyến xe không tồn tại' })
    }

    const updateRoute = {
      ...req.body,
      stops: JSON.stringify(req.body.stops)
    }

    // // Lưu dữ liệu cập nhật vào Redis
    await redis.hSet(`bus_routes:${routeId}`, { ...updateRoute })

    res.status(StatusCodes.OK).json({ message: 'Thành công' })
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
    let routeStudents = JSON.parse(routeData.students)

    // // Kiểm tra xem học sinh đã đăng ký chưa
    const existingStudent = routeStudents.find((student) => student.student_id === studentId)

    if (existingStudent) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Học sinh này đã đăng ký tuyến xe' })
    }

    const hasRouteId = await redis.hGetAll(`user:${studentId}`)
    if (hasRouteId && hasRouteId.routeId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Học sinh này đã đăng ký tuyến xe' })
    }
    await redis.hSet(`user:${studentId}`, { ...hasRouteId, routeId })

    // // Thêm học sinh mới vào danh sách students của tuyến xe
    routeStudents.push({
      student_id: studentId
    })

    // await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(route))
    await redis.hSet(`bus_routes:${routeId}`, { ...routeData, students: JSON.stringify(routeStudents) })

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

    if (!routeData || !routeData.id) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Route not found' })
    }

    await redis.hDel(`user:${studentId}`, 'routeId')

    let listStudents = JSON.parse(routeData.students)
    listStudents = listStudents.filter((item) => item.student_id !== studentId)
    await redis.hSet(`bus_routes:${routeId}`, { ...routeData, students: JSON.stringify(listStudents) })

    return res.status(StatusCodes.OK).json({ message: 'Hủy đăng ký thành công' })
  } catch (error) {
    next(error)
  }
}

// --------------Xem tuyến xe được phân công của tài xế
const getAssignedBusRoute = async (req, res, next) => {
  try {
    const { driverId } = req.params

    const busRouteKeys = await redis.keys('bus_routes:*')

    const assignedRoutes = []

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
