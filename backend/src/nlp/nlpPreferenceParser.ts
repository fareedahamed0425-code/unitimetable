import { PreferencePriority, SmartPreferenceRule } from '../../../shared/types';

export interface NLPParsedResponse {
  originalPrompt: string;
  summary: string;
  interpretedRules: SmartPreferenceRule[];
  confidence: number;
}

export class NLPPreferenceParser {
  public static parse(prompt: string): NLPParsedResponse {
    const text = prompt.toLowerCase();
    const rules: SmartPreferenceRule[] = [];
    const explanations: string[] = [];

    let idCounter = 1;
    const generateId = () => `rule-nlp-${Date.now()}-${idCounter++}`;

    // 1. Student Gap Minimization
    if (text.includes('gap') || text.includes('compact') || text.includes('contiguous') || text.includes('few gaps') || text.includes('minimize gap')) {
      const isVeryHigh = text.includes('as few gaps as possible') || text.includes('no gap') || text.includes('strict');
      rules.push({
        id: generateId(),
        category: 'STUDENT',
        ruleCode: 'MINIMIZE_GAPS',
        name: 'Minimize Student Schedule Gaps',
        description: 'Keep daily student lectures and labs contiguous with minimum idle waiting hours',
        targetScope: 'GLOBAL',
        priority: isVeryHigh ? 'VERY_HIGH' : 'HIGH',
        weight: isVeryHigh ? 90 : 75,
        isEnabled: true
      });
      explanations.push('Minimize student timetable gaps — High priority');
    }

    // 2. Late Classes Avoidance (e.g. after 4 PM, after 5 PM, no late classes)
    if (text.includes('after 4') || text.includes('after 5') || text.includes('no late') || text.includes('avoid late') || text.includes('finish early') || text.includes('between 9') || text.includes('by 4')) {
      let maxPeriod = 6;
      if (text.includes('after 4') || text.includes('by 4') || text.includes('between 9 am and 4 pm') || text.includes('between 9 and 4')) {
        maxPeriod = 6;
      } else if (text.includes('after 5') || text.includes('by 5')) {
        maxPeriod = 7;
      }
      rules.push({
        id: generateId(),
        category: 'STUDENT',
        ruleCode: 'AVOID_LATE_CLASSES',
        name: `Avoid Late Classes (After Period ${maxPeriod})`,
        description: `Do not schedule student lectures in late evening slots beyond period ${maxPeriod}`,
        targetScope: 'GLOBAL',
        priority: 'HIGH',
        weight: 80,
        parameterValue: { maxPeriod },
        isEnabled: true
      });
      explanations.push(`No classes after ${maxPeriod >= 7 ? '5:00 PM' : '4:00 PM'} — High priority`);
    }

    // 3. Early Classes Avoidance
    if (text.includes('avoid early') || text.includes('no 9 am') || text.includes('no early') || text.includes('prefer late morning')) {
      rules.push({
        id: generateId(),
        category: 'STUDENT',
        ruleCode: 'AVOID_EARLY_CLASSES',
        name: 'Avoid First Period (Early Morning 9 AM)',
        description: 'Minimize scheduling classes in the earliest morning slot',
        targetScope: 'GLOBAL',
        priority: 'MEDIUM',
        weight: 60,
        isEnabled: true
      });
      explanations.push('Avoid early 9:00 AM classes where feasible — Medium priority');
    }

    // 4. Afternoon Labs
    if (text.includes('afternoon lab') || text.includes('labs in the afternoon') || text.includes('labs preferably in the afternoon') || text.includes('practical in afternoon')) {
      rules.push({
        id: generateId(),
        category: 'STUDENT',
        ruleCode: 'PREFER_AFTERNOON_LABS',
        name: 'Prefer Afternoon Practical Labs',
        description: 'Schedule multi-hour practical laboratory sessions during afternoon periods (after lunch)',
        targetScope: 'GLOBAL',
        priority: 'HIGH',
        weight: 80,
        isEnabled: true
      });
      explanations.push('Place laboratory practicals in afternoon sessions — High priority');
    }

    // 5. Teacher Consecutive Classes Limit
    const consecMatch = text.match(/(\d+)\s*consecutive/);
    if (consecMatch || text.includes('consecutive') || text.includes('continuous classes')) {
      const maxConsec = consecMatch ? parseInt(consecMatch[1], 10) : 3;
      rules.push({
        id: generateId(),
        category: 'TEACHER',
        ruleCode: 'MAX_CONSECUTIVE_CLASSES',
        name: `Teacher Max ${maxConsec} Consecutive Classes`,
        description: `Ensure faculty members do not exceed ${maxConsec} consecutive periods of teaching without a break`,
        targetScope: 'GLOBAL',
        priority: 'VERY_HIGH',
        weight: 90,
        parameterValue: { maxConsecutive: maxConsec },
        isEnabled: true
      });
      explanations.push(`Maximum ${maxConsec} consecutive teacher periods — High priority`);
    }

    // 6. Day restrictions (Avoid Saturday, Free Friday afternoon)
    if (text.includes('saturday') || text.includes('saturdays') || text.includes('weekend')) {
      rules.push({
        id: generateId(),
        category: 'UNIVERSITY',
        ruleCode: 'AVOID_SATURDAY',
        name: 'Avoid Saturday Classes',
        description: 'Concentrate all academic activities from Monday to Friday',
        targetScope: 'GLOBAL',
        priority: 'VERY_HIGH',
        weight: 95,
        isEnabled: true
      });
      explanations.push('Avoid Saturday scheduling — Very High priority');
    }

    if (text.includes('friday afternoon') || text.includes('free friday') || text.includes('friday off')) {
      rules.push({
        id: generateId(),
        category: 'UNIVERSITY',
        ruleCode: 'FREE_FRIDAY_AFTERNOON',
        name: 'Free Friday Afternoon',
        description: 'Keep Friday afternoon open for faculty meetings, seminars and student clubs',
        targetScope: 'GLOBAL',
        priority: 'HIGH',
        weight: 75,
        isEnabled: true
      });
      explanations.push('Keep Friday afternoons free — High priority');
    }

    // 7. Teacher gaps
    if (text.includes('teacher gap') || text.includes('faculty gap') || text.includes('faculty friendly')) {
      rules.push({
        id: generateId(),
        category: 'TEACHER',
        ruleCode: 'MINIMIZE_TEACHER_GAPS',
        name: 'Minimize Teacher Idle Gaps',
        description: 'Consolidate faculty teaching blocks to avoid scattered idle time',
        targetScope: 'GLOBAL',
        priority: 'HIGH',
        weight: 80,
        isEnabled: true
      });
      explanations.push('Minimize faculty idle gaps between lectures — High priority');
    }

    // 8. Room Hopping & Utilization
    if (text.includes('room change') || text.includes('building change') || text.includes('room hop') || text.includes('same room')) {
      rules.push({
        id: generateId(),
        category: 'ROOM',
        ruleCode: 'MINIMIZE_BUILDING_CHANGES',
        name: 'Minimize Building & Room Changes',
        description: 'Keep consecutive classes for a cohort in the same physical building',
        targetScope: 'GLOBAL',
        priority: 'MEDIUM',
        weight: 70,
        isEnabled: true
      });
      explanations.push('Minimize inter-building transit for student cohorts — Medium priority');
    }

    if (text.includes('room utilization') || text.includes('room efficiency') || text.includes('maximize rooms')) {
      rules.push({
        id: generateId(),
        category: 'ROOM',
        ruleCode: 'MAX_ROOM_UTILIZATION',
        name: 'Maximize Room Occupancy Efficiency',
        description: 'Fill classrooms and auditoriums closest to their total capacity',
        targetScope: 'GLOBAL',
        priority: 'MEDIUM',
        weight: 65,
        isEnabled: true
      });
      explanations.push('Maximize room utilization efficiency — Medium priority');
    }

    // Fallback: If no specific keywords triggered, construct balanced rules
    if (rules.length === 0) {
      rules.push({
        id: generateId(),
        category: 'STUDENT',
        ruleCode: 'MINIMIZE_GAPS',
        name: 'Minimize Student Schedule Gaps',
        description: 'Keep daily student lectures and labs contiguous with minimum idle waiting hours',
        targetScope: 'GLOBAL',
        priority: 'HIGH',
        weight: 80,
        isEnabled: true
      });
      rules.push({
        id: generateId(),
        category: 'TEACHER',
        ruleCode: 'MAX_CONSECUTIVE_CLASSES',
        name: 'Teacher Max 3 Consecutive Classes',
        description: 'Ensure faculty members do not exceed 3 consecutive teaching periods',
        targetScope: 'GLOBAL',
        priority: 'HIGH',
        weight: 80,
        parameterValue: { maxConsecutive: 3 },
        isEnabled: true
      });
      rules.push({
        id: generateId(),
        category: 'STUDENT',
        ruleCode: 'PREFER_AFTERNOON_LABS',
        name: 'Prefer Afternoon Practical Labs',
        description: 'Schedule multi-hour practical laboratory sessions during afternoon periods',
        targetScope: 'GLOBAL',
        priority: 'MEDIUM',
        weight: 70,
        isEnabled: true
      });
      explanations.push('Balanced schedule with minimal student gaps and max 3 continuous faculty lectures');
    }

    return {
      originalPrompt: prompt,
      summary: explanations.join('\n• '),
      interpretedRules: rules,
      confidence: 0.95
    };
  }
}
