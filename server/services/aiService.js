// =============================================
// NAGARAM - AI Service (Rule-Based, No APIs)
// Pure JavaScript logic for complaint analysis
// =============================================

const { COMPLAINT_CATEGORIES, URGENCY_KEYWORDS, scoreToPriority } = require('../config/categories');
const Complaint = require('../models/Complaint');

/**
 * Classify complaint category based on description keywords
 * @param {string} description - Complaint description text
 * @returns {{ category: string, confidence: number }}
 */
const classifyComplaint = (description) => {
  const text = description.toLowerCase();
  let bestMatch = { category: 'others', confidence: 0, maxScore: 0 };

  for (const [key, config] of Object.entries(COMPLAINT_CATEGORIES)) {
    if (key === 'others') continue;

    let matchCount = 0;
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min((matchCount / config.keywords.length) * 100, 95);
      if (matchCount > bestMatch.maxScore) {
        bestMatch = { category: key, confidence: Math.round(confidence), maxScore: matchCount };
      }
    }
  }

  // Default to 'others' with low confidence if no match
  if (bestMatch.maxScore === 0) {
    bestMatch = { category: 'others', confidence: 20 };
  }

  return { category: bestMatch.category, confidence: bestMatch.confidence };
};

/**
 * Predict priority level based on category, description, and area density
 * @param {string} category - Detected category
 * @param {string} description - Complaint description
 * @param {object} gpsCoordinates - { lat, lng }
 * @returns {{ priority: string, score: number }}
 */
const predictPriority = async (category, description, gpsCoordinates) => {
  const text = description.toLowerCase();
  const categoryConfig = COMPLAINT_CATEGORIES[category] || COMPLAINT_CATEGORIES.others;

  // Start with base priority from category
  let score = categoryConfig.basePriority;

  // Check urgency keywords
  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (text.includes(keyword)) {
      score += 3;
      break;
    }
  }
  for (const keyword of URGENCY_KEYWORDS.high) {
    if (text.includes(keyword)) {
      score += 2;
      break;
    }
  }
  for (const keyword of URGENCY_KEYWORDS.medium) {
    if (text.includes(keyword)) {
      score += 1;
      break;
    }
  }

  // Check complaint density in area (complaints within 500m in last 7 days)
  if (gpsCoordinates && gpsCoordinates.lat && gpsCoordinates.lng) {
    try {
      const nearbyCount = await Complaint.countDocuments({
        'gpsCoordinates.lat': {
          $gte: gpsCoordinates.lat - 0.005,
          $lte: gpsCoordinates.lat + 0.005,
        },
        'gpsCoordinates.lng': {
          $gte: gpsCoordinates.lng - 0.005,
          $lte: gpsCoordinates.lng + 0.005,
        },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      if (nearbyCount > 5) score += 2;
      else if (nearbyCount > 2) score += 1;
    } catch (err) {
      // Silently continue if geo query fails
    }
  }

  // Cap score at 10
  score = Math.min(score, 10);

  return { priority: scoreToPriority(score), score };
};

/**
 * Detect duplicate complaints (same category, nearby location, recent)
 * @param {string} category - Complaint category
 * @param {object} gpsCoordinates - { lat, lng }
 * @returns {{ isDuplicate: boolean, duplicateOf: string|null }}
 */
const detectDuplicate = async (category, gpsCoordinates) => {
  if (!gpsCoordinates || !gpsCoordinates.lat || !gpsCoordinates.lng) {
    return { isDuplicate: false, duplicateOf: null };
  }

  try {
    // Search for complaints within ~100m, same category, within last 7 days
    const duplicate = await Complaint.findOne({
      category,
      'gpsCoordinates.lat': {
        $gte: gpsCoordinates.lat - 0.001,
        $lte: gpsCoordinates.lat + 0.001,
      },
      'gpsCoordinates.lng': {
        $gte: gpsCoordinates.lng - 0.001,
        $lte: gpsCoordinates.lng + 0.001,
      },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: { $nin: ['closed', 'resolved'] },
    }).sort({ createdAt: -1 });

    if (duplicate) {
      return { isDuplicate: true, duplicateOf: duplicate._id };
    }
  } catch (err) {
    // Silently continue
  }

  return { isDuplicate: false, duplicateOf: null };
};

/**
 * Recommend department based on category
 * @param {string} category - Complaint category
 * @returns {string} Department code
 */
const recommendDepartment = (category) => {
  const config = COMPLAINT_CATEGORIES[category];
  return config ? config.department : 'general';
};

/**
 * Full AI analysis pipeline — runs all checks on a complaint
 */
const analyzeComplaint = async (description, gpsCoordinates) => {
  const { category, confidence } = classifyComplaint(description);
  const { priority, score } = await predictPriority(category, description, gpsCoordinates);
  const { isDuplicate, duplicateOf } = await detectDuplicate(category, gpsCoordinates);
  const suggestedDepartment = recommendDepartment(category);

  return {
    detectedCategory: category,
    confidence,
    suggestedPriority: priority,
    priorityScore: score,
    suggestedDepartment,
    isDuplicate,
    duplicateOf,
  };
};

module.exports = {
  classifyComplaint,
  predictPriority,
  detectDuplicate,
  recommendDepartment,
  analyzeComplaint,
};
