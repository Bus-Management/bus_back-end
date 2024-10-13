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
        stops: JSON.parse(item.stops),
        start_point: JSON.parse(item.start_point),
        end_point: JSON.parse(item.end_point)
      }
    })

    return res.status(StatusCodes.OK).json(newArr)
  } catch (error) {
    next(error)
  }
}

const getBusRoutesAssigned = async (req, res, next) => {
  try {
    const parent = await redis.hGetAll(`user:${req.user.id}`)

    if (!parent || parent.role !== 'parent') {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Phụ huynh không tồn tại hoặc không hợp lệ' })
    }

    const childrenIds = JSON.parse(parent.childrenIds || '[]')

    if (childrenIds.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Phụ huynh chưa có con cái nào đăng ký tuyến xe' })
    }

    const routesKeys = await redis.keys('bus_routes:*')
    const routes = await Promise.all(routesKeys.map((key) => redis.hGetAll(key)))

    // Lọc ra những bus-routes mà có con cái của phụ huynh đã đăng ký
    const parentRoutes = routes.filter((route) => childrenIds.some((childId) => JSON.parse(route.studentIds || '[]').includes(childId)))

    return res.status(StatusCodes.OK).json(parentRoutes)
  } catch (error) {
    next(error)
  }
}

const createBusRoute = async (req, res, next) => {
  try {
    const routeId = uuidv4()

    const newRoute = {
      id: routeId,
      ...req.body,
      start_point: JSON.stringify({
        lng: req.body.start_point[0],
        lat: req.body.start_point[1]
      }),
      end_point: JSON.stringify({
        lng: req.body.end_point[0],
        lat: req.body.end_point[1]
      }),
      stops: JSON.stringify(req.body.stops),
      studentIds: JSON.stringify([])
    }

    await redis.hSet(`bus_routes:${routeId}`, newRoute)

    const bus = await redis.hGetAll(`bus:${req.body.bus_id}`)
    await redis.hSet(`bus:${req.body.bus_id}`, { ...bus, routeId: routeId })

    let listRouteIds = JSON.parse(await redis.hGet(`user:${bus.driverId}`, 'routeIds'))
    listRouteIds.push(routeId)
    await redis.hSet(`user:${bus.driverId}`, 'routeIds', JSON.stringify(listRouteIds))

    return res.status(StatusCodes.CREATED).json({ message: 'Tạo tuyến xe thành công', route: newRoute })
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
    const bus = await redis.hGetAll(`bus:${route.bus_id}`)
    const driverName = await redis.hGet(`user:${bus.driverId}`, 'fullName')

    const parsedRoute = {
      ...route,
      driverName,
      license_plate: bus.license_plate,
      stops: JSON.parse(route.stops),
      studentIds: JSON.parse(route.studentIds)
    }

    return res.status(StatusCodes.OK).json(parsedRoute)
  } catch (error) {
    next(error)
  }
}

const updateBusRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params

    const routeExists = await redis.exists(`bus_routes:${routeId}`)
    if (!routeExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Tuyến xe không tồn tại' })
    }

    const updateRoute = {
      ...req.body,
      start_point: JSON.stringify(req.body.start_point),
      end_point: JSON.stringify(req.body.end_point),
      stops: JSON.stringify(req.body.stops)
    }

    await redis.hSet(`bus_routes:${updateRoute.id}`, updateRoute)

    return res.status(StatusCodes.OK).json({ message: 'Cập nhật thành công' })
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
    let routeStudents = JSON.parse(routeData.studentIds)

    // // Kiểm tra xem học sinh đã đăng ký chưa
    const existingStudent = routeStudents.find((student) => student === studentId)

    if (existingStudent) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Học sinh này đã đăng ký tuyến xe' })
    }

    const hasRouteId = await redis.hGetAll(`user:${studentId}`)
    if (hasRouteId && hasRouteId.routeId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Học sinh này đã đăng ký tuyến xe' })
    }
    await redis.hSet(`user:${studentId}`, { ...hasRouteId, routeId })

    routeStudents.push(studentId)

    // await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(route))
    await redis.hSet(`bus_routes:${routeId}`, { ...routeData, studentIds: JSON.stringify(routeStudents) })

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

    let listStudents = JSON.parse(routeData.studentIds)
    listStudents = listStudents.filter((item) => item !== studentId)
    await redis.hSet(`bus_routes:${routeId}`, { ...routeData, studentIds: JSON.stringify(listStudents) })

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
      const driver_id = await redis.hGet(`bus:${busRoute.bus_id}`, 'driverId')

      if (driver_id === driverId) {
        assignedRoutes.push(busRoute)
      }
    }

    if (assignedRoutes.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No bus routes assigned to this driver' })
    }

    return res.status(StatusCodes.OK).json({
      assignedRoutes
    })
  } catch (error) {
    next(error)
  }
}

const updateRouteStatus = async (req, res, next) => {
  try {
    const { routeId, status } = req.body
    await redis.hSet(`bus_routes:${routeId}`, 'status', status)
    return res.status(StatusCodes.OK).json({ message: 'Cập nhật trạng thái thành công' })
  } catch (error) {
    next(error)
  }
}

export const busRouteController = {
  createBusRoute,
  getBusRouteStops,
  getAllBusRoutes,
  deleteBusRoute,
  getDetailBusRoute,
  updateBusRoute,
  registerRoute,
  unRegisterRoute,
  getAssignedBusRoute,
  updateRouteStatus,
  getBusRoutesAssigned
}
