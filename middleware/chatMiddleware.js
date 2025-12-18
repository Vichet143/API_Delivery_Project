// chatMiddleware.js
const jwt = require("jsonwebtoken");
const supabase = require("../db/supabase");

module.exports = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No authorization header" });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: "Token format should be: Bearer <token>" });
      }

      const token = parts[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("Decoded token fields:", Object.keys(decoded));
      console.log("Token contents:", decoded);

      let userRole = '';
      const userId = decoded.id;
      

      // Option 1: Check if role is directly in token (for new tokens)
      if (decoded.role) {
        userRole = decoded.role.toLowerCase();
        console.log(`Role from token: ${userRole}`);
      }
      // Option 2: Determine role from database (for existing tokens without role)
      else {
        console.log(`Looking up role for user ID: ${userId}`);

        // Check if user exists in transporters table
        const { data: transporter, error: transporterError } = await supabase
          .from('transporters')
          .select('id')
          .eq('id', userId)
          .single();
        
        
        console.log("Decoded token ID:", decoded.id);
        console.log("Decoded token full:", JSON.stringify(decoded, null, 2));

        console.log('Transporter query result:', { transporter, transporterError });

        // FIX: Check if transporter exists and no error occurred
        if (!transporterError && transporter) {
          userRole = 'transporter';
          console.log(`User ${transporter.transporter_id} is a transporter`);
          
        }
        // Check if user is admin
        else if (!transporterError && !transporter) {
          const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('id')
            .eq('id', userId)
            .single();

          console.log('Admin query result:', { admin, adminError });

          if (!adminError && admin) {
            userRole = 'admin';
            console.log(`User ${userId} is an admin`);
          }
          // Check if user exists in users table
          else if (!adminError && !admin) {
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('id, role')
              .eq('id', userId)
              .single();

            console.log('User query result:', { user, userError });

            if (!userError && user) {
              userRole = user.role ? user.role.toLowerCase() : 'user';
              console.log(`User ${userId} is a ${userRole}`);
            } else {
              console.log(`User ${userId} not found in any role table`);
              return res.status(401).json({
                message: "User not found in system",
                userId: userId
              });
            }
          }
        }
        // If there was an error with transporter query
        else {
          console.error("Transporter query error:", transporterError);
          return res.status(500).json({
            message: "Error checking user role",
            error: transporterError?.message
          });
        }
      }

      // Validate role
      if (!userRole) {
        return res.status(401).json({
          message: "Unable to determine user role",
          userId: userId
        });
      }

      console.log(`Determined role: ${userRole}`);
      console.log(`Allowed roles: [${roles}]`);

      // Check authorization
      const normalizedRoles = roles.map(r => r.toLowerCase());
      if (roles.length > 0 && !normalizedRoles.includes(userRole)) {
        return res.status(403).json({
          message: "Access denied",
          userRole,
          allowedRoles: normalizedRoles,
          userId: userId
        });
      }

      // Attach user to request
      if (userRole === 'transporter') {
        req.transporter = {
          transporter_id: userId,
          role: 'transporter',
          firstname: decoded.firstname,
          lastname: decoded.lastname
        };
      } else {
        req.user = {
          id: userId,
          role: userRole,
          firstname: decoded.firstname,
          lastname: decoded.lastname
        };
      }

      console.log("Request user:", req.user);
      next();
    } catch (err) {
      console.error("JWT Error:", err.message);

      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: "Invalid token signature" });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token has expired" });
      }

      res.status(401).json({ message: "Invalid token", error: err.message });
    }
  };
};