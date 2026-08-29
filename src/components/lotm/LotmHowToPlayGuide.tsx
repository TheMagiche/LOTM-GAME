import React, { useMemo, useState } from 'react';
import {
    BookOpen,
    Compass,
    Dices,
    Flame,
    HelpCircle,
    Info,
    MapPin,
    Package,
    Radio,
    Search,
    ShieldAlert,
    Zap,
} from 'lucide-react';

export type GuideCategory = 'all' | 'loop' | 'dice' | 'loot' | 'arcs' | 'events' | 'tools';

interface GuideSection {
    id: string;
    title: string;
    category: Exclude<GuideCategory, 'all'>;
    categoryLabel: string;
    icon: React.ReactNode;
    subtitle: string;
    uiLocation: string;
    summary: string;
    steps: Array<{ title: string; desc: string }>;
    loreNote?: string;
    proTip?: string;
    warning?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
    {
        id: 'core-loop-acting',
        title: 'Core Turn Loop & The Acting Method',
        category: 'loop',
        categoryLabel: 'Core Game Loop',
        icon: <Flame size={18} className="text-amber-400" />,
        subtitle: 'Roleplay principles, potion digestion, and advancing sequences',
        uiLocation: 'Main Chat Composer + Player Grimoire (Potion & Pathway)',
        summary: 'Lord of the Mysteries is a narrative roleplaying experience driven by an AI Game Master (GM). As a Beyonder, your survival depends on adhering to the Acting Method to safely digest mystical potions and prevent horrific mental collapse.',
        steps: [
            {
                title: '1. Narrative Roleplaying & Prompting',
                desc: 'Type your actions, dialogue, thoughts, and spell invocations into the bottom chat composer. The GM evaluates your actions against your personality traits, known Sequence abilities, and active inventory.',
            },
            {
                title: '2. Potion Digestion (0% to 100%)',
                desc: 'Every potion contains residual remnant wills and madness. By strictly acting according to the name and fundamental principles of your Sequence (e.g., a "Seer" divines and interprets fate; a "Clown" controls emotions behind laughter), you digest the potion and eliminate madness risks.',
            },
            {
                title: '3. Loss of Control (LOC) Monitoring',
                desc: 'Violating acting principles, overdrawing spirituality, or witnessing eldritch horrors increases your Loss of Control rating (Stage 1 to Stage 4). At high LOC stages, you suffer illusions, body deformities, or irreversible monster transformation.',
            },
            {
                title: '4. Sequence Advancement',
                desc: 'Once your digestion meter hits 100%, open the Player Grimoire -> Potion & Pathway tab. Verify your required main ingredients and advancement ritual, then click "Drink Next Sequence Potion" to unlock higher Sequence powers.',
            },
        ],
        loreNote: 'Remember the first iron law of mysticism: "You are only acting; you are not truly the title you bear."',
        proTip: 'Check the Acting Notes in the Player Grimoire for hints on how to roleplay your current Sequence.',
        warning: 'Drinking a potion before complete digestion significantly increases the chance of immediate mutation or death.',
    },
    {
        id: 'dice-spiritual-actions',
        title: 'Spiritual Actions & Dice System (Dice Me)',
        category: 'dice',
        categoryLabel: 'Dice & Divination',
        icon: <Dices size={18} className="text-amber-400" />,
        subtitle: 'Arming rolls, testing domains, and sequence advantage',
        uiLocation: 'Chat Action Strip ("Dice Me") & Player HUD (Pathway Emblem / Identity)',
        summary: 'When your character attempts risky maneuvers, casts high-tier spells, performs divination, or clashes with enemy Beyonders, the Spiritual Action modal arms a calibrated d20 roll injected into the next GM turn.',
        steps: [
            {
                title: '1. Select an Action Domain',
                desc: 'Choose the nature of your attempt: Beyonder Power (channeling Sequence authority), Divination (pendulum, dream revelation, astromancy), Spirit Vision (inspecting auras/ethereal bodies), Ritual Magic (altar sacrifice, deity prayers), or Physical/Mundane (revolver marksmanship, stealth, brawling).',
            },
            {
                title: '2. Sequence Advantage & Disadvantage',
                desc: 'The engine automatically compares your Sequence against all on-stage opponents. Facing lower-sequence Beyonders grants Advantage (roll twice, pick highest); facing higher-sequence demigods inflicts Disadvantage.',
            },
            {
                title: '3. Spirituality Cost & Management',
                desc: 'Channeling powerful Beyonder abilities consumes Spirituality (-1 SPI). If your spirituality runs dry, spells will backfire and divination returns foggy or misleading omens.',
            },
            {
                title: '4. Outcome Resolution Bands',
                desc: 'The d20 outcome is calculated by the engine and woven into narrative fact: Catastrophe (1-2), Failure (3-9), Mixed Success / Partial (10-14), Full Success (15-19), or Critical Triumph (20).',
            },
        ],
        loreNote: 'Divination is not all-powerful. Entities of higher sequence, concealed domains, or corrupted artifacts can actively falsify your visions.',
        proTip: 'Use Spirit Vision before combat to gauge an opponent’s emotional state, health condition, and sequence strength.',
        warning: 'Repeatedly casting spells at 0 Spirituality directly accelerates Loss of Control.',
    },
    {
        id: 'loot-mystical-harvest',
        title: 'Mystical Harvest & Loot Drops (Roll Loot)',
        category: 'loot',
        categoryLabel: 'Loot & Artefacts',
        icon: <Package size={18} className="text-amber-400" />,
        subtitle: 'Extracting characteristics, sealed artefacts, and the Law of Convergence',
        uiLocation: 'Chat Action Strip ("Roll Loot" / "Harvest")',
        summary: 'Defeating monstrous aberrations, assassinating rival Beyonders, or raiding ancient ruins yields mystical loot. Arming a drop causes the deterministic loot engine to pull authentic items directly into your inventory.',
        steps: [
            {
                title: '1. Arming the Harvest',
                desc: 'Click "Roll Loot" on the action strip before sending a message describing how you search or dissect the target. Select the quantity (1-9 rolls) and filter eligible categories (Characteristics, Sealed Artefacts, Formulas, Charms, Currency).',
            },
            {
                title: '2. Law of Beyonder Characteristics Convergence',
                desc: 'Extraordinary characteristics cannot be destroyed. Carrying high-grade items or characteristics of your neighboring pathways will subtly attract related Beyonders, rival cults, and wandering spirits to your location.',
            },
            {
                title: '3. Sealed Artefacts & Negative Flaws',
                desc: 'Every Sealed Artefact (Grade 3 ordinary to Grade 0 divine) possesses powerful boons paired with dangerous side effects. Check your Player Grimoire -> Inventory tab to read negative flaw warnings and containment requirements.',
            },
            {
                title: '4. Automatic Inventory Merging',
                desc: 'Harvested items, potion formulas, and Loen currency (Pounds, Soli, Pence) are automatically parsed and added into your character ledger for immediate use or trade.',
            },
        ],
        loreNote: 'Beyonder characteristics of the same pathway always attract one another. The higher the sequence, the stronger the irresistible gravitational pull.',
        proTip: 'Equip weapons and charms in the Player Grimoire Inventory to make them easily referenced in combat.',
        warning: 'Failing to isolate Sealed Artefacts in spirit-shielded lead cases may trigger environmental corruption.',
    },
    {
        id: 'inject-arc-engine',
        title: 'Background World Arcs (Inject Arc)',
        category: 'arcs',
        categoryLabel: 'World Pressures',
        icon: <Radio size={18} className="text-amber-400" />,
        subtitle: 'Autonomous story threads simmering in the background',
        uiLocation: 'Play menu ("Inject Arc" / System 2 Oracle)',
        summary: 'The Arc Engine spawns dynamic, multi-stage background pressures anchored to open chapter plotlines, NPC motives, and recent events. Unlike scripted quests, arcs develop independently on the world clock.',
        steps: [
            {
                title: '1. Spawning an Arc',
                desc: 'Click "Inject Arc" in the Play menu. The engine analyzes recent chapter developments and synthesizes an escalating laddered storyline that simmers in the world.',
            },
            {
                title: '2. Escalating Rungs',
                desc: 'Arcs mature through stages: Ambient (subtle newspaper headlines, ambient signs) -> Rumor (tavern gossip, indirect economic impacts) -> Direct (active confrontation, ambush, or faction clashes).',
            },
            {
                title: '3. Stance Detection',
                desc: 'As you play, the engine scans your actions and classifies your stance toward active arcs: Oppose, Aid, Flee, or Ignore. Your posture modifies the difficulty and trajectory of how the crisis unfolds.',
            },
            {
                title: '4. World Consequence',
                desc: 'Unresolved boiling arcs eventually culminate in major world events—such as citywide smog crises, cultist uprisings, or church inquisitions—permanently shifting the campaign ledger.',
            },
        ],
        loreNote: 'The world of Lord of the Mysteries does not revolve around one person. Deities scheme and secret organizations mobilize regardless of whether you intervene.',
        proTip: 'Read the Chronicle tab in your Player Grimoire to see registered world state changes and active NPC relationships.',
    },
    {
        id: 'inject-event-oneshot',
        title: 'One-Shot Scene Directives (Inject Event)',
        category: 'events',
        categoryLabel: 'One-Shot Events',
        icon: <Zap size={18} className="text-violet-400" />,
        subtitle: 'Immediate scene shockwaves and narrative twists',
        uiLocation: 'Chat Action Strip ("Inject Event" / "Event")',
        summary: 'When you want an instant plot twist or encounter in the current scene, the One-Shot Injector commands the GM to trigger a sudden complication on the very next response.',
        steps: [
            {
                title: '1. Choose an Event Archetype',
                desc: 'Open "Inject Event" and select your desired scene complication: Ambush & Combat, Mystical Anomaly, Social / Political Crisis, Sudden Clue, or Environmental Hazard.',
            },
            {
                title: '2. Arm the Directive',
                desc: 'Click "Arm Event". The button illuminates in vibrant violet, indicating the directive is primed.',
            },
            {
                title: '3. Single-Turn Execution',
                desc: 'Send your message. The directive forces the GM to weave the sudden event into the scene, then immediately disarms itself so subsequent turns flow normally.',
            },
            {
                title: '4. Disarming',
                desc: 'If you change your mind before sending, simply click the armed button again and select "Disarm".',
            },
        ],
        loreNote: 'The spirit world is volatile; an unexpected convergence or spirit entity can breach physical reality in an instant.',
        proTip: 'Use "Sudden Clue" when investigating a cold case or mystery to prompt the GM for hidden occult leads.',
    },
    {
        id: 'director-tools-travel',
        title: 'Director Tools, World Map & Travel',
        category: 'tools',
        categoryLabel: 'Director & Tools',
        icon: <Compass size={18} className="text-amber-400" />,
        subtitle: 'Ask GM, travel across the Five Seas, and location shift',
        uiLocation: 'Top Play Header ("Ask GM", "Grimoire") & Player Grimoire ("Location & Travel")',
        summary: 'Take advantage of built-in out-of-character tools and fast-travel mechanics to explore the Northern and Southern Continents with full historical fidelity.',
        steps: [
            {
                title: '1. Ask GM (Out-of-Character Assistant)',
                desc: 'Need clarification on Victorian Loen currency, pathway sequences, or past campaign events? Open "Ask GM" from the top play header. It answers out-of-character without advancing in-game time or narrative state.',
            },
            {
                title: '2. Location Shifting & Travel',
                desc: 'Open the Player Grimoire -> Location & Travel tab. Search for destinations (e.g. Backlund, Tingen, Bayam, Trier) and click "Shift Location" to fast-travel your party.',
            },
            {
                title: '3. Interactive World Map',
                desc: 'Explore the full cartographic layout of the world directly inside the Location tab, discovering regional churches, local Beyonder threats, and broad geography.',
            },
            {
                title: '4. Character Record & Bonds',
                desc: 'Inspect your complete read-only Game Master dossier in the Player Grimoire -> Character Record tab, tracking psychological traits, wants, boundaries, and NPC bonds.',
            },
        ],
        loreNote: 'Traveling across the Fog Sea or the Sunken Continent requires steam locomotives, passenger liners, or mystical Spirit World traversal.',
        proTip: 'Use the World Lore Grimoire from the Title Hub to study the Epochs, Orthodox Churches, and Pathway sequence trees before embarking.',
    },
];

const CATEGORIES: Array<{ id: GuideCategory; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Topics', icon: <BookOpen size={13} /> },
    { id: 'loop', label: 'Core Turn Loop', icon: <Flame size={13} /> },
    { id: 'dice', label: 'Spiritual Dice', icon: <Dices size={13} /> },
    { id: 'loot', label: 'Mystical Loot', icon: <Package size={13} /> },
    { id: 'arcs', label: 'World Arcs', icon: <Radio size={13} /> },
    { id: 'events', label: 'One-Shot Events', icon: <Zap size={13} /> },
    { id: 'tools', label: 'Director Tools', icon: <Compass size={13} /> },
];

export function LotmHowToPlayGuide() {
    const [selectedCategory, setSelectedCategory] = useState<GuideCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filteredSections = useMemo(() => {
        return GUIDE_SECTIONS.filter(section => {
            const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
            if (!matchesCategory) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                section.title.toLowerCase().includes(q) ||
                section.subtitle.toLowerCase().includes(q) ||
                section.summary.toLowerCase().includes(q) ||
                section.categoryLabel.toLowerCase().includes(q) ||
                section.steps.some(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
            );
        });
    }, [selectedCategory, searchQuery]);

    return (
        <div className="space-y-6 max-w-4xl pb-10">
            {/* Header / Banner */}
            <div className="bg-[#141018] border border-[#c9a227]/40 p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full border border-[#c9a227]/40 bg-black/60 flex items-center justify-center text-[#c9a227] shadow-inner shadow-black/80 shrink-0">
                        <HelpCircle size={28} />
                    </div>
                    <div>
                        <p className="font-['Cinzel'] text-[10px] tracking-[0.24em] uppercase text-[#c9a227]">
                            Field Handbook & Survival Guide
                        </p>
                        <h3 className="font-['EB_Garamond'] text-2xl font-bold text-[#f3ead8]">
                            How to Play Lord of the Mysteries
                        </h3>
                        <p className="text-xs text-[#d0c4b0] mt-0.5">
                            Master the Acting Method, spiritual divination, mystical harvesting, and world events.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Guide Categories">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            role="tab"
                            aria-selected={selectedCategory === cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-['Cinzel'] uppercase tracking-wider transition-all cursor-pointer ${
                                selectedCategory === cat.id
                                    ? 'bg-[#c9a227]/20 border border-[#c9a227] text-[#e0c36a] shadow-sm shadow-amber-950/40'
                                    : 'bg-black/40 border border-[#c9a227]/20 text-[#a89b88] hover:text-[#e8e0d0] hover:border-[#c9a227]/40'
                            }`}
                        >
                            {cat.icon}
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Search Box */}
                <div className="relative min-w-48 sm:w-64">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a89b88]" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search guide topics..."
                        className="w-full bg-black/60 border border-[#c9a227]/30 focus:border-[#c9a227] text-xs text-[#f3ead8] placeholder-[#7d705f] pl-8 pr-3 py-1.5 rounded outline-none"
                    />
                </div>
            </div>

            {/* Guide List */}
            {filteredSections.length === 0 ? (
                <div className="p-8 text-center bg-black/30 border border-[#c9a227]/15 rounded">
                    <p className="text-sm font-['EB_Garamond'] text-[#a89b88] italic">
                        No guide topics found matching &quot;{searchQuery}&quot;.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSections.map(section => {
                        const isExpanded = expandedId === section.id;
                        return (
                            <div
                                key={section.id}
                                className={`border rounded-sm transition-all overflow-hidden bg-[#110d15]/80 ${
                                    isExpanded
                                        ? 'border-[#c9a227]/60 shadow-lg shadow-black/60'
                                        : 'border-[#c9a227]/25 hover:border-[#c9a227]/45'
                                }`}
                            >
                                {/* Card Header / Toggle */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setExpandedId(isExpanded ? null : section.id)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setExpandedId(isExpanded ? null : section.id);
                                        }
                                    }}
                                    className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-[#1a1422]/60 select-none"
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className="p-2 rounded border border-[#c9a227]/30 bg-black/50 shrink-0 mt-0.5">
                                            {section.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-['EB_Garamond'] text-lg font-bold text-[#f3ead8]">
                                                    {section.title}
                                                </h4>
                                                <span className="px-2 py-0.5 text-[9px] font-['Cinzel'] uppercase tracking-widest rounded bg-[#c9a227]/15 border border-[#c9a227]/30 text-[#e0c36a]">
                                                    {section.categoryLabel}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#b8ab97] mt-0.5">
                                                {section.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#c9a227]/70 hidden sm:inline">
                                            {isExpanded ? 'Collapse' : 'Expand'}
                                        </span>
                                        <span className={`text-[#c9a227] transition-transform duration-200 text-sm ${isExpanded ? 'rotate-180' : ''}`}>
                                            ▼
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Content Body */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-2 border-t border-[#c9a227]/15 space-y-4">
                                        {/* UI Location Pill */}
                                        <div className="flex items-center gap-2 text-xs bg-black/40 border border-[#c9a227]/20 px-3 py-1.5 rounded text-[#e0c36a]">
                                            <MapPin size={13} className="shrink-0 text-amber-400" />
                                            <span className="font-['Cinzel'] uppercase text-[9px] tracking-wider text-[#a89b88]">
                                                Where to find:
                                            </span>
                                            <span className="font-medium text-[#f3ead8]">
                                                {section.uiLocation}
                                            </span>
                                        </div>

                                        {/* Summary */}
                                        <p className="font-['EB_Garamond'] text-base text-[#e8e0d0] leading-relaxed">
                                            {section.summary}
                                        </p>

                                        {/* Step-by-Step Instructions */}
                                        <div className="space-y-2.5">
                                            <h5 className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] font-bold">
                                                How It Works & Procedures
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {section.steps.map((step, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 bg-black/45 border border-[#c9a227]/15 rounded flex flex-col justify-start"
                                                    >
                                                        <p className="font-['Cinzel'] text-xs font-semibold text-[#e0c36a] mb-1">
                                                            {step.title}
                                                        </p>
                                                        <p className="text-xs text-[#cfc4b2] leading-relaxed">
                                                            {step.desc}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Lore & Practical Callouts */}
                                        <div className="space-y-2 pt-1">
                                            {section.loreNote && (
                                                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded flex items-start gap-2.5 text-xs text-amber-200">
                                                    <BookOpen size={15} className="shrink-0 mt-0.5 text-amber-400" />
                                                    <div>
                                                        <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-amber-400 font-bold block mb-0.5">
                                                            Mysticism Axiom
                                                        </span>
                                                        <span className="italic font-['EB_Garamond'] text-sm text-[#f1e6d4]">
                                                            {section.loreNote}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {section.proTip && (
                                                <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded flex items-start gap-2.5 text-xs text-blue-200">
                                                    <Info size={15} className="shrink-0 mt-0.5 text-blue-400" />
                                                    <div>
                                                        <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-blue-400 font-bold block mb-0.5">
                                                            Tactical Advice
                                                        </span>
                                                        <span className="text-[#d8e6f5]">
                                                            {section.proTip}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {section.warning && (
                                                <div className="p-3 bg-red-950/25 border border-red-500/35 rounded flex items-start gap-2.5 text-xs text-red-200">
                                                    <ShieldAlert size={15} className="shrink-0 mt-0.5 text-red-400" />
                                                    <div>
                                                        <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-red-400 font-bold block mb-0.5">
                                                            Danger / Backlash Hazard
                                                        </span>
                                                        <span className="text-[#f7d6d6]">
                                                            {section.warning}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
