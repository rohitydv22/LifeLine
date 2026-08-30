"""
LifeLine AI Ops - Dataset Generator
Generates realistic hostel & campus infrastructure incident reports across 8 categories
and 3 risk levels (low, medium, high).
"""

import os
import random
import pandas as pd
from sklearn.model_selection import train_test_split

os.makedirs("ml/data", exist_ok=True)

CATEGORIES = [
    "electrical",
    "plumbing",
    "network",
    "fire_safety",
    "structural",
    "sanitation",
    "security",
    "other"
]

RISK_LEVELS = ["low", "medium", "high"]

LOCATIONS = [
    "Hostel A Room 102", "Hostel A Floor 2 Washroom", "Hostel A Ground Floor Lobby", "Hostel A Dining Hall",
    "Hostel B Room 214", "Hostel B Corridor 3rd Floor", "Hostel B Main Electrical Room", "Hostel B Balcony",
    "Hostel C Room 305", "Hostel C Wing West Common Area", "Hostel C Basement Study Room", "Hostel C Staircase",
    "Hostel D Room 412", "Hostel D Server Rack Room", "Hostel D Cafeteria", "Hostel D Terrace Access",
    "Academic Block 1 Room 101", "Library 2nd Floor Reading Hall", "Main Auditorium Hall B", "Gymnasium Locker Room",
    "Hostel E Room 501", "Hostel E Water Tank Area", "Hostel F Room 118", "Central Canteen Kitchen Area"
]

TEMPLATES = {
    "electrical": {
        "low": [
            "study lamp switch is a bit loose and sometimes requires multiple clicks to turn on",
            "ceiling tube light flickers intermittently when switched on in the evening",
            "wall plug in room works but looks slightly worn out, please inspect when free",
            "study table socket cover plate is loose, need maintenance check",
            "light switch in corridor is stiff to press",
            "desk light bulb has gone dim over the last few days",
            "minor flicker in hallway lighting during evening hours",
            "room switchboard has a slightly loose switch for the fan",
            "exhaust fan switch in bathroom is stiff and makes a slight click sound",
            "reading light bulb needs replacement in the study room",
            "power outlet feels a little loose when plugging in laptop charger",
            "fluorescent tube in bathroom takes a few seconds to light up"
        ],
        "medium": [
            "room circuit tripped twice while running iron and laptop, power cutoff in our room",
            "frequent voltage fluctuations noticed across floor 2, appliances turning off",
            "sparking sound heard when inserting 3-pin laptop adapter into wall socket",
            "power socket feels warm to the touch after using for an hour",
            "exhaust fan in floor bathroom stopped working completely, burning smell noticed initially",
            "fan regulator is overheating and burning odor coming from switchboard",
            "corridor lights went dark due to tripped MCB on floor 3",
            "two sockets in room 214 have completely stopped providing power",
            "intermittent power cut in entire wing while other wings have electricity",
            "wire casing near the switchboard appears loose and cracked"
        ],
        "high": [
            "sparks and black smoke coming from main switchboard in corridor, urgent",
            "exposed live wire hanging near wet washroom entrance, serious shock hazard",
            "student got electrical shock from metallic water cooler body on floor 2",
            "active electrical fire in junction box near room 305, burning plastic smell and flames",
            "heavy smoke and crackling sparks coming from distribution panel in wing B",
            "live wire snapped and touching metallic railing on staircase",
            "main circuit breaker exploded with loud bang and continuous sparks",
            "smoke billowing from electrical duct on third floor, emergency isolation needed",
            "water leaking directly onto open electrical switchboard, sparking vigorously",
            "severe electrical burn smell and active sparks from air conditioner unit"
        ]
    },
    "plumbing": {
        "low": [
            "tap slowly dripping in bathroom sink, bucket placed underneath",
            "shower head has slightly low water pressure in room washroom",
            "washbasin drain is draining slowly after brushing teeth",
            "faucet aerator in pantry has slight leak around the joint",
            "bathroom sink tap handle is a bit tight to turn off completely",
            "slow drip from flush tank valve into the commode",
            "water tap in washroom leaks a few drops every minute",
            "sink drain strainer missing causing slow water flow",
            "mild condensation on cold water pipe beneath the washbasin",
            "faucet in 3rd floor bathroom needs washer replacement due to slight leak"
        ],
        "medium": [
            "drain pipe clogged and water backing up into bathroom stall",
            "no running water on entire 2nd floor since morning, tanks appear empty",
            "water pipe under sink leaking steady stream, water pooling on floor",
            "toilet flush mechanism broken and overflowing into drainage pan",
            "hot water geyser not heating and leaking water from bottom connection",
            "washroom drain blocked with accumulated debris causing ankle-deep puddle",
            "pipe joint cracked in common washroom, water spraying onto wall",
            "foul smelling dirty water coming out from tap in hostel wing",
            "water supply completely cut off to floor 4 bathrooms for 6 hours",
            "continuous leak from rooftop overhead tank overflow pipe flooding balcony"
        ],
        "high": [
            "burst main water pipe flooding corridor and seeping into student rooms",
            "massive water flood on 3rd floor reaching electrical sockets and elevators",
            "ceiling collapsing due to heavy water accumulation from overhead pipe rupture",
            "strong LPG gas smell accompanied by water leakage in mess kitchen area, immediate danger",
            "sewage pipe burst with toxic foul water overflowing across hostel hallway",
            "uncontrolled high pressure water gushing from main riser pipe, rooms submerged",
            "flooding in basement electrical substation from burst storm drain pipe",
            "water entering room through light fixtures from flooded floor above",
            "main supply line cracked wide open, stairs transformed into water cascade",
            "severe structural flooding threatening server room on ground floor"
        ]
    },
    "network": {
        "low": [
            "wifi speed is slower than usual in the corner of room 214",
            "intermittent ping spikes while playing online educational tutorials",
            "ethernet port in room has a loose latch but connection works",
            "guest wifi login portal page takes long time to load",
            "wifi signal drops to 2 bars near balcony area",
            "campus intranet portal loading slowly on mobile devices",
            "periodic minor disconnects during late night hours",
            "printer on floor network is occasionally unreachable",
            "DNS lookup seems slightly delayed on hostel subnet",
            "speed test shows 5 Mbps instead of usual 50 Mbps in our room"
        ],
        "medium": [
            "wifi access point on 2nd floor completely dead, no SSID broadcasting",
            "entire wing unable to connect to campus wifi, obtaining IP address error",
            "network switch in floor corridor making loud clicking noise and offline",
            "ethernet wall jacks across 5 rooms on floor 3 not receiving link light",
            "hostel router rebooting constantly every 10 minutes disrupting classes",
            "no internet connection in entire block B while other blocks are fine",
            "DHCP server not assigning IP addresses to students on hostel network",
            "access point blinking red light and rejecting all authentication attempts",
            "core floor switch unresponsive, student exams affected",
            "local area network down for all rooms on the west corridor"
        ],
        "high": [
            "campus-wide network and core firewall crash during online placement exams",
            "primary fiber optic uplink cable severed during construction outside hostel",
            "data center core switch overheating and shutdown, all emergency lines down",
            "catastrophic network outage across entire institution, security systems offline",
            "ransomware or malicious attack suspected, all gateway routers failing simultaneously",
            "server room network rack caught fire with melted switch cables",
            "complete blackout of all communication channels, internet and VoIP down campus-wide",
            "network core failure disabling campus biometric security gates and CCTV stream",
            "all core routers offline, mission critical services and monitoring halted",
            "main fiber backbone disconnected, total campus disconnection from internet"
        ]
    },
    "fire_safety": {
        "low": [
            "fire extinguisher inspection tag in hallway expired last month",
            "plastic cover on emergency break-glass box is cracked",
            "emergency exit sign light bulb on floor 1 appears dim",
            "fire safety instruction poster in corridor is torn and needs replacement",
            "smoke detector green indicator LED is not blinking in room 104",
            "dust accumulated on corridor smoke sensor casing",
            "hose reel cabinet door latch is stiff to open",
            "routine inspection needed for fire extinguisher pressure gauge in lobby",
            "emergency evacuation map near lift lobby is faded",
            "fire bucket sand level is low in ground floor station"
        ],
        "medium": [
            "fire alarm panel beeping continuously with yellow fault warning light",
            "fire extinguisher missing from its designated wall bracket on floor 3",
            "emergency exit staircase blocked by discarded furniture and old mattresses",
            "smoke detector in corridor sounding false alarms intermittently",
            "fire hose pipe nozzle cracked and leaking during weekly pressure test",
            "emergency exit door jammed shut and cannot be pushed open from inside",
            "corridor fire alarm strobe light not activating during system test",
            "strong burning paper or wood smell in courtyard with smoke source unknown",
            "fire exit route obstructed by heavy storage boxes",
            "hydrant valve leaking water into the emergency staircase landing"
        ],
        "high": [
            "active fire detected in 2nd floor pantry, flames spreading to wooden cabinets",
            "thick black smoke filling hostel 3rd floor corridor, alarms blaring, evacuation needed",
            "strong gas leak detected near mess kitchen cylinder bank, hissing sound and heavy smell",
            "flames visible from waste disposal chute on ground floor, spreading fast",
            "smoke alarm activated, smoke pouring out from closed room 412, occupants trapped",
            "explosion sound followed by fire in chemical storage room near lab",
            "emergency fire exit completely blocked while fire is spreading in staircase",
            "fire sprinkler pipe ruptured but no water flowing while flames grow in lounge",
            "major electrical fire spreading along cable tray across residential floor",
            "active building fire with heavy smoke, emergency evacuation underway"
        ]
    },
    "structural": {
        "low": [
            "small hairline crack on bedroom plaster near the window sill",
            "wardrobe door hinge is squeaking and slightly misaligned",
            "window latch in room 204 is stiff and needs oiling",
            "minor paint peeling on bathroom ceiling due to steam",
            "floor tile in corner of room has slight chip on corner",
            "balcony door handle is slightly loose when turning",
            "wooden study desk drawer sticks when opening",
            "skirting board along corridor wall is coming loose",
            "room door needs a stopper installed to prevent banging",
            "small chip in stair tread edge on ground floor landing"
        ],
        "medium": [
            "deep diagonal crack appearing along corridor wall growing over last 2 weeks",
            "balcony safety railing is loose and wobbles when pushed, dangerous for students",
            "large chunks of plaster fell from ceiling onto study table while room was empty",
            "main corridor entrance glass door cracked and rattling in high wind",
            "staircase concrete step cracked in half and unstable under foot traffic",
            "heavy water seepage causing wall to bulge and paint to peel severely",
            "corridor window frame loosened from concrete wall structure",
            "bathroom door frame rotten at base and detaching from wall",
            "sunshade slab outside 2nd floor window showing visible cracks and sag",
            "false ceiling panel sagging downward in common study room"
        ],
        "high": [
            "large section of concrete ceiling collapsed into room 214, debris on bed",
            "major structural pillar in basement shows wide cracks and exposed rebar buckling",
            "staircase railing completely detached and fallen, open drop from 4th floor",
            "entire balcony slab vibrating and tilting downward, imminent collapse risk",
            "building foundation wall cracked with noticeable tilt in hostel wing B",
            "roof concrete slab cracking open with pieces falling into top floor rooms",
            "retaining wall behind hostel collapsed following heavy rainfall, soil entering",
            "severe structural compromise, beam cracking loudly above dining hall",
            "corridor floor slab sagging and separating from main wall joint",
            "external facade wall collapse crushing walkway below, immediate evacuation required"
        ]
    },
    "sanitation": {
        "low": [
            "dustbin in common corridor is full and needs daily emptying",
            "water cooler drip tray needs cleaning and sanitizing",
            "minor bad odor from washroom floor drain, needs disinfectant",
            "cobwebs gathered in corner of ceiling in hallway",
            "housekeeping missed morning sweeping in wing C corridor",
            "stray leaves accumulated outside hostel entrance doorway",
            "soap dispenser empty in common washroom",
            "mirror in bathroom has water stains and needs wiping",
            "dust accumulated on common room window ledges",
            "recycling bin overflowing with empty cardboard boxes"
        ],
        "medium": [
            "sewage smell rising from multiple bathroom drains on 2nd floor",
            "garbage pile uncollected for 4 days outside hostel block attracting flies",
            "cockroach and pest infestation noticed in pantry cabinets and floor washroom",
            "black mold spreading rapidly along damp bathroom walls and ceiling",
            "waste disposal bin broken and spilling contaminated waste into corridor",
            "blocked urinal overflowing dirty water onto restroom floor",
            "stagnant water pool near water purifier breeding mosquitoes",
            "severe rodent problem in ground floor storage room chewing cables",
            "kitchen waste disposal clogged, attracting stray animals near entrance",
            "sanitation duct overflowing with gray water into rear courtyard"
        ],
        "high": [
            "main sewage line ruptured inside hostel corridor, raw sewage flooding rooms",
            "severe biological hazard with toxic sewage backing up into all ground floor washrooms",
            "dead animal decomposing in central water supply storage tank, water contaminated",
            "massive black toxic mold infestation causing breathing difficulties for entire wing",
            "hazardous medical or chemical waste dumped illegally behind residential block",
            "fecal matter and sewage overflow flooding hallway and entering student living areas",
            "severe contamination of drinking water system with sewage infiltration",
            "uncontrolled pest and pathogen outbreak in dining hall kitchen, critical health risk",
            "toxic sewer gas backup filling residential wing, multiple students feeling nauseous",
            "burst main septic chamber overflowing across hostel perimeter"
        ]
    },
    "security": {
        "low": [
            "room door key is slightly sticky in the lock cylinder",
            "visitor sign-in book at security desk is full and needs replacement",
            "security mirror at staircase corner is slightly tilted",
            "door peephole on room door is scratched and foggy",
            "bicycle rack outside hostel has one loose bolt on stand",
            "intercom phone to main guard gate has slight static noise",
            "id card scanner at turnstile takes 2 attempts to read card",
            "corridor security camera dome cover is dusty",
            "gate latch on secondary perimeter fence is loose",
            "locker padlock key feels slightly worn out"
        ],
        "medium": [
            "room door lock mechanism broken, door cannot be securely locked from outside",
            "security CCTV camera on 2nd floor corridor is offline with black screen",
            "unauthorized trespasser seen wandering hostel corridors without visitor badge",
            "electronic biometric access door stuck in open position allowing anyone entry",
            "theft reported from unattended room on floor 3, laptop and wallet stolen",
            "ground floor window security grill loose and screws removed",
            "perimeter fence wire cut behind hostel sports ground",
            "night security guard post abandoned during late shift hours",
            "multiple room padlocks tampered with during semester break",
            "emergency security phone box on campus pathway broken and unresponsive"
        ],
        "high": [
            "armed intruder or violent trespasser reported inside hostel block, lockdown needed",
            "active break-in in progress, unauthorized person forcing doors on 3rd floor",
            "student assaulted in hostel staircase, immediate security and medical dispatch required",
            "hostel perimeter gate breached by hostile mob or unauthorized group",
            "violent altercation with weapons reported in common room, students in danger",
            "kidnapping or severe security threat reported on campus grounds",
            "hostel main entry doors breached, intruder threatening occupants",
            "panic alarm triggered in residential wing, active intruder alert",
            "critical security breach: master key stolen and unauthorized access to student rooms",
            "shots or explosive sounds heard near perimeter fence, lockdown initiated"
        ]
    },
    "other": {
        "low": [
            "lost student ID card found in library and placed at reception",
            "notice board glass in lobby has finger smudges",
            "clock in study room is running 15 minutes slow",
            "lost water bottle left behind in common room lounge",
            "campus bus schedule poster is outdated and needs update",
            "room curtain rod bracket is slightly bent",
            "whiteboard marker dried out in discussion room",
            "bookshelf in common area needs reorganizing",
            "lost jacket hanging on corridor coat rack",
            "suggestion box key misplaced by hostel committee"
        ],
        "medium": [
            "stray dog entered hostel corridor and growling at students passing by",
            "severe noise disruption from unauthorized party in room late at night",
            "elevator getting stuck between floors 2 and 3 intermittently",
            "refrigerator in common kitchen not cooling, student food spoiling",
            "broken glass bottles scattered across basketball court walkway",
            "honeybee or wasp nest building up under 3rd floor window ledge",
            "gym equipment cable frayed and snapping during use",
            "loud screeching noise from ventilation shaft disrupting sleep",
            "washing machine in laundry room vibrating violently and leaking soapy water",
            "student trapped inside study room due to jammed door knob"
        ],
        "high": [
            "student medical emergency: unconscious student having seizure in room 305, ambulance needed",
            "passenger elevator cable snapped and safety brake engaged, 4 students trapped inside in darkness",
            "deadly venomous snake sighted inside student room under bed, urgent wildlife rescue",
            "severe chemical spill in corridor causing eye irritation and breathing distress",
            "gas cylinder valve leaking rapidly with loud hissing in cafeteria kitchen",
            "roof water tank collapsed through ceiling into top floor rooms, students trapped",
            "severe allergic reaction / anaphylaxis emergency in dining hall",
            "major structural ceiling collapse and fire emergency in main hall",
            "critical medical crisis: student injured with heavy bleeding, urgent first aid needed",
            "toxic fume release from basement laboratory drifting into student dorms"
        ]
    }
}

MODIFIERS = [
    "Please send someone to check as soon as possible.",
    "Reported this earlier today.",
    "Happening since last night.",
    "Affecting multiple students.",
    "Needs urgent inspection.",
    "Very concerning situation.",
    "Please resolve this quickly.",
    "Noticeable smell and noise.",
    "Students are worried about safety.",
    "Kindly update ticket status once inspected."
]


def generate_dataset(num_samples=2400):
    rows = []
    current_id = 1001

    samples_per_combo = num_samples // (len(CATEGORIES) * len(RISK_LEVELS))

    for cat in CATEGORIES:
        for risk in RISK_LEVELS:
            base_templates = TEMPLATES[cat][risk]
            for _ in range(samples_per_combo):
                base_text = random.choice(base_templates)
                # Randomly combine with modifier
                if random.random() < 0.45:
                    modifier = random.choice(MODIFIERS)
                    desc = f"{base_text}. {modifier}"
                else:
                    desc = base_text

                # Random capitalization / slight variation
                if random.random() < 0.15:
                    desc = desc.capitalize()

                location = random.choice(LOCATIONS)
                rows.append({
                    "id": current_id,
                    "category": cat,
                    "description": desc,
                    "location": location,
                    "riskLevel": risk
                })
                current_id += 1

    # Shuffle rows
    random.seed(42)
    random.shuffle(rows)

    df = pd.DataFrame(rows)
    return df


if __name__ == "__main__":
    print("Generating LifeLine dataset...")
    df = generate_dataset(num_samples=2400)
    
    # Save full dataset
    train_df, test_df = train_test_split(df, test_size=0.20, random_state=42, stratify=df[["category", "riskLevel"]])
    
    df.to_csv("ml/data/reports.csv", index=False)
    test_df.to_csv("ml/data/reports_test.csv", index=False)
    
    print(f"Generated {len(df)} total reports saved to ml/data/reports.csv")
    print(f"Saved {len(test_df)} test reports to ml/data/reports_test.csv")
    print("\nClass distribution:")
    print(df["riskLevel"].value_counts())
    print("\nCategory distribution:")
    print(df["category"].value_counts())
