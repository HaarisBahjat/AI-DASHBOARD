const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/db');
// [G] Never hardcode secrets — read from environment and fail fast if missing
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error('JWT_SECRET env var is not set. Add it to your .env file.');
}

const authMiddleware = async (req, res, next) => {
      try {
        //Verify token and find user
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ error: 'Authorization header missing.' });
        }
        
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        //Attach user to request
        req.user = {
            _id: user._id,
          name: user.name,
            email: user.email,
            role: user.role
        };
        next();
      } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
      }
};

module.exports = authMiddleware;