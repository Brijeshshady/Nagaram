const logger = (req, res, next) => {
  // Skip logging CORS preflight OPTIONS requests to prevent console clutter
  if (req.method === 'OPTIONS') {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    let statusColor = '\x1b[32m'; // green
    if (res.statusCode >= 500) statusColor = '\x1b[31m'; // red
    else if (res.statusCode >= 400) statusColor = '\x1b[35m'; // magenta
    else if (res.statusCode >= 300) statusColor = '\x1b[33m'; // yellow

    console.log(
      `📅 [${new Date().toLocaleTimeString()}] 🚀 ${req.method} ${req.originalUrl} - ${statusColor}${res.statusCode}\x1b[0m - ⏱️  ${duration}ms`
    );
  });
  next();
};

module.exports = logger;
