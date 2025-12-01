const jwt = require("jsonwebtoken");

const chatuserMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      firstname: decoded.firstname,
      lastname: decoded.lastname
    };
    console.log(decoded.id);
    
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = chatuserMiddleware;
