import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import 'dotenv/config'

import { redis } from '~/config/connectRedis'

const signUp = async (req, res, next) => {
  try {
    const userId = uuidv4()
    await redis.hSet(`user:${userId}`, {
      id: userId,
      ...req.body,
      password: await bcrypt.hash(req.body.password, 10)
    })
    // Lưu ánh xạ userName đến userId
    await redis.hSet('usernames', req.body.userName, userId)

    const user = await redis.hGetAll(`user:${userId}`)

    return res.status(StatusCodes.OK).json(user)
  } catch (error) {
    next(error)
  }
}

const logIn = async (req, res, next) => {
  try {
    const { userName, password } = req.body

    // Lấy userId từ userName
    const userId = await redis.hGet('usernames', userName)
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid username or password' })
    }

    // Lấy thông tin người dùng từ Redis bằng userId
    const user = await redis.hGetAll(`user:${userId}`)
    if (!user || !user.password) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid username or password' })
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid username or password' })
    }

    // Tạo token
    const token = jwt.sign({ userId: userId, role: user.role }, process.env.JWT_SECRET, { expiresIn: '3d' })
    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'The account no longer exists' })
    }

    const cookieOptions = {
      expires: new Date(
        //--Đổi thời gian 3 ngày lưu cookie sang milisecond
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    }
    if (process.env.BUILD_MODE === 'production') cookieOptions.secure = true

    res.cookie('token', token, cookieOptions)

    return res.status(200).json({
      message: 'Login successful',
      token
    })
  } catch (error) {
    next(error)
  }
}

export const authController = { signUp, logIn }
