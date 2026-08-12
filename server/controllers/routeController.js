const Route = require('../models/Route');
const Complaint = require('../models/Complaint');
const Dustbin = require('../models/Dustbin');

const getWorkerRoute = async (req, res, next) => {
  try {
    const { workerId, date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const route = await Route.findOne({
      workerId: workerId || req.user._id,
      date: { $gte: queryDate, $lt: nextDay }
    }).populate('assignedBy', 'name');

    res.json({ route });
  } catch (error) {
    next(error);
  }
};

const assignRoute = async (req, res, next) => {
  try {
    const { workerId, waypoints, date } = req.body;
    
    let targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

    let route = await Route.findOne({
      workerId,
      date: targetDate
    });

    if (route) {
      route.waypoints = waypoints;
      route.assignedBy = req.user._id;
    } else {
      route = new Route({
        workerId,
        assignedBy: req.user._id,
        date: targetDate,
        waypoints
      });
    }

    await route.save();
    res.json({ message: 'Route assigned successfully', route });
  } catch (error) {
    next(error);
  }
};

// Auto calculate route based on assigned complaints and dustbins
const autoCalculateRoute = async (req, res, next) => {
  try {
    const { workerId, date, startLocation } = req.body;
    const queryDate = new Date(date || new Date());
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Fetch assigned complaints
    const complaints = await Complaint.find({
      assignedWorker: workerId,
      status: { $in: ['assigned', 'in_progress'] }
    });

    // In a real app, you might use an API like OSRM or Google Maps for TSP.
    // Here we'll do a simple distance sorting (nearest neighbor) from startLocation.
    
    let waypoints = [];
    let currentLoc = startLocation || { lat: 13.0827, lng: 80.2707 }; // Default Chennai

    let unvisited = complaints.map(c => ({
      lat: c.gpsCoordinates.lat,
      lng: c.gpsCoordinates.lng,
      pointType: 'complaint',
      refId: c._id
    }));

    let order = 1;
    while (unvisited.length > 0) {
      // Find nearest
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const dist = Math.pow(unvisited[i].lat - currentLoc.lat, 2) + Math.pow(unvisited[i].lng - currentLoc.lng, 2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      let nearest = unvisited.splice(nearestIdx, 1)[0];
      nearest.order = order++;
      waypoints.push(nearest);
      currentLoc = nearest;
    }

    let route = await Route.findOne({ workerId, date: queryDate });
    if (route) {
      route.waypoints = waypoints;
      route.assignedBy = req.user._id;
    } else {
      route = new Route({
        workerId,
        assignedBy: req.user._id,
        date: queryDate,
        waypoints
      });
    }

    await route.save();
    res.json({ message: 'Route auto-calculated and assigned', route });

  } catch (error) {
    next(error);
  }
};

module.exports = { getWorkerRoute, assignRoute, autoCalculateRoute };
