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

const createBusRoute = async (req, res, next) => {
  try {
    // Tạo một ID duy nhất cho tuyến xe
    const routeId = uuidv4()

    // Tạo cấu trúc dữ liệu tuyến đường mới
    const newRoute = {
      id: routeId,
      ...req.body,
      students: []
    }

    // Lưu từng trường của newRoute vào Redis dưới dạng các field riêng biệt
    await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(newRoute))

    res.status(201).json({ message: 'Route created successfully', route: newRoute })
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
    const { fullName, age, studentClass, address, parentId } = req.body

    // Tạo một ID duy nhất cho học sinh
    const studentId = uuidv4()

    // Lưu thông tin học sinh vào Redis dưới dạng một user mới
    await redis.hSet(`user:${studentId}`, {
      id: studentId,
      fullName,
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

const registerRoute = async (req, res, next) => {
  const { routeId, studentId, pickupStopId, dropOffStopId } = req.body

  try {
    // Lấy dữ liệu tuyến đường từ Redis
    const routeData = await redis.hGetAll(`bus_routes:${routeId}`)

    if (!routeData) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Route not found' })
    }

    // Chuyển đổi dữ liệu tuyến đường sang JSON
    let route = JSON.parse(routeData.data)

    // Kiểm tra xem học sinh đã đăng ký chưa
    const existingStudent = route.students.find((student) => student.student_id === studentId)

    if (existingStudent) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Student already registered on this route' })
    }

    // Thêm học sinh mới vào danh sách students của tuyến đường
    route.students.push({
      student_id: studentId,
      pickup_stop_id: pickupStopId,
      dropOff_stop_id: dropOffStopId
    })

    // Cập nhật lại dữ liệu tuyến đường trong Redis
    await redis.hSet(`bus_routes:${routeId}`, 'data', JSON.stringify(route))

    res.status(200).json({ message: 'Student registered successfully' })
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

    // Kiểm tra xem tuyến đường có tồn tại trong Redis hay không
    const routeExists = await redis.exists(`bus_routes:${routeId}`)
    if (!routeExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Tuyến đường không tồn tại' })
    }

    // Lấy dữ liệu tuyến đường hiện tại từ Redis
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

const getAllDrivers = async (req, res, next) => {
  try {
    // Lấy tất cả khóa user
    const allUserKeys = await redis.keys('user:*')
    const filteredUsers = allUserKeys.filter((user) => !user.includes('children'))

    const drivers = []

    for (const key of filteredUsers) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      if (user.role === 'Tài xế') {
        drivers.push(user)
      }
    }

    return res.status(StatusCodes.OK).json(drivers)
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

const getAllParents = async (req, res, next) => {
  try {
    const allUserKeys = await redis.keys('user:*')
    const filteredUsers = allUserKeys.filter((user) => !user.includes('children'))

    const parents = []

    for (const key of filteredUsers) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      if (user.role === 'Phụ huynh') {
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
    const filteredUsers = allUserKeys.filter((user) => !user.includes('children'))

    const childrens = []

    for (const key of filteredUsers) {
      const user = await redis.hGetAll(key)
      user.password = undefined
      if (user.role === 'Học sinh') {
        childrens.push(user)
      }
    }

    return res.status(StatusCodes.OK).json(childrens)
  } catch (error) {
    next(error)
  }
}

export const userController = {
  getAllUser,
  getAssignedBusRoute,
  createBusRoute,
  getBusRouteStops,
  confirmStudentPickup,
  confirmStudentDropoff,
  registerStudent,
  updateStudent,
  updateStudentStops,
  registerRoute,
  getDetailUser,
  getDetailBusRoute,
  updateBusRoute,
  getAllBusRoutes,
  getAllDrivers,
  deleteBusRoute,
  getAllParents,
  getAllChildrens
}
