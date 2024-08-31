import { StatusCodes } from 'http-status-codes'

export const checkUserPermission = (...roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role) || !req.user.role) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'You do not have permission to perform this action' })
    }
    next()
  }
}
