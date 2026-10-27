import styles from './Status.module.css';

type AgentState = 'idle' | 'active' | 'retry' | 'done';

interface FixedAgent {
    key: string;
    name: string;
    role: string;
    activeLabel: (s: string) => string;
    doneLabel: string;
    activeAt: number;
    doneAfter: number;
}

const TOP_AGENTS: FixedAgent[] = [
    {
        key: 'watchman',
        name: 'Watchman',
        role: 'Pre-flight',
        activeLabel: () => 'Verifying APIs & FFmpeg...',
        doneLabel: 'Environment OK',
        activeAt: 1,
        doneAfter: 1,
    },
    {
        key: 'director',
        name: 'Director',
        role: 'Scripting',
        activeLabel: () => 'Writing script & visual bible...',
        doneLabel: 'Script ready',
        activeAt: 2,
        doneAfter: 2,
    },
];

const BOTTOM_AGENTS: FixedAgent[] = [
    {
        key: 'auditor',
        name: 'Auditor',
        role: 'Validating',
        activeLabel: (s) => s === 'agent_auditor_retry' ? 'Retrying failed output...' : 'Validating outputs...',
        doneLabel: 'Outputs valid',
        activeAt: 4,
        doneAfter: 4,
    },
    {
        key: 'editor',
        name: 'Editor',
        role: 'Stitching',
        activeLabel: (s) => s === 'agent_uploading' ? 'Uploading to R2...' : 'Stitching with FFmpeg...',
        doneLabel: 'Video ready',
        activeAt: 5,
        doneAfter: 5,
    },
];

const STATUS_ORDER: Record<string, number> = {
    queued: 0, processing: 0,
    agent_watchman_active: 1,
    agent_director_writing: 2,
    agent_auditor_checking: 4,
    agent_auditor_retry: 4,
    agent_stitching: 5,
    agent_uploading: 5,
    done: 6,
};

function getStatusOrder(status: string): number {
    if (status.startsWith('agent_director_slides_')) return 3;
    if (status.startsWith('agent_artist_slide')) return 3; // covers both singular and batch
    return STATUS_ORDER[status] ?? 0;
}

// Parse active slide numbers from status string.
// Singular:  agent_artist_slide_5      → Set{5}
// Batch:     agent_artist_slides_4,5,6 → Set{4,5,6}
export function parseActiveSlides(status: string): Set<number> {
    if (status.startsWith('agent_artist_slides_')) {
        const nums = status.slice('agent_artist_slides_'.length).split(',').map(Number).filter(n => n > 0);
        return new Set(nums);
    }
    if (status.startsWith('agent_artist_slide_')) {
        const n = parseInt(status.slice('agent_artist_slide_'.length), 10);
        return n > 0 ? new Set([n]) : new Set();
    }
    return new Set();
}

function getFixedAgentState(agent: FixedAgent, statusOrder: number, status: string): AgentState {
    if (statusOrder > agent.doneAfter) return 'done';
    if (statusOrder === agent.activeAt) {
        if (agent.key === 'auditor' && status === 'agent_auditor_retry') return 'retry';
        return 'active';
    }
    return 'idle';
}

interface AgentGraphProps {
    status: string;
    totalSlides: number;
    maxSlidesSeen: number;
    contextRefs: Record<number, number[]>;
}

// Renders the Watchman/Director → per-slide Continuity Artist → Auditor/Editor pipeline graph
// on the processing screen. Pure/derived from the current job status string — no state of its own.
export function AgentGraph({ status: currentStatus, totalSlides, maxSlidesSeen, contextRefs }: AgentGraphProps) {
    const statusOrder = getStatusOrder(currentStatus);

    const activeSlides = parseActiveSlides(currentStatus);
    const batchMin = activeSlides.size > 0 ? Math.min(...activeSlides) : 0;

    // displaySlides: use totalSlides if known, else maxSlidesSeen — never goes back to 0
    const displaySlides = totalSlides > 0 ? totalSlides : maxSlidesSeen;

    const inArtistPhase = statusOrder === 3;
    const pastArtistPhase = statusOrder > 3;

    // which slides are being "consulted" by all currently active slides
    const consultingSet = new Set<number>();
    if (inArtistPhase && activeSlides.size > 0) {
        activeSlides.forEach(slideNum => {
            (contextRefs[slideNum - 1] || []).forEach(ref => consultingSet.add(ref));
        });
    }

    return (
        <div className={styles.agentGraph}>

            {/* Top fixed agents */}
            {TOP_AGENTS.map((agent, i) => {
                const state = getFixedAgentState(agent, statusOrder, currentStatus);
                const label = state === 'done' ? agent.doneLabel
                    : state === 'active' ? agent.activeLabel(currentStatus)
                    : agent.role;
                return (
                    <div key={agent.key} className={styles.agentGraphRow}>
                        <div className={`${styles.agentNode} ${styles[`agentNode_${state}`]}`}>
                            <div className={styles.agentNodeIndicator} />
                            <div className={styles.agentNodeName}>{agent.name}</div>
                            <div className={styles.agentNodeLabel}>{label}</div>
                        </div>
                        {i < TOP_AGENTS.length - 1 && (
                            <div className={`${styles.agentEdge} ${state === 'done' || statusOrder > agent.activeAt ? styles.agentEdgeActive : ''}`} />
                        )}
                        {i === TOP_AGENTS.length - 1 && (
                            <div className={`${styles.agentEdge} ${statusOrder > 2 ? styles.agentEdgeActive : ''}`} />
                        )}
                    </div>
                );
            })}

            {/* Per-slide agent nodes */}
            {displaySlides > 0 && (
                <div className={styles.slideAgentSection}>
                    <div className={styles.slideAgentGrid}>
                        {Array.from({ length: displaySlides }, (_, i) => {
                            const slideNum = i + 1;
                            let slideState: AgentState = 'idle';
                            if (pastArtistPhase) {
                                slideState = 'done';
                            } else if (inArtistPhase) {
                                if (batchMin > 0 && slideNum < batchMin) slideState = 'done';
                                else if (activeSlides.has(slideNum)) slideState = 'active';
                            }

                            const isConsulting = !pastArtistPhase && consultingSet.has(i);

                            // Build label
                            let label = 'Waiting';
                            if (isConsulting) label = 'Consulted';
                            else if (slideState === 'active') label = 'Painting...';
                            else if (slideState === 'done') label = 'Done';

                            return (
                                <div key={slideNum} className={styles.slideAgentRow}>
                                    <div className={[
                                        styles.agentNode,
                                        styles.slideAgentNode,
                                        styles[`agentNode_${slideState}`],
                                        isConsulting ? styles.agentNode_consulting : ''
                                    ].filter(Boolean).join(' ')}>
                                        <div className={styles.agentNodeIndicator} />
                                        <div className={styles.slideAgentNum}>S{slideNum}</div>
                                        <div className={styles.agentNodeLabel}>{label}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Show context legend if any consulting is happening */}
                    {consultingSet.size > 0 && activeSlides.size > 0 && (
                        <p className={styles.contextHint}>
                            Slide{activeSlides.size > 1 ? 's' : ''} {[...activeSlides].sort((a,b)=>a-b).join(', ')} requesting context from slide{consultingSet.size > 1 ? 's' : ''} {[...consultingSet].map(n => n + 1).join(', ')}
                        </p>
                    )}
                    <div className={`${styles.agentEdge} ${pastArtistPhase || (inArtistPhase && activeSlides.size > 0 && Math.max(...activeSlides) === displaySlides) ? styles.agentEdgeActive : ''}`} />
                </div>
            )}

            {/* Fallback edge if slides not yet revealed */}
            {displaySlides === 0 && statusOrder > 2 && (
                <div className={`${styles.agentEdge} ${styles.agentEdgeActive}`} />
            )}

            {/* Bottom fixed agents */}
            {BOTTOM_AGENTS.map((agent, i) => {
                const state = getFixedAgentState(agent, statusOrder, currentStatus);
                const label = state === 'done' ? agent.doneLabel
                    : state === 'active' || state === 'retry' ? agent.activeLabel(currentStatus)
                    : agent.role;
                return (
                    <div key={agent.key} className={styles.agentGraphRow}>
                        <div className={`${styles.agentNode} ${styles[`agentNode_${state}`]}`}>
                            <div className={styles.agentNodeIndicator} />
                            <div className={styles.agentNodeName}>{agent.name}</div>
                            <div className={styles.agentNodeLabel}>{label}</div>
                        </div>
                        {i < BOTTOM_AGENTS.length - 1 && (
                            <div className={`${styles.agentEdge} ${state === 'done' || statusOrder > agent.activeAt ? styles.agentEdgeActive : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
