const supabase = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies.session;

    const token = authHeader ? authHeader.split(' ')[1] : cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res
        .status(401)
        .json({ error: 'Invalid or expired session token' });
    }

    // Get user metadata including position_title
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('position_title')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({ error: 'Error fetching user data' });
    }

    // Add user data to the request object
    req.user = user;
    req.userData = userData;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user is a therapist
const requireTherapist = (req, res, next) => {
  if (!req.userData || req.userData.position_title !== 'therapist') {
    return res.status(403).json({ error: 'Access denied. Therapist role required.' });
  }
  next();
};

// Middleware to check if user is an admin
const requireAdmin = (req, res, next) => {
  if (!req.userData || req.userData.position_title !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = {
  authMiddleware,
  requireTherapist,
  requireAdmin
};
