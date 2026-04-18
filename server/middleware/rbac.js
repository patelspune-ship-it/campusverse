/**
 * requireRole(...roles)
 * Factory that returns middleware restricting access to users whose role
 * matches one of the provided roles — OR is "super_admin" (always allowed).
 *
 * Usage:
 *   router.get("/route", verifyToken, requireRole("student"), handler)
 *   router.get("/route", verifyToken, requireRole("club_admin", "faculty"), handler)
 *
 * Must be used AFTER verifyToken so that req.user is populated.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: no user context" });
    }

    const { role } = req.user;

    // super_admin bypasses all role restrictions
    if (role === "super_admin") return next();

    if (roles.includes(role)) return next();

    return res.status(403).json({
      message: `Forbidden: requires role ${roles.join(" or ")}`,
    });
  };
}
