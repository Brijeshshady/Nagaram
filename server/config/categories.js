// =============================================
// NAGARAM - Complaint Categories & AI Rules
// =============================================

const COMPLAINT_CATEGORIES = {
  garbage: {
    label: 'Garbage',
    keywords: ['garbage', 'trash', 'waste', 'litter', 'rubbish', 'refuse'],
    department: 'waste_management',
    basePriority: 3,
    icon: '🗑️',
  },
  overflowing_dustbin: {
    label: 'Overflowing Dustbin',
    keywords: ['dustbin', 'bin', 'overflowing', 'full bin', 'overflow'],
    department: 'waste_management',
    basePriority: 4,
    icon: '🚮',
  },
  illegal_dumping: {
    label: 'Illegal Dumping',
    keywords: ['dumping', 'illegal', 'dump', 'unauthorized', 'hazardous'],
    department: 'waste_management',
    basePriority: 5,
    icon: '⚠️',
  },
  road_damage: {
    label: 'Road Damage',
    keywords: ['pothole', 'road', 'crack', 'broken road', 'road damage', 'asphalt', 'pavement'],
    department: 'roads',
    basePriority: 4,
    icon: '🛣️',
  },
  drainage_blockage: {
    label: 'Drainage Blockage',
    keywords: ['drain', 'blocked', 'sewage', 'clog', 'drainage', 'sewer', 'flooding'],
    department: 'drainage',
    basePriority: 5,
    icon: '🚿',
  },
  streetlight: {
    label: 'Streetlight Issue',
    keywords: ['light', 'streetlight', 'dark', 'lamp', 'bulb', 'street light', 'not working'],
    department: 'electrical',
    basePriority: 3,
    icon: '💡',
  },
  public_toilet: {
    label: 'Public Toilet',
    keywords: ['toilet', 'bathroom', 'restroom', 'lavatory', 'washroom', 'dirty toilet'],
    department: 'sanitation',
    basePriority: 4,
    icon: '🚻',
  },
  water_leakage: {
    label: 'Water Leakage',
    keywords: ['water', 'leak', 'pipe', 'burst', 'supply', 'tap', 'water leak'],
    department: 'water_supply',
    basePriority: 5,
    icon: '💧',
  },
  park_maintenance: {
    label: 'Park Maintenance',
    keywords: ['park', 'garden', 'tree', 'bench', 'playground', 'grass', 'maintenance'],
    department: 'parks',
    basePriority: 2,
    icon: '🌳',
  },
  others: {
    label: 'Others',
    keywords: [],
    department: 'general',
    basePriority: 2,
    icon: '📋',
  },
};

// Urgency keywords that increase priority
const URGENCY_KEYWORDS = {
  critical: ['emergency', 'danger', 'dangerous', 'urgent', 'immediate', 'hazard', 'accident', 'collapsed'],
  high: ['overflowing', 'flooding', 'burst', 'broken', 'blocked', 'severe', 'major'],
  medium: ['damaged', 'leaking', 'dirty', 'not working', 'faulty'],
};

// Complaint statuses
const COMPLAINT_STATUS = {
  SUBMITTED: 'submitted',
  AI_ANALYZING: 'ai_analyzing',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  VERIFICATION: 'verification',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  ESCALATED: 'escalated',
};

// Priority levels
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Map numeric score to priority label
const scoreToPriority = (score) => {
  if (score >= 8) return PRIORITY_LEVELS.CRITICAL;
  if (score >= 6) return PRIORITY_LEVELS.HIGH;
  if (score >= 4) return PRIORITY_LEVELS.MEDIUM;
  return PRIORITY_LEVELS.LOW;
};

module.exports = {
  COMPLAINT_CATEGORIES,
  URGENCY_KEYWORDS,
  COMPLAINT_STATUS,
  PRIORITY_LEVELS,
  scoreToPriority,
};
