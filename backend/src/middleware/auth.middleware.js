const jwt = require("jsonwebtoken");
const User = require("../models/mongo/User.model");
const AppError = require("../utils/AppError");

/**
 * Protect routes — verifies JWT and attaches user to req
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Not authorized. No token provided.", 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check user still exists
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new AppError("User no longer exists.", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Role '${req.user.role}' is not authorized for this action.`, 403)
      );
    }
    next();
  };
};

module.exports = { protect, authorize };

