import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import 'dotenv/config'

const WHITELIST_DOMAINS = ['http://localhost:5173']

export const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.BUILD_MODE === 'dev') {
      return callback(null, true)
    }

    if (WHITELIST_DOMAINS.includes(origin)) {
      return callback(null, true)
    }

    // Cuối cùng nếu domain không được chấp nhận thì trả về lỗi
    return callback(new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`))
  },

  optionsSuccessStatus: 200,

  credentials: true
}
