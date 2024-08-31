import { StatusCodes } from 'http-status-codes'
import { promisify } from 'util'
import jwt from 'jsonwebtoken'
import 'dotenv/config'

import { redis } from '~/config/connectRedis'

export const verifyToken = async (req, res, next) => {
  // 1) Getting token and check of it's there
  const token = req.cookies.token

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'You are not logged in! Please log in to get access.' })
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
  if (!decoded) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not authenticated!!!' })
  }
  // 3) Check if user still exists
  const currentUser = await redis.hGetAll(`user:${decoded.userId}`)
  if (!currentUser) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'The user belonging to this token does no longer exist.' })
  }

  req.user = currentUser
  next()
}
