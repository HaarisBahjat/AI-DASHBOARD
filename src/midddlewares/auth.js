const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/db');
const SECRET_KEY = 'your_secret_key';

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
            email: user.email,
            role: user.role
        };
        next();
      } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
      }
};

module.exports = authMiddleware;