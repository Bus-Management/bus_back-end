import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import 'dotenv/config'

import { redis } from '~/config/connectRedis'

const createBus = async (req, res, next) => {
  try {
    const busId = uuidv4()

    const newBus = {
      id: busId,
      ...req.body,
      studentIds: JSON.stringify([]),
      active: 1
    }

    await redis.hSet(`bus:${busId}`, newBus)

    return res.status(StatusCodes.CREATED).json({ message: 'Tạo xe bus thành công', bus: newBus })
  } catch (error) {
    next(error)
  }
}

const getAllBus = async (req, res, next) => {
  try {
    const busKeys = await redis.keys('bus:*')

    const allBus = []

    for (const key of busKeys) {
      const busRoute = await redis.hGetAll(key)
      allBus.push(busRoute)
    }

    const newArr = await Promise.all(
      allBus.map(async (item) => {
        const driver = await redis.hGetAll(`user:${item.driverId}`)
        const route = await redis.hGetAll(`bus_routes:${item.routeId}`)

        return {
          ...item,
          driver_name: driver.fullName,
          route_name: route.route_name
        }
      })
    )

    return res.status(StatusCodes.OK).json(newArr)
  } catch (error) {
    next(error)
  }
}

const getDetailBus = async (req, res, next) => {
  try {
    const id = req.params.id
    const bus = await redis.hGetAll(`bus:${id}`)
    if (!bus) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Route not found' })
    }

    return res.status(StatusCodes.OK).json(bus)
  } catch (error) {
    next(error)
  }
}

const deleteBus = async (req, res, next) => {
  try {
    const { busId } = req.params

    const busExists = await redis.exists(`bus:${busId}`)
    if (!busExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Bus not found' })
    }

    await redis.del(`bus:${busId}`)

    return res.status(StatusCodes.OK).json({ message: 'Xóa thành công' })
  } catch (error) {
    next(error)
  }
}

export const busController = { createBus, getAllBus, getDetailBus, deleteBus }
