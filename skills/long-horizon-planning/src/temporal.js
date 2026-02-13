/**
 * Temporal Reasoning Utilities
 * Handles time-based constraints, scheduling, and reasoning
 */

/**
 * Parse natural language time expressions
 */
function parseTimeExpression(expr) {
  const now = Date.now();
  
  // Relative times
  const patterns = {
    'in (\\d+) (minute|hour|day|week|month)s?': (match) => {
      const amount = parseInt(match[1]);
      const unit = match[2];
      const multipliers = {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
      };
      return now + (amount * multipliers[unit]);
    },
    
    '(\\d+) (minute|hour|day|week|month)s? from now': (match) => {
      const amount = parseInt(match[1]);
      const unit = match[2];
      const multipliers = {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
      };
      return now + (amount * multipliers[unit]);
    },
    
    'tomorrow': () => now + (24 * 60 * 60 * 1000),
    'next week': () => now + (7 * 24 * 60 * 60 * 1000),
    'next month': () => now + (30 * 24 * 60 * 60 * 1000)
  };
  
  for (const [pattern, handler] of Object.entries(patterns)) {
    const regex = new RegExp(pattern, 'i');
    const match = expr.match(regex);
    if (match) {
      return handler(match);
    }
  }
  
  // Try ISO date
  const date = new Date(expr);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }
  
  throw new Error(`Unable to parse time expression: ${expr}`);
}

/**
 * Check if time falls within business hours
 */
function isBusinessHours(timestamp, timezone = 'UTC') {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const day = date.getDay();
  
  // Monday-Friday, 9am-5pm
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

/**
 * Calculate next business day
 */
function nextBusinessDay(timestamp) {
  const date = new Date(timestamp);
  let next = new Date(date);
  
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  
  return next.getTime();
}

/**
 * Calculate working hours between two timestamps
 */
function workingHoursBetween(start, end, hoursPerDay = 8) {
  let current = new Date(start);
  const endDate = new Date(end);
  let hours = 0;
  
  while (current < endDate) {
    if (isBusinessHours(current.getTime())) {
      hours++;
    }
    current.setHours(current.getHours() + 1);
  }
  
  return hours;
}

/**
 * Find next available time slot
 */
function findNextSlot(startTime, duration, constraints = {}) {
  let candidate = startTime;
  
  // Check business hours constraint
  if (constraints.businessHoursOnly) {
    while (!isBusinessHours(candidate)) {
      candidate += 60 * 60 * 1000; // Add 1 hour
    }
  }
  
  // Check blackout periods
  if (constraints.blackouts) {
    for (const blackout of constraints.blackouts) {
      if (candidate >= blackout.start && candidate < blackout.end) {
        candidate = blackout.end;
      }
    }
  }
  
  return candidate;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate slack time for a step
 */
function calculateSlack(step, schedule, dependencies) {
  const timing = schedule.get(step.id);
  if (!timing) return 0;
  
  // Latest finish time without delaying dependents
  let latestFinish = Infinity;
  
  const node = dependencies.get(step.id);
  if (node.dependents.size === 0) {
    // No dependents, slack is based on deadline
    latestFinish = timing.endTime;
  } else {
    // Find minimum start time of dependents
    for (const depId of node.dependents) {
      const depTiming = schedule.get(depId);
      if (depTiming) {
        latestFinish = Math.min(latestFinish, depTiming.startTime);
      }
    }
  }
  
  return latestFinish - timing.endTime;
}

/**
 * Check if schedule is feasible
 */
function isFeasible(schedule, constraints) {
  if (!constraints.deadline) return true;
  
  let maxEnd = 0;
  for (const timing of schedule.values()) {
    maxEnd = Math.max(maxEnd, timing.endTime);
  }
  
  return maxEnd <= constraints.deadline;
}

/**
 * Optimize schedule to minimize makespan
 */
function optimizeSchedule(steps, dependencies, constraints) {
  // Simple heuristic: schedule critical path items first
  // More sophisticated optimization would use constraint programming
  
  const schedule = new Map();
  const sorted = topologicalSort(dependencies);
  
  let currentTime = constraints.startTime || Date.now();
  
  for (const stepId of sorted) {
    const node = dependencies.get(stepId);
    const step = node.step;
    
    // Find earliest start considering dependencies
    let earliestStart = currentTime;
    for (const depId of node.dependsOn) {
      const depTiming = schedule.get(depId);
      if (depTiming) {
        earliestStart = Math.max(earliestStart, depTiming.endTime);
      }
    }
    
    earliestStart = findNextSlot(earliestStart, step.estimatedDuration, constraints);
    
    schedule.set(stepId, {
      startTime: earliestStart,
      endTime: earliestStart + step.estimatedDuration,
      duration: step.estimatedDuration
    });
  }
  
  return schedule;
}

function topologicalSort(dependencies) {
  const sorted = [];
  const inDegree = new Map();
  const queue = [];
  
  for (const [stepId, node] of dependencies.entries()) {
    inDegree.set(stepId, node.dependsOn.size);
    if (node.dependsOn.size === 0) {
      queue.push(stepId);
    }
  }
  
  while (queue.length > 0) {
    const stepId = queue.shift();
    sorted.push(stepId);
    
    const node = dependencies.get(stepId);
    for (const dependent of node.dependents) {
      const degree = inDegree.get(dependent) - 1;
      inDegree.set(dependent, degree);
      if (degree === 0) {
        queue.push(dependent);
      }
    }
  }
  
  return sorted;
}

module.exports = {
  parseTimeExpression,
  isBusinessHours,
  nextBusinessDay,
  workingHoursBetween,
  findNextSlot,
  formatDuration,
  calculateSlack,
  isFeasible,
  optimizeSchedule
};
