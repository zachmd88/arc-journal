import { Round, Session, WeekCard } from "./firestore-utils";
import { Timestamp } from "firebase/firestore";

export interface RuleInputs {
    historyRounds: Round[];
    historySessions: Session[];
}

export interface RuleOutput {
    priorityCue: string;
    priorityCommand: string;
    driverDrill: string;
    approachDrill: string;
    onCourseRule: string;
    whyReasoning: string;
}

// Single Plane Specific Faults & Fixes (Todd Graves / Moe Norman inspired)
// NotebookLM Sourced Rules (Single Plane Coach)
const SINGLE_PLANE_RULES = {
    slice: {
        cue: "Check 'The Claw' Grip",
        command: "Ensure Trail Hand is Under (Non-Rotational)",
        drill: "Trail Hand Only Swings"
    },
    hook: {
        cue: "Neutralize the Face",
        command: "Check Max Range of Motion / Don't Over-Rotate",
        drill: "Neutralize the Face Drill (Extend & Square)"
    },
    contactFat: {
        cue: "Rotate, Don't Stall",
        command: "Keep Lead Knee Flexed & Turn Chest through Impact",
        drill: "Shorten and Rotate (Waist-high to Finish)"
    },
    contactThin: {
        cue: "Stay in Your Bends",
        command: "Keep Trail Foot Down past Impact",
        drill: "Trail Foot Down Drill"
    }
};

export function generateWeekPlan(inputs: RuleInputs): RuleOutput {
    const { historyRounds } = inputs;

    // 1. FILTER: Last 30 Days (Already done by query, but good to be safe)
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentRounds = historyRounds.filter(r => new Date(r.date) >= thirtyDaysAgo);

    if (recentRounds.length === 0) {
        return {
            priorityCue: "Baseline Establishment",
            priorityCommand: "Log 3 rounds to generate a targeted plan.",
            driverDrill: "Tempo 3:1",
            approachDrill: "Contact Ladder",
            onCourseRule: "Play for data, not score.",
            whyReasoning: "No recent data found. We need a baseline to identify your current patterns."
        };
    }

    // 2. WEIGHTING: Recent (7 days) = 1.5x, Older = 1.0x
    let weightedPenalties = 0;
    let weightedScore = 0;
    let totalWeight = 0;

    // Pattern Counters (Weighted)
    const patterns = {
        slice: 0, // R/R or R/N
        hook: 0,  // L/L or L/R
        fat: 0,
        thin: 0,
        approachMissL: 0,
        approachMissR: 0,
        approachMissS: 0
    };

    recentRounds.forEach(round => {
        const roundDate = new Date(round.date);
        const daysAgo = (now.getTime() - roundDate.getTime()) / (1000 * 3600 * 24);
        const weight = daysAgo <= 7 ? 1.5 : 1.0;

        totalWeight += weight;
        weightedPenalties += (round.penaltiesCount * weight);
        weightedScore += ((round.score || 72) * weight);

        // Analyze Tee Misses
        if (round.teeMissStart === 'R' || round.teeMissCurve === 'R') patterns.slice += weight;
        if (round.teeMissStart === 'L' || round.teeMissCurve === 'L') patterns.hook += weight;

        // Analyze Approach (Deprecated, safeguarded for legacy data)
        if (round.approach60_150?.contact === 'fat') patterns.fat += weight;
        if (round.approach60_150?.contact === 'thin') patterns.thin += weight;
        if (round.approach60_150?.missSide === 'L') patterns.approachMissL += weight;
        if (round.approach60_150?.missSide === 'R') patterns.approachMissR += weight;
        if (round.approach60_150?.missSide === 'S') patterns.approachMissS += weight;
    });

    // 3. DECISION LOGIC
    let selectedRule = null;
    let reasoning = "";

    // Priority 1: Penalty Reduction (if avg penalties > 1.5)
    // Determine dominant penalty cause (Slice vs Hook)
    const avgPenalties = weightedPenalties / totalWeight;

    if (avgPenalties > 1.0) {
        if (patterns.slice > patterns.hook) {
            selectedRule = SINGLE_PLANE_RULES.slice;
            reasoning = `High penalty rate (${avgPenalties.toFixed(1)}/rd) driven by Slice patterns in ${recentRounds.length} recent rounds.`;
        } else {
            selectedRule = SINGLE_PLANE_RULES.hook;
            reasoning = `High penalty rate (${avgPenalties.toFixed(1)}/rd) driven by Hook/Pull patterns in ${recentRounds.length} recent rounds.`;
        }
    } else {
        // Priority 2: Contact Quality
        if (patterns.fat > patterns.thin && patterns.fat > 1) {
            selectedRule = SINGLE_PLANE_RULES.contactFat;
            reasoning = "Penalties are under control, but Fat contact is the recurring miss.";
        } else if (patterns.thin > patterns.fat && patterns.thin > 1) {
            selectedRule = SINGLE_PLANE_RULES.contactThin;
            reasoning = "Penalties are under control, but Thin contact is the recurring miss.";
        } else {
            // Default / Maintenance
            selectedRule = {
                cue: "Tempo & Balance",
                command: "Finish in Balance",
                drill: "Feet Together Drill"
            };
            reasoning = "Solid recent play. Focus on maintenance and tempo.";
        }
    }

    return {
        priorityCue: selectedRule.cue,
        priorityCommand: selectedRule.command,
        driverDrill: selectedRule.drill,
        approachDrill: patterns.fat > patterns.thin ? "Divot Board" : "Towel Drill",
        onCourseRule: avgPenalties > 2 ? "Club down off tee" : "Attack pins",
        whyReasoning: reasoning
    };
}

export function createWeekCardFromHistory(
    historyRounds: Round[],
    historySessions: Session[],
    ownerUid: string,
    weekStart: string,
    weekEnd: string
): WeekCard {

    const inputs: RuleInputs = {
        historyRounds,
        historySessions
    };

    const rules = generateWeekPlan(inputs);

    // Calculate generic stats for snapshot
    const lastRound = historyRounds[0]; // Assumed sorted desc

    return {
        ownerUid,
        weekStart,
        weekEnd,
        priorityCue: rules.priorityCue,
        priorityCommand: rules.priorityCommand,
        planChecklist: [
            `Driver Focus: ${rules.driverDrill}`,
            `Iron Focus: ${rules.approachDrill}`,
            "Short Game: 3-foot ladder (15 mins)",
            `Course Strategy: ${rules.onCourseRule}`,
            "Review Session"
        ],
        metricsSnapshot: {
            lastRoundPenalties: lastRound ? lastRound.penaltiesCount : 0,
            gir60_150: lastRound ? (lastRound.approach60_150?.greensHit || 0) : 0
        },
        generatedSummary: rules.whyReasoning, // This now holds the "Why"
        createdAt: Timestamp.now()
    };
}
