/**
 * Constraint Satisfaction Module
 * Handles resource constraints, dependencies, and conflict resolution
 */

class ConstraintSolver {
  constructor() {
    this.constraints = new Map();
    this.resources = new Map();
  }

  /**
   * Add a constraint
   */
  addConstraint(id, constraint) {
    this.constraints.set(id, constraint);
  }

  /**
   * Check if a step satisfies all constraints
   */
  checkConstraints(step, context) {
    const violations = [];
    
    for (const [id, constraint] of this.constraints.entries()) {
      if (!constraint.check(step, context)) {
        violations.push({
          constraintId: id,
          reason: constraint.reason,
          severity: constraint.severity || 'error'
        });
      }
    }
    
    return {
      satisfied: violations.length === 0,
      violations
    };
  }

  /**
   * Find conflicts between steps
   */
  findConflicts(steps, schedule) {
    const conflicts = [];
    
    // Resource conflicts
    const resourceUsage = new Map();
    
    for (const step of steps) {
      if (step.resources) {
        for (const [resource, amount] of Object.entries(step.resources)) {
          const timing = schedule.get(step.id);
          if (!timing) continue;
          
          if (!resourceUsage.has(resource)) {
            resourceUsage.set(resource, []);
          }
          
          resourceUsage.get(resource).push({
            step: step.id,
            start: timing.startTime,
            end: timing.endTime,
            amount
          });
        }
      }
    }
    
    // Check for overlapping resource usage
    for (const [resource, usages] of resourceUsage.entries()) {
      usages.sort((a, b) => a.start - b.start);
      
      for (let i = 0; i < usages.length - 1; i++) {
        const current = usages[i];
        const next = usages[i + 1];
        
        if (current.end > next.start) {
          const available = this.resources.get(resource)?.capacity || Infinity;
          const required = current.amount + next.amount;
          
          if (required > available) {
            conflicts.push({
              type: 'resource',
              resource,
              steps: [current.step, next.step],
              required,
              available,
              overlap: {
                start: next.start,
                end: Math.min(current.end, next.end)
              }
            });
          }
        }
      }
    }
    
    // Temporal conflicts (ordering violations)
    for (const step of steps) {
      if (step.constraints?.before) {
        for (const beforeStep of step.constraints.before) {
          const stepTiming = schedule.get(step.id);
          const beforeTiming = schedule.get(beforeStep);
          
          if (stepTiming && beforeTiming && stepTiming.endTime > beforeTiming.startTime) {
            conflicts.push({
              type: 'temporal',
              steps: [step.id, beforeStep],
              constraint: 'must-finish-before',
              violation: 'overlapping or reversed order'
            });
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Resolve conflicts by adjusting schedule
   */
  resolveConflicts(conflicts, schedule, steps, dependencies) {
    const resolved = new Map(schedule);
    
    for (const conflict of conflicts) {
      if (conflict.type === 'resource') {
        // Try to shift one of the conflicting steps
        const [step1, step2] = conflict.steps;
        const timing1 = resolved.get(step1);
        const timing2 = resolved.get(step2);
        
        // Shift the later step to after the earlier one
        if (timing1.start < timing2.start) {
          const newStart = timing1.end;
          const duration = timing2.endTime - timing2.startTime;
          resolved.set(step2, {
            startTime: newStart,
            endTime: newStart + duration,
            duration
          });
        } else {
          const newStart = timing2.end;
          const duration = timing1.endTime - timing1.startTime;
          resolved.set(step1, {
            startTime: newStart,
            endTime: newStart + duration,
            duration
          });
        }
      } else if (conflict.type === 'temporal') {
        // Enforce ordering constraint
        const [step1, step2] = conflict.steps;
        const timing1 = resolved.get(step1);
        const timing2 = resolved.get(step2);
        
        if (timing1.endTime > timing2.startTime) {
          // Move step2 to after step1
          const duration = timing2.endTime - timing2.startTime;
          resolved.set(step2, {
            startTime: timing1.endTime,
            endTime: timing1.endTime + duration,
            duration
          });
        }
      }
    }
    
    // Propagate changes to dependent steps
    this.propagateChanges(resolved, dependencies);
    
    return resolved;
  }

  /**
   * Propagate schedule changes through dependency graph
   */
  propagateChanges(schedule, dependencies) {
    const sorted = this.topologicalSort(dependencies);
    
    for (const stepId of sorted) {
      const node = dependencies.get(stepId);
      const timing = schedule.get(stepId);
      
      if (!timing) continue;
      
      // Ensure step starts after all dependencies
      let minStart = timing.startTime;
      for (const depId of node.dependsOn) {
        const depTiming = schedule.get(depId);
        if (depTiming) {
          minStart = Math.max(minStart, depTiming.endTime);
        }
      }
      
      if (minStart > timing.startTime) {
        const duration = timing.duration;
        schedule.set(stepId, {
          startTime: minStart,
          endTime: minStart + duration,
          duration
        });
      }
    }
  }

  topologicalSort(dependencies) {
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

  /**
   * Register a resource with capacity
   */
  registerResource(name, capacity, metadata = {}) {
    this.resources.set(name, {
      capacity,
      metadata,
      registeredAt: Date.now()
    });
  }

  /**
   * Check resource availability
   */
  checkResourceAvailability(resource, amount, startTime, endTime) {
    const res = this.resources.get(resource);
    if (!res) {
      return { available: false, reason: 'Resource not found' };
    }
    
    if (amount > res.capacity) {
      return {
        available: false,
        reason: `Requested amount (${amount}) exceeds capacity (${res.capacity})`
      };
    }
    
    // Check for conflicts in time window
    // (Would need to track allocations - simplified here)
    
    return { available: true };
  }
}

/**
 * Common constraint types
 */
const CommonConstraints = {
  /**
   * Step must complete before a deadline
   */
  deadline(timestamp) {
    return {
      check: (step, context) => {
        const timing = context.schedule.get(step.id);
        return timing && timing.endTime <= timestamp;
      },
      reason: `Must complete before ${new Date(timestamp).toISOString()}`,
      severity: 'error'
    };
  },

  /**
   * Step must not start before a time
   */
  notBefore(timestamp) {
    return {
      check: (step, context) => {
        const timing = context.schedule.get(step.id);
        return timing && timing.startTime >= timestamp;
      },
      reason: `Cannot start before ${new Date(timestamp).toISOString()}`,
      severity: 'error'
    };
  },

  /**
   * Step must execute during business hours
   */
  businessHoursOnly() {
    return {
      check: (step, context) => {
        const timing = context.schedule.get(step.id);
        if (!timing) return false;
        
        const start = new Date(timing.startTime);
        const end = new Date(timing.endTime);
        
        // Check if entirely within business hours (simplified)
        const startHour = start.getHours();
        const endHour = end.getHours();
        const startDay = start.getDay();
        
        return startDay >= 1 && startDay <= 5 &&
               startHour >= 9 && endHour <= 17;
      },
      reason: 'Must execute during business hours (M-F 9am-5pm)',
      severity: 'warning'
    };
  },

  /**
   * Step requires specific resources
   */
  requiresResources(resources) {
    return {
      check: (step, context) => {
        for (const [resource, amount] of Object.entries(resources)) {
          const available = context.solver.checkResourceAvailability(
            resource,
            amount,
            context.schedule.get(step.id)?.startTime,
            context.schedule.get(step.id)?.endTime
          );
          
          if (!available.available) {
            return false;
          }
        }
        return true;
      },
      reason: `Requires resources: ${Object.keys(resources).join(', ')}`,
      severity: 'error'
    };
  },

  /**
   * Step must complete before another step
   */
  mustPrecedе(otherStepId) {
    return {
      check: (step, context) => {
        const timing = context.schedule.get(step.id);
        const otherTiming = context.schedule.get(otherStepId);
        
        return timing && otherTiming && timing.endTime <= otherTiming.startTime;
      },
      reason: `Must complete before step ${otherStepId}`,
      severity: 'error'
    };
  }
};

module.exports = {
  ConstraintSolver,
  CommonConstraints
};
