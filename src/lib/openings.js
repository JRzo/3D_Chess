// Opening name database keyed by SAN move sequence prefix (comma-joined)
// Lookup: join history SANs with commas, find longest matching prefix.

const OPENINGS = {
  // ── Single-move openings ────────────────────────────────────────────
  'e4':      "King's Pawn",
  'd4':      "Queen's Pawn",
  'c4':      "English Opening",
  'Nf3':     "Réti Opening",
  'b3':      "Nimzo-Larsen Attack",
  'f4':      "Bird's Opening",
  'g3':      "King's Fianchetto",
  'b4':      "Sokolsky Opening",
  'd3':      "King's Indian Attack",

  // ── e4 responses ────────────────────────────────────────────────────
  'e4,e5':       "Open Game",
  'e4,c5':       "Sicilian Defense",
  'e4,e6':       "French Defense",
  'e4,c6':       "Caro-Kann Defense",
  'e4,d6':       "Pirc Defense",
  'e4,Nf6':      "Alekhine's Defense",
  'e4,d5':       "Scandinavian Defense",
  'e4,g6':       "Modern Defense",
  'e4,Nc6':      "Nimzowitsch Defense",
  'e4,b6':       "Owen's Defense",

  // ── Open game (e4 e5) continuations ─────────────────────────────────
  'e4,e5,Nf3':        "King's Knight Opening",
  'e4,e5,Nc3':        "Vienna Game",
  'e4,e5,Bc4':        "Bishop's Opening",
  'e4,e5,f4':         "King's Gambit",
  'e4,e5,d4':         "Center Game",
  'e4,e5,Nf3,Nc6':    "Open Game",
  'e4,e5,Nf3,Nf6':    "Petrov's Defense",
  'e4,e5,Nf3,d6':     "Philidor Defense",
  'e4,e5,Nf3,f5':     "Latvian Gambit",
  'e4,e5,f4,exf4':    "King's Gambit Accepted",
  'e4,e5,f4,d5':      "Falkbeer Counter-Gambit",
  'e4,e5,Nc3,Nc6':    "Vienna Game",
  'e4,e5,Nc3,Nf6':    "Vienna Game, Frankenstein-Dracula",

  // ── Ruy Lopez (Spanish) ──────────────────────────────────────────────
  'e4,e5,Nf3,Nc6,Bb5':                     "Ruy López (Spanish)",
  'e4,e5,Nf3,Nc6,Bb5,a6':                  "Ruy López, Morphy Defense",
  'e4,e5,Nf3,Nc6,Bb5,Nf6':                 "Ruy López, Berlin Defense",
  'e4,e5,Nf3,Nc6,Bb5,d6':                  "Ruy López, Steinitz Defense",
  'e4,e5,Nf3,Nc6,Bb5,a6,Ba4,Nf6,O-O,Be7': "Ruy López, Closed",

  // ── Italian Game ─────────────────────────────────────────────────────
  'e4,e5,Nf3,Nc6,Bc4':        "Italian Game",
  'e4,e5,Nf3,Nc6,Bc4,Bc5':    "Giuoco Piano",
  'e4,e5,Nf3,Nc6,Bc4,Nf6':    "Two Knights Defense",
  'e4,e5,Nf3,Nc6,Bc4,Bc5,c3': "Giuoco Pianissimo",

  // ── Scotch Game ───────────────────────────────────────────────────────
  'e4,e5,Nf3,Nc6,d4':           "Scotch Game",
  'e4,e5,Nf3,Nc6,d4,exd4':      "Scotch Game",
  'e4,e5,Nf3,Nc6,d4,exd4,Nxd4': "Scotch Game",

  // ── Sicilian variations ──────────────────────────────────────────────
  'e4,c5,Nf3':          "Sicilian Defense",
  'e4,c5,Nf3,d6':       "Sicilian, Najdorf Setup",
  'e4,c5,Nf3,Nc6':      "Sicilian, Classical",
  'e4,c5,Nf3,e6':       "Sicilian, Kan / Paulsen",
  'e4,c5,Nf3,g6':       "Sicilian, Dragon Setup",
  'e4,c5,c3':           "Sicilian, Alapin",
  'e4,c5,d4':           "Sicilian, Smith-Morra Gambit",
  'e4,c5,Nc3':          "Sicilian, Closed",
  'e4,c5,f4':           "Sicilian, Grand Prix Attack",
  'e4,c5,Nf3,d6,d4':    "Sicilian, Open Variation",
  'e4,c5,Nf3,d6,d4,cxd4,Nxd4,Nf6,Nc3,a6': "Sicilian, Najdorf",
  'e4,c5,Nf3,d6,d4,cxd4,Nxd4,Nf6,Nc3,g6': "Sicilian, Dragon",

  // ── French Defense ───────────────────────────────────────────────────
  'e4,e6,d4':           "French Defense",
  'e4,e6,d4,d5':        "French Defense",
  'e4,e6,d4,d5,e5':     "French, Advance",
  'e4,e6,d4,d5,exd5':   "French, Exchange",
  'e4,e6,d4,d5,Nc3':    "French, Classical / Winawer",
  'e4,e6,d4,d5,Nd2':    "French, Tarrasch",
  'e4,e6,d4,d5,Nc3,Bb4': "French, Winawer",
  'e4,e6,d4,d5,Nc3,Nf6': "French, Classical",

  // ── Caro-Kann ─────────────────────────────────────────────────────────
  'e4,c6,d4':           "Caro-Kann Defense",
  'e4,c6,d4,d5':        "Caro-Kann Defense",
  'e4,c6,d4,d5,e5':     "Caro-Kann, Advance",
  'e4,c6,d4,d5,exd5':   "Caro-Kann, Exchange",
  'e4,c6,d4,d5,Nc3':    "Caro-Kann, Classical",
  'e4,c6,d4,d5,Nd2':    "Caro-Kann, Karpov",

  // ── d4 responses ─────────────────────────────────────────────────────
  'd4,d5':      "Closed Game",
  'd4,Nf6':     "Indian Defense",
  'd4,f5':      "Dutch Defense",
  'd4,d6':      "Old Indian Setup",
  'd4,e6':      "Queen's Pawn Game",
  'd4,g6':      "Modern Defense",
  'd4,c5':      "Old Benoni",

  // ── Queen's Gambit ────────────────────────────────────────────────────
  'd4,d5,c4':           "Queen's Gambit",
  'd4,d5,c4,e6':        "Queen's Gambit Declined",
  'd4,d5,c4,dxc4':      "Queen's Gambit Accepted",
  'd4,d5,c4,c6':        "Slav Defense",
  'd4,d5,c4,c6,Nf3,Nf6': "Slav Defense",
  'd4,d5,c4,Nf6':       "Queen's Gambit, Anti-Nimzo",
  'd4,d5,Nf3':          "London System Setup",
  'd4,d5,Bf4':          "London System",
  'd4,d5,c4,e6,Nc3,Nf6,Bg5': "Queen's Gambit Declined, Main Line",
  'd4,d5,c4,e6,Nf3,Nf6,Nc3,Be7': "Queen's Gambit Declined, Orthodox",

  // ── Indian Defenses ───────────────────────────────────────────────────
  'd4,Nf6,c4':            "Indian System",
  'd4,Nf6,c4,g6':         "King's Indian Setup",
  'd4,Nf6,c4,e6':         "Queen's Indian / Nimzo-Indian Setup",
  'd4,Nf6,c4,c5':         "Benoni Defense",
  'd4,Nf6,c4,b6':         "Queen's Indian Defense",
  'd4,Nf6,Nf3':           "Indian Game, Réti",
  'd4,Nf6,c4,g6,Nc3,Bg7': "King's Indian Defense",
  'd4,Nf6,c4,e6,Nc3,Bb4': "Nimzo-Indian Defense",
  'd4,Nf6,c4,e6,Nf3,b6':  "Queen's Indian Defense",
  'd4,Nf6,c4,g6,Nc3,Bg7,e4,d6': "King's Indian, Main Line",
  'd4,Nf6,c4,g6,Nc3,Bg7,e4,d6,Nf3,O-O': "King's Indian, Classical",
  'd4,Nf6,c4,c5,d5':      "Benoni, Modern",

  // ── English Opening ───────────────────────────────────────────────────
  'c4,e5':       "English Opening, King's English",
  'c4,c5':       "English Opening, Symmetrical",
  'c4,Nf6':      "English Opening, Anglo-Indian",
  'c4,e6':       "English Opening, Anglo-Indian",
  'c4,e5,Nc3':   "English, Reversed Sicilian",
  'c4,c5,Nf3':   "English, Symmetrical",

  // ── Réti Opening ──────────────────────────────────────────────────────
  'Nf3,d5':      "Réti Opening",
  'Nf3,Nf6':     "Indian Game / Réti",
  'Nf3,d5,c4':   "Réti, Main Line",
  'Nf3,d5,g3':   "King's Fianchetto Opening",

  // ── London System ─────────────────────────────────────────────────────
  'd4,d5,Nf3,Nf6,Bf4': "London System",
  'd4,Nf6,Nf3,d5,Bf4': "London System",
};

/**
 * Given an array of move SANs, return the best matching opening name.
 * Checks progressively shorter prefixes until a match is found.
 */
export function detectOpening(sans) {
  for (let len = sans.length; len > 0; len--) {
    const key = sans.slice(0, len).join(',');
    if (OPENINGS[key]) return OPENINGS[key];
  }
  return null;
}
