import jwt from "jsonwebtoken";

/**
 * verifyToken
 * Validates the Bearer JWT in the Authorization header.
 * On success, attaches decoded payload to req.user and calls next().
 * On failure, returns 401.
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, institute_id }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
